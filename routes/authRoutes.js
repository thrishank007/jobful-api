const express = require('express');
const { body,query } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

// Registration
router.post('/register', [
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('fullName').isLength({ min: 4 }).withMessage('Full name must be at least 3 characters long'),
  body('dob').isISO8601().withMessage('Date of birth must be a valid ISO 8601 date'),
  body('phoneNumber').isMobilePhone().withMessage('Phone number must be a valid mobile phone number'),
  body('interests').optional().isArray().withMessage('Interests must be an array')
], authController.register);

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], authController.login);

// Refresh Token
router.post('/refresh-token', authController.refreshToken);

// Forgot Password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please enter a valid email address')
], authController.forgotPassword);

// Reset Password
router.patch('/reset-password', [
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('code').isNumeric().isLength({ min: 6, max: 6 }).withMessage('Verification code must be a 6-digit number'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  body('passwordConfirm').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], authController.resetPassword);

// getUserProfile
router.get('/profile', [
  query('userId'),
], authController.getUserProfile);

// UpdateUserProfileInfo
router.patch('/updateProfile', [
  query('userId'),
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('fullName').isLength({ min: 4 }).withMessage('Full name must be at least 3 characters long'),
  body('dob').isISO8601().withMessage('Date of birth must be a valid ISO 8601 date'),
  body('phoneNumber').isMobilePhone().withMessage('Phone number must be a valid mobile phone number'),
  body('interests').optional().isArray().withMessage('Interests must be an array')
], authController.updateUserProfile);

module.exports = router;