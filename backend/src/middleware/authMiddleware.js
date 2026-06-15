import jwt from 'jsonwebtoken';
import User from '../models_sql/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

export const teacherOnly = (req, res, next) => {
  if (req.user?.role !== 'teacher' && req.user?.role !== 'faculty') {
    return res.status(403).json({ message: 'Teacher access only' });
  }
  next();
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};

export const facultyOnly = teacherOnly;