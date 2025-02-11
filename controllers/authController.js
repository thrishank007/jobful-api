const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const {sendResetEmail} = require("../utils/email");
const signale = require("signale");

const log = signale.scope("auth:controller");

const signAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  });
};

const signRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

exports.register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password, fullName, dob, phoneNumber, interests } = req.body;
    const existingUser = await User.findOne({ email });
    // Check if user with the same email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Check if user with the same phone number already exists
    const existingUserByPhoneNumber = await User.findOne({ phoneNumber });
    if (existingUserByPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "User with this phone number already exists",
      });
    }

    const newUser = await User.create({
      email,
      password,
      fullName,
      dob,
      phoneNumber,
      interests,
    });
    const accessToken = signAccessToken(newUser._id);
    const refreshToken = signRefreshToken(newUser._id);

    newUser.refreshToken = refreshToken;
    await newUser.save();

    res.header("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
        dob: newUser.dob,
        phoneNumber: newUser.phoneNumber,
        interests: newUser.interests,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.header("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        dob: user.dob,
        phoneNumber: user.phoneNumber,
        interests: user.interests,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  const refreshToken = req.headers.refreshToken;

  if (!refreshToken) {
    return res
      .status(401)
      .json({ success: false, message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const accessToken = signAccessToken(user._id);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid refresh token" });
  }
};

exports.forgotPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const resetCode = user.generatePasswordResetCode();
    await user.save({ validateBeforeSave: false });

    try {
      const resp = await sendResetEmail(email, resetCode);
      res.status(200).json(resp);
    } catch (error) {
      log.error("Error sending email:", error);
      user.passwordResetCode = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        message: "There was an error sending the email. Try again later!",
      });
    }
  } catch (error) {
    next(error);
  }
};

// helper func to validate the code 
verifyPasswordResetCode = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, code } = req.body;
    const user = await User.findOne({
      email,
      passwordResetCode: code,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
      return false;
    }
    return true;
  } catch (error) {
    console.log(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, code, newPassword, passwordConfirm } = req.body;
    const user = await User.findOne({
      email,
      passwordResetCode: code,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user || !verifyPasswordResetCode(email,code)) {
      return res.status(400).json({
        success: false,
        message: "Verification code is invalid or has expired",
      });
    }

    if (newPassword !== passwordConfirm) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    user.password = newPassword;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.header("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        dob: user.dob,
        phoneNumber: user.phoneNumber,
        interests: user.interests,
      },
    });
  } catch (error) {
    next(error);
  }
};
