import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input:          { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  isHidden:       { type: Boolean, default: false },
  points:         { type: Number, default: 0 },
});

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mcq', 'coding', 'subjective'],
    required: true,
  },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  points:      { type: Number, default: 10 },

  // MCQ fields
  options: [{
    text:      { type: String },
    isCorrect: { type: Boolean, default: false },
  }],

  // Coding fields
  starterCode:      { type: Map, of: String, default: {} }, // { javascript: '...', python: '...' }
  testCases:        [testCaseSchema],
  timeLimitSeconds: { type: Number, default: 5 },
  memoryLimitMB:    { type: Number, default: 256 },
  inputFormat:      { type: String, default: '' },
  outputFormat:     { type: String, default: '' },
  constraints:      { type: String, default: '' },
  allowedLanguages: [{ type: String }],
}, { timestamps: true });

const examSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  course:      { type: String, default: '' },
  faculty:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  questions: [questionSchema],

  // Scheduling & Deployment
  publishedAt:     { type: Date },
  startTime:       { type: Date },
  endTime:         { type: Date },
  durationMinutes: { type: Number, default: 60 },
  allowedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Empty means all students
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'ended'],
    default: 'draft',
  },

  // Security settings
  proctoring: {
    enableWebcam:       { type: Boolean, default: false },
    enableScreenShare:  { type: Boolean, default: false },
    maxViolations:      { type: Number, default: 3 },
    restrictionMinutes: { type: Number, default: 30 },
    disableCopyPaste:   { type: Boolean, default: true },
    requireFullscreen:  { type: Boolean, default: true },
    autoSubmitOnMax:    { type: Boolean, default: true },
  },

  totalMarks:   { type: Number, default: 0 },
  passingMarks: { type: Number, default: 40 },
}, { timestamps: true });

// Auto-calculate total marks
examSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  }
  next();
});

const Exam = mongoose.model('Exam', examSchema);
export default Exam;
