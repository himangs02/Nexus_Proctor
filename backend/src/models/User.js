import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, unique: true, sparse: true },
  facultyId: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin', 'faculty'], default: 'student' },
  department: { type: String },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  passwordResetRequired: { type: Boolean, default: false }
}, { timestamps: true });

// 🚨 EXORCISM: Removed the 'next' parameter entirely! 
// Now Mongoose relies purely on the async promise. It is mathematically impossible for it to hang!
userSchema.pre('save', async function () {
  
  // 🚨 EXORCISM: Added "return"! If the password hasn't changed, STOP the function instantly!
  if (!this.isModified('password')) {
    return; 
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;