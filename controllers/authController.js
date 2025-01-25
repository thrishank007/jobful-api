const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');

const signAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN
  });
};

const signRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
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
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const newUser = await User.create({ email, password, fullName, dob, phoneNumber, interests });
    const accessToken = signAccessToken(newUser._id);
    const refreshToken = signRefreshToken(newUser._id);

    newUser.refreshToken = refreshToken;
    await newUser.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
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
        interests: newUser.interests
      }
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
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
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
        interests: user.interests
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const accessToken = signAccessToken(user._id);

    res.status(200).json({
      success: true,
      accessToken
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};