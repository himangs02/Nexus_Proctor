import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await prisma.users.findUnique({
        where: { id: BigInt(decoded.id) },
        select: {
          id: true, name: true, student_id: true, faculty_id: true,
          email: true, role: true, department: true, is_active: true,
          last_login: true, password_reset_required: true,
          created_at: true, updated_at: true,
        },
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Serialize BigInt fields to Number for downstream JSON compatibility
      req.user = {
        ...user,
        id: Number(user.id),
      };

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