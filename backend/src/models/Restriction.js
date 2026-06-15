import mongoose from 'mongoose';

const restrictionSchema = new mongoose.Schema({
  student:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam:      { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  reason:    { type: String, required: true },
  restrictedAt: { type: Date, default: Date.now },
  expiresAt:    { type: Date, required: true },
  isActive:     { type: Boolean, default: true },
  violationCount: { type: Number, default: 0 },
  imposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // faculty who imposed
}, { timestamps: true });

restrictionSchema.index({ student: 1, exam: 1 });
restrictionSchema.index({ expiresAt: 1 });

const Restriction = mongoose.model('Restriction', restrictionSchema);
export default Restriction;
