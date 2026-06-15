import Exam from '../models_sql/Exam.js';
import ExamQuestion from '../models_sql/ExamQuestion.js';
import Submission from '../models_sql/Submission.js';
import User from '../models_sql/User.js';
import { Op } from 'sequelize';
import { getIO } from '../sockets/proctorSocket.js';

/** POST /api/exams — Create exam (faculty only) */
export const createExam = async (req, res) => {
  try {
    const exam = await Exam.create({
      ...req.body,
      facultyId: req.user.id
    });
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/exams — List all exams (faculty sees own, student sees published/active) */
export const getExams = async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'teacher' || req.user.role === 'faculty') {
      where = { facultyId: req.user.id };
    } else {
      where = {
        status: { [Op.in]: ['published', 'active', 'ended'] }
      };
    }

    const exams = await Exam.findAll({
      where,
      include: [
        {
          model: User,
          as: 'faculty',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ExamQuestion,
          as: 'questions',
          attributes: ['id', 'type', 'title', 'points'],
          include: [
            {
              model: require('../models_sql/QuestionOption.js').default,
              as: 'options',
              attributes: req.user.role === 'student' ? ['id', 'text'] : ['id', 'text', 'isCorrect']
            },
            {
              model: require('../models_sql/TestCase.js').default,
              as: 'testCases',
              where: req.user.role === 'student' ? { isHidden: false } : undefined,
              required: false
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/exams/:id — Get single exam */
export const getExam = async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'faculty',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ExamQuestion,
          as: 'questions',
          include: [
            {
              model: require('../models_sql/QuestionOption.js').default,
              as: 'options',
              attributes: req.user.role === 'student' ? ['id', 'text'] : ['id', 'text', 'isCorrect']
            },
            {
              model: require('../models_sql/TestCase.js').default,
              as: 'testCases',
              where: req.user.role === 'student' ? { isHidden: false } : undefined,
              required: false
            }
          ]
        }
      ]
    });

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    res.json({ success: true, data: exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/exams/:id — Update exam (faculty only) */
export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.facultyId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await exam.update(req.body);
    res.json({ success: true, data: exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** DELETE /api/exams/:id — Delete exam (faculty only) */
export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.facultyId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await exam.destroy();
    res.json({ success: true, message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/exams/:id/status — Change exam status */
export const updateExamStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.facultyId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await exam.update({
      status,
      publishedAt: status === 'published' ? new Date() : exam.publishedAt
    });

    // Broadcast deployment
    if (status === 'published' || status === 'active') {
      try {
        const io = getIO();
        io.to('students_global').emit('exam_published', exam);
      } catch (e) { console.error('Socket broadcast failed:', e); }
    }

    res.json({ success: true, data: exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
