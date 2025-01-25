const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

// Registration
router.post('/register', [
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('fullName').isLength({ min: 3 }).withMessage('Full name must be at least 3 characters long'),
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

module.exports = router;