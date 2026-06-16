import prisma from '../lib/prisma.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id: Number(id) }, process.env.JWT_SECRET, { expiresIn: '4h' });
};

/**
 * Helper: serialize a Prisma user row for JSON response.
 * Converts BigInt id to Number so JSON.stringify doesn't break.
 */
const serializeUser = (user) => ({
  ...user,
  id: Number(user.id),
});

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
    const emailExists = await prisma.users.findUnique({
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
      const studentIdExists = await prisma.users.findFirst({
        where: { student_id: trimmedStudentId }
      });

      if (studentIdExists) {
        console.warn(`[AUTH] Registration rejected: duplicate studentId ${trimmedStudentId}`);
        return res.status(400).json({ 
          success: false, 
          message: 'Student ID already registered. Please use a different Student ID.' 
        });
      }
    }

    // Hash password explicitly (Prisma has no hooks)
    const hashedPassword = await hashPassword(password);

    const userData = {
      name,
      email: trimmedEmail,
      password: hashedPassword,
      role: role || 'student',
      is_active: true,
      password_reset_required: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (userData.role === 'teacher' || userData.role === 'faculty') {
      userData.faculty_id = `FAC-${Date.now()}`;
    } else if (trimmedStudentId) {
      userData.student_id = trimmedStudentId;
    }

    console.log(`[AUTH] Creating user: email=${trimmedEmail} role=${userData.role}`);
    const user = await prisma.users.create({ data: userData });
    console.log(`[AUTH] ✅ User created successfully: id=${user.id} email=${user.email}`);

    res.status(201).json({
      success: true,
      _id: Number(user.id),
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
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { student_id: loginIdentifier },
          { faculty_id: loginIdentifier }
        ]
      }
    });

    if (!user) {
      console.warn(`[AUTH] Login failed: no user found for ${loginIdentifier}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.is_active) {
      console.warn(`[AUTH] Login failed: account disabled for ${loginIdentifier}`);
      return res.status(403).json({ success: false, message: 'Account is disabled. Please contact admin.' });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (passwordMatch) {
      // Update last login
      await prisma.users.update({
        where: { id: user.id },
        data: { last_login: new Date(), updated_at: new Date() }
      });
      console.log(`[AUTH] ✅ Login successful: id=${user.id} role=${user.role}`);

      res.json({
        success: true,
        _id: Number(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.student_id,
        facultyId: user.faculty_id,
        passwordResetRequired: user.password_reset_required,
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
    const user = await prisma.users.findUnique({
      where: { id: BigInt(req.user.id) }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (currentPassword && !(await comparePassword(currentPassword, user.password))) {
      console.warn(`[AUTH] Change password rejected: wrong current password for userId=${req.user.id}`);
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }

    // Hash new password explicitly
    const hashedPassword = await hashPassword(newPassword);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        password_reset_required: false,
        updated_at: new Date(),
      }
    });

    console.log(`[AUTH] ✅ Password changed for userId=${req.user.id}`);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[AUTH] ❌ Change password error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
