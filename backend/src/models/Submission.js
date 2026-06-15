import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId:     { type: String, required: true },
  questionType:   { type: String, enum: ['mcq', 'coding', 'subjective'] },
  // MCQ
  selectedOption: { type: Number, default: -1 },
  // Coding
  code:           { type: String, default: '' },
  language:       { type: String, default: 'python' },
  // Subjective
  textAnswer:     { type: String, default: '' },
  // Auto-graded
  isCorrect:      { type: Boolean, default: false },
  score:          { type: Number, default: 0 },
  maxScore:       { type: Number, default: 0 },
  // Coding verdict
  verdict:        { type: String, default: '' },
  passedTests:    { type: Number, default: 0 },
  totalTests:     { type: Number, default: 0 },
});

const submissionSchema = new mongoose.Schema({
  exam:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  answers: [answerSchema],

  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'auto_submitted', 'disqualified'],
    default: 'in_progress',
  },

  totalScore:  { type: Number, default: 0 },
  maxScore:    { type: Number, default: 0 },
  percentage:  { type: Number, default: 0 },

  startedAt:   { type: Date, default: Date.now },
  submittedAt: { type: Date },
  autoSubmit:  { type: Boolean, default: false },
  autoSubmitReason: { type: String, default: '' },

  violationCount: { type: Number, default: 0 },
}, { timestamps: true });

// Unique: one submission per student per exam
submissionSchema.index({ exam: 1, student: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
