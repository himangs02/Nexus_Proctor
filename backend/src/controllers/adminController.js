import User from '../models_sql/User.js';
import { Op } from 'sequelize';
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
    const user = await User.findOne({ where: { facultyId: id } });
    if (!user) exists = false;
  }
  return id;
};

export const getFacultyList = async (req, res) => {
  try {
    const { search, department } = req.query;
    const where = {
      role: { [Op.in]: ['teacher', 'faculty'] }
    };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { facultyId: { [Op.like]: `%${search}%` } }
      ];
    }
    if (department && department !== 'All') {
      where.department = department;
    }

    const faculty = await User.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: faculty });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createFaculty = async (req, res) => {
  try {
    const { name, email, department } = req.body; // Password will be auto-generated

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const facultyId = await generateFacultyId();
    const generatedPassword = generateSecurePassword();

    const newFaculty = await User.create({
      name,
      email,
      facultyId,
      department,
      password: generatedPassword, // Sequelize hook will hash this
      role: 'faculty',
      isActive: true,
      passwordResetRequired: true
    });

    try {
      await sendFacultyCredentials({
        email: newFaculty.email,
        facultyId: newFaculty.facultyId,
        tempPassword: generatedPassword
      });
    } catch (emailErr) {
      console.error("Failed to send faculty credentials email:", emailErr);
      return res.status(201).json({ 
        success: true, 
        message: 'Faculty provisioned successfully, but email failed to send.', 
        data: newFaculty 
      });
    }

    return res.status(201).json({ success: true, message: 'Faculty provisioned successfully and email sent!', data: newFaculty });
  } catch (err) {
    console.error("Creation Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleFacultyStatus = async (req, res) => {
  try {
    const faculty = await User.findByPk(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    await faculty.update({
      isActive: !faculty.isActive
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

    const faculty = await User.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Update password (Sequelize hook will hash it)
    await faculty.update({
      password,
      passwordResetRequired: false
    });
    
    res.json({ success: true, message: `Password manually updated successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const faculty = await User.findByPk(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    
    await faculty.destroy();
    res.json({ success: true, message: 'Faculty account deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const testEmail = async (req, res) => {
  res.status(200).json({ success: true, message: 'Email system disabled by admin.' });
};
