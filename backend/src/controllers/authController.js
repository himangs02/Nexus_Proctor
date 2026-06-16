import User from '../models_sql/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '4h' });
};

export const registerUser = async (req, res) => {
  const { name, studentId, email, password, role } = req.body;
  console.log(`[AUTH] POST /signup | origin=${req.get('origin')} | email=${email} | role=${role || 'student'}`);

  try {
    // Sanitize inputs
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedStudentId = studentId?.trim();

    // Validate inputs
    if (!trimmedEmail) {
      console.warn('[AUTH] Registration rejected: email missing');
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!password) {
      console.warn('[AUTH] Registration rejected: password missing');
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    // Check if email already exists
    console.log(`[AUTH] Checking duplicate email: ${trimmedEmail}`);
    const emailExists = await User.findOne({
      where: { email: trimmedEmail }
    });

    if (emailExists) {
      console.warn(`[AUTH] Registration rejected: duplicate email ${trimmedEmail}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered. Please use a different email or login.' 
      });
    }

    // Check if studentId already exists (only for students with non-empty studentId)
    if (trimmedStudentId && (role === 'student' || !role)) {
      console.log(`[AUTH] Checking duplicate studentId: ${trimmedStudentId}`);
      const studentIdExists = await User.findOne({
        where: { studentId: trimmedStudentId }
      });

      if (studentIdExists) {
        console.warn(`[AUTH] Registration rejected: duplicate studentId ${trimmedStudentId}`);
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

    console.log(`[AUTH] Creating user: email=${trimmedEmail} role=${userData.role}`);
    const user = await User.create(userData);
    console.log(`[AUTH] ✅ User created successfully: id=${user.id} email=${user.email}`);

    res.status(201).json({
      success: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error('[AUTH] ❌ Registration DB error:', error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password, id } = req.body;
  
  // Trim and normalize the login identifier
  const loginIdentifier = email ? email.trim().toLowerCase() : (id ? id.trim() : null);
  console.log(`[AUTH] POST /login | origin=${req.get('origin')} | identifier=${loginIdentifier}`);

  try {
    if (!loginIdentifier || !password) {
      console.warn('[AUTH] Login rejected: missing identifier or password');
      return res.status(400).json({ 
        success: false, 
        message: 'Email/ID and password are required' 
      });
    }

    console.log(`[AUTH] Querying user by: ${loginIdentifier}`);
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: loginIdentifier },
          { studentId: loginIdentifier },
          { facultyId: loginIdentifier }
        ]
      }
    });

    if (!user) {
      console.warn(`[AUTH] Login failed: no user found for ${loginIdentifier}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      console.warn(`[AUTH] Login failed: account disabled for ${loginIdentifier}`);
      return res.status(403).json({ success: false, message: 'Account is disabled. Please contact admin.' });
    }

    const passwordMatch = await user.matchPassword(password);
    if (passwordMatch) {
      // Update last login
      await user.update({ lastLogin: new Date() });
      console.log(`[AUTH] ✅ Login successful: id=${user.id} role=${user.role}`);

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
      console.warn(`[AUTH] Login failed: wrong password for ${loginIdentifier}`);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('[AUTH] ❌ Login DB error:', error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  console.log(`[AUTH] PUT /change-password | userId=${req.user?.id}`);
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (currentPassword && !(await user.matchPassword(currentPassword))) {
      console.warn(`[AUTH] Change password rejected: wrong current password for userId=${req.user.id}`);
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }

    // Update password (hook will hash it)
    await user.update({
      password: newPassword,
      passwordResetRequired: false
    });

    console.log(`[AUTH] ✅ Password changed for userId=${req.user.id}`);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[AUTH] ❌ Change password error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
