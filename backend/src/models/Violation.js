import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema({
  exam:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'tab_switch', 'window_blur', 'fullscreen_exit', 'copy_paste',
      'right_click', 'devtools', 'keyboard_shortcut', 'screen_resize',
      'multiple_faces', 'no_face', 'face_mismatch', 'app_switch',
      'browser_switch', 'minimize', 'other'
    ],
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  details:   { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

violationSchema.index({ exam: 1, student: 1 });
violationSchema.index({ student: 1, timestamp: -1 });

const Violation = mongoose.model('Violation', violationSchema);
export default Violation;
