const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const { 
  generateToken, 
  generateRefreshToken 
} = require('../utils/jwt');

const sendError = (res, code, message, errorCode = null, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errorCode && { code: errorCode }),
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && errors && { debug: errors })
  };
  
  return res.status(code).json(response);
};

// Input validation middleware
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .custom(async (value) => {
      const user = await User.findOne({ email: value });
      if (user) {
        throw new Error('Email already in use');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

router.post('/register', validateRegister, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
  }

  try {
    const { name, email, password } = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      status: 'active'
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Omit sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.__v;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    sendError(res, 500, 'Error registering user', 'REGISTRATION_ERROR', error.message);
  }
});

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

router.post('/login', validateLogin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if account is active
    if (user.status !== 'active') {
      return sendError(res, 403, 'Account is not active', 'ACCOUNT_INACTIVE');
    }

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Omit sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.__v;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token: accessToken,
        refreshToken
      }
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return sendError(res, 400, 'Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
      }

      // Generate new tokens
      const newAccessToken = generateToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      return sendError(
        res, 
        401, 
        error.name === 'TokenExpiredError' ? 'Refresh token has expired' : 'Invalid refresh token',
        'INVALID_REFRESH_TOKEN'
      );
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    sendError(res, 500, 'Error refreshing token', 'TOKEN_REFRESH_ERROR', error.message);
  }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return sendError(res, 400, 'Email and password are required');

    const user = await User.findOne({ email, role: 'admin' });
    if (!user) return sendError(res, 401, 'Invalid credentials');

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return sendError(res, 401, 'Invalid credentials');

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      message: 'Admin login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

module.exports = router;