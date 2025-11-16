const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found or deleted' });
    }

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({ 
      message: 'Invalid or expired token',
      error: error.message 
    });
  }
};

const adminAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    return res.status(403).json({ message: "Admin access required" });
  }
};

module.exports = { auth, adminAuth };
