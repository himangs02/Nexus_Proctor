import User from './User.js';
import Exam from './Exam.js';
import ExamQuestion from './ExamQuestion.js';
import QuestionOption from './QuestionOption.js';
import TestCase from './TestCase.js';
import Submission from './Submission.js';
import SubmissionAnswer from './SubmissionAnswer.js';
import Violation from './Violation.js';
import Restriction from './Restriction.js';

// User associations
User.hasMany(Exam, { foreignKey: 'facultyId', as: 'createdExams' });
User.hasMany(Submission, { foreignKey: 'studentId', as: 'submissions' });
User.hasMany(Violation, { foreignKey: 'studentId', as: 'violations' });
User.hasMany(Restriction, { foreignKey: 'studentId', as: 'restrictions' });
User.hasMany(Restriction, { foreignKey: 'imposedById', as: 'imposedRestrictions' });

// Exam associations
Exam.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });
Exam.hasMany(ExamQuestion, { foreignKey: 'examId', as: 'questions' });
Exam.hasMany(Submission, { foreignKey: 'examId', as: 'submissions' });
Exam.hasMany(Violation, { foreignKey: 'examId', as: 'violations' });
Exam.hasMany(Restriction, { foreignKey: 'examId', as: 'restrictions' });

// ExamQuestion associations
ExamQuestion.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
ExamQuestion.hasMany(QuestionOption, { foreignKey: 'questionId', as: 'options' });
ExamQuestion.hasMany(TestCase, { foreignKey: 'questionId', as: 'testCases' });
ExamQuestion.hasMany(SubmissionAnswer, { foreignKey: 'questionId', as: 'answers' });

// QuestionOption associations
QuestionOption.belongsTo(ExamQuestion, { foreignKey: 'questionId', as: 'question' });

// TestCase associations
TestCase.belongsTo(ExamQuestion, { foreignKey: 'questionId', as: 'question' });

// Submission associations
Submission.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
Submission.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Submission.hasMany(SubmissionAnswer, { foreignKey: 'submissionId', as: 'answers' });

// SubmissionAnswer associations
SubmissionAnswer.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });
SubmissionAnswer.belongsTo(ExamQuestion, { foreignKey: 'questionId', as: 'question' });

// Violation associations
Violation.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
Violation.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// Restriction associations
Restriction.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Restriction.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
Restriction.belongsTo(User, { foreignKey: 'imposedById', as: 'imposedBy' });

export {
  User,
  Exam,
  ExamQuestion,
  QuestionOption,
  TestCase,
  Submission,
  SubmissionAnswer,
  Violation,
  Restriction
};
