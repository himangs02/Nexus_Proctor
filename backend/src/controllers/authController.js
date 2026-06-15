import User from '../models_sql/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '4h' });
};

export const registerUser = async (req, res) => {
  const { name, studentId, email, password, role } = req.body;

  try {
    // Sanitize inputs
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedStudentId = studentId?.trim();

    // Validate inputs
    if (!trimmedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    // Check if email already exists
    const emailExists = await User.findOne({
      where: { email: trimmedEmail }
    });

    if (emailExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered. Please use a different email or login.' 
      });
    }

    // Check if studentId already exists (only for students with non-empty studentId)
    if (trimmedStudentId && (role === 'student' || !role)) {
      const studentIdExists = await User.findOne({
        where: { studentId: trimmedStudentId }
      });

      if (studentIdExists) {
        return res.status(400).json({ 
          success: false, 
          message: 'Student ID already registered. Please use a different Student ID.' 
        });
      }
    }

    const userData = {
      name,
      email: trimmedEmail,
      password, // Sequelize hook will hash this
      role: role || 'student',
      isActive: true,
      passwordResetRequired: false
    };

    if (userData.role === 'teacher' || userData.role === 'faculty') {
      userData.facultyId = `FAC-${Date.now()}`;
    } else if (trimmedStudentId) {
      // Only set studentId if it's not empty
      userData.studentId = trimmedStudentId;
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password, id } = req.body;
  
  // Trim and normalize the login identifier
  const loginIdentifier = email ? email.trim().toLowerCase() : (id ? id.trim() : null);

  try {
    if (!loginIdentifier || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email/ID and password are required' 
      });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: loginIdentifier },
          { studentId: loginIdentifier },
          { facultyId: loginIdentifier }
        ]
      }
    });

    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is disabled. Please contact admin.' });

    if (await user.matchPassword(password)) {
      // Update last login
      await user.update({
        lastLogin: new Date()
      });

      res.json({
        success: true,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        facultyId: user.facultyId,
        passwordResetRequired: user.passwordResetRequired,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (currentPassword && !(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }

    // Update password (hook will hash it)
    await user.update({
      password: newPassword,
      passwordResetRequired: false
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
