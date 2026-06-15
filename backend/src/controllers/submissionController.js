import Submission from '../models_sql/Submission.js';
import SubmissionAnswer from '../models_sql/SubmissionAnswer.js';
import Exam from '../models_sql/Exam.js';
import ExamQuestion from '../models_sql/ExamQuestion.js';
import Restriction from '../models_sql/Restriction.js';
import User from '../models_sql/User.js';
import { Op } from 'sequelize';

/** POST /api/submissions/start/:examId — Start or resume a submission */
export const startSubmission = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findByPk(examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const now = new Date();
    const isAutoStarted = exam.status === 'published' && exam.startTime && new Date(exam.startTime) <= now;

    if (exam.status !== 'active' && !isAutoStarted) {
      return res.status(400).json({ success: false, message: 'Exam is not active yet. Please wait for the start time.' });
    }

    // If the student triggers the auto-start, update the DB
    if (isAutoStarted && exam.status !== 'active') {
      await exam.update({ status: 'active' });
    }

    // Check restrictions
    const restriction = await Restriction.findOne({
      where: {
        studentId: req.user.id,
        examId,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (restriction) {
      const mins = Math.ceil((new Date(restriction.expiresAt) - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        message: `You are restricted from this exam. Try again in ${mins} minutes.`,
        restriction: { reason: restriction.reason, expiresAt: restriction.expiresAt }
      });
    }

    let sub = await Submission.findOne({
      where: { examId, studentId: req.user.id }
    });

    if (sub && (sub.status === 'submitted' || sub.status === 'auto_submitted')) {
      return res.status(400).json({ success: false, message: 'Exam already submitted' });
    }
    if (sub && sub.status === 'disqualified') {
      return res.status(403).json({ success: false, message: 'You have been disqualified from this exam' });
    }

    let resumed = false;
    if (sub) {
      resumed = true;
    } else {
      try {
        // Create new submission
        sub = await Submission.create({
          examId,
          studentId: req.user.id,
          maxScore: exam.totalMarks
        });

        // Create empty answers for all questions
        const questions = await ExamQuestion.findAll({ where: { examId } });
        const answers = questions.map(q => ({
          submissionId: sub.id,
          questionId: q.id,
          questionType: q.type,
          selectedOption: -1,
          code: '',
          language: 'python',
          textAnswer: '',
          maxScore: q.points
        }));
        await SubmissionAnswer.bulkCreate(answers);
      } catch (err) {
        // Handle race condition
        if (err.name === 'SequelizeUniqueConstraintError') {
          sub = await Submission.findOne({ where: { examId, studentId: req.user.id } });
          resumed = true;
          if (!sub) throw err;
        } else {
          throw err;
        }
      }
    }

    res.json({ success: true, resumed, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/submissions/:id/save — Auto-save answers */
export const saveAnswers = async (req, res) => {
  try {
    const sub = await Submission.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (sub.studentId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (sub.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Cannot modify a submitted exam' });
    }

    // Update each answer
    const { answers } = req.body;
    if (answers && Array.isArray(answers)) {
      for (const answerData of answers) {
        await SubmissionAnswer.update(
          {
            selectedOption: answerData.selectedOption,
            code: answerData.code,
            language: answerData.language,
            textAnswer: answerData.textAnswer
          },
          {
            where: {
              submissionId: sub.id,
              questionId: answerData.questionId
            }
          }
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/submissions/:id/submit — Final submission + auto-grade MCQs */
export const submitExam = async (req, res) => {
  try {
    const sub = await Submission.findByPk(req.params.id, {
      include: [
        {
          model: SubmissionAnswer,
          as: 'answers'
        }
      ]
    });

    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (sub.studentId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const exam = await Exam.findByPk(sub.examId, {
      include: [
        {
          model: ExamQuestion,
          as: 'questions',
          include: [
            {
              model: require('../models_sql/QuestionOption.js').default,
              as: 'options'
            }
          ]
        }
      ]
    });

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    // Update answers from request
    if (req.body.answers) {
      for (const answerData of req.body.answers) {
        await SubmissionAnswer.update(
          {
            selectedOption: answerData.selectedOption,
            code: answerData.code,
            language: answerData.language,
            textAnswer: answerData.textAnswer
          },
          {
            where: {
              submissionId: sub.id,
              questionId: answerData.questionId
            }
          }
        );
      }
    }

    // Reload answers after updates
    const updatedAnswers = await SubmissionAnswer.findAll({
      where: { submissionId: sub.id }
    });

    // Auto-grade MCQs
    let totalScore = 0;
    for (const ans of updatedAnswers) {
      const question = exam.questions.find(q => q.id === ans.questionId);
      if (!question) continue;

      if (question.type === 'mcq' && ans.selectedOption >= 0) {
        const correctOption = question.options.find(o => o.isCorrect === true);
        const isCorrect = correctOption && correctOption.orderIndex === ans.selectedOption;
        
        await ans.update({
          isCorrect,
          score: isCorrect ? question.points : 0
        });

        totalScore += isCorrect ? question.points : 0;
      } else {
        totalScore += ans.score || 0;
      }
    }

    // Update submission
    await sub.update({
      totalScore,
      maxScore: exam.totalMarks,
      percentage: exam.totalMarks > 0 ? Math.round((totalScore / exam.totalMarks) * 100) : 0,
      status: req.body.autoSubmit ? 'auto_submitted' : 'submitted',
      autoSubmit: !!req.body.autoSubmit,
      autoSubmitReason: req.body.reason || '',
      submittedAt: new Date()
    });

    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/submissions/my — Student's submissions */
export const getMySubmissions = async (req, res) => {
  try {
    const subs = await Submission.findAll({
      where: { studentId: req.user.id },
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'title', 'totalMarks', 'passingMarks', 'durationMinutes']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/submissions/exam/:examId — Faculty view: all submissions for an exam */
export const getExamSubmissions = async (req, res) => {
  try {
    const subs = await Submission.findAll({
      where: { examId: req.params.examId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'studentId']
        }
      ],
      order: [['totalScore', 'DESC']]
    });
    res.json({ success: true, data: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
