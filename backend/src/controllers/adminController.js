import prisma from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import crypto from 'crypto';
import { sendFacultyCredentials } from '../services/emailService.js';

const generateSecurePassword = () => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
  
  const allChars = uppercase + lowercase + numbers + specialChars;
  
  let password = '';
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += specialChars[crypto.randomInt(0, specialChars.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

const generateFacultyId = async () => {
  let id;
  let exists = true;
  while (exists) {
    id = `FAC${Math.floor(1000 + Math.random() * 9000)}`;
    const user = await prisma.users.findFirst({ where: { faculty_id: id } });
    if (!user) exists = false;
  }
  return id;
};

/**
 * Helper: serialize BigInt fields for JSON responses
 */
const serializeUser = (user) => ({
  ...user,
  id: Number(user.id),
});

export const getFacultyList = async (req, res) => {
  try {
    const { search, department } = req.query;

    const where = {
      role: { in: ['teacher', 'faculty'] }
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { faculty_id: { contains: search } }
      ];
    }
    if (department && department !== 'All') {
      where.department = department;
    }

    const faculty = await prisma.users.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: faculty.map(serializeUser) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createFaculty = async (req, res) => {
  try {
    const { name, email, department } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }

    const exists = await prisma.users.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const facultyId = await generateFacultyId();
    const generatedPassword = generateSecurePassword();

    // Hash password explicitly (no Sequelize hooks)
    const hashedPassword = await hashPassword(generatedPassword);

    const newFaculty = await prisma.users.create({
      data: {
        name,
        email,
        faculty_id: facultyId,
        department,
        password: hashedPassword,
        role: 'faculty',
        is_active: true,
        password_reset_required: true,
        created_at: new Date(),
        updated_at: new Date(),
      }
    });

    try {
      await sendFacultyCredentials({
        email: newFaculty.email,
        facultyId: newFaculty.faculty_id,
        tempPassword: generatedPassword
      });
    } catch (emailErr) {
      console.error("Failed to send faculty credentials email:", emailErr);
      return res.status(201).json({ 
        success: true, 
        message: 'Faculty provisioned successfully, but email failed to send.', 
        data: serializeUser(newFaculty)
      });
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Faculty provisioned successfully and email sent!', 
      data: serializeUser(newFaculty) 
    });
  } catch (err) {
    console.error("Creation Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleFacultyStatus = async (req, res) => {
  try {
    const faculty = await prisma.users.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    await prisma.users.update({
      where: { id: faculty.id },
      data: { is_active: !faculty.is_active, updated_at: new Date() }
    });

    res.json({ success: true, message: `Faculty status updated successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const resetFacultyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    const faculty = await prisma.users.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Hash password explicitly
    const hashedPassword = await hashPassword(password);

    await prisma.users.update({
      where: { id: faculty.id },
      data: {
        password: hashedPassword,
        password_reset_required: false,
        updated_at: new Date(),
      }
    });
    
    res.json({ success: true, message: `Password manually updated successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const faculty = await prisma.users.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    
    await prisma.users.delete({ where: { id: faculty.id } });
    res.json({ success: true, message: 'Faculty account deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const testEmail = async (req, res) => {
  res.status(200).json({ success: true, message: 'Email system disabled by admin.' });
};
