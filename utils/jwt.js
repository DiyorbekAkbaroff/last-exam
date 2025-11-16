const jwt = require('jsonwebtoken');
const { promisify } = require('util');

// Convert callback-based jwt functions to promise-based
const signToken = promisify(jwt.sign);
const verifyToken = promisify(jwt.verify);

/**
 * Generate JWT access token
 * @param {string} userId - User ID to include in the token
 * @returns {Promise<string>} JWT token
 */
const generateToken = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return await signToken(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

/**
 * Generate JWT refresh token
 * @param {string} userId - User ID to include in the token
 * @returns {Promise<string>} JWT refresh token
 */
const generateRefreshToken = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
    }

    return await signToken(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {boolean} isRefresh - Whether the token is a refresh token
 * @returns {Promise<Object>} Decoded token payload
 */
const verifyJwtToken = async (token, isRefresh = false) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }

    const secret = isRefresh 
      ? process.env.JWT_REFRESH_SECRET 
      : process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT secret is not configured');
    }

    const decoded = await verifyToken(token, secret);
    return { success: true, data: decoded };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return { 
        success: false, 
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      };
    }
    
    return { 
      success: false, 
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    };
  }
};

module.exports = { 
  generateToken, 
  generateRefreshToken, 
  verifyJwtToken 
};

