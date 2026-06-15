import Violation from '../models_sql/Violation.js';
import Restriction from '../models_sql/Restriction.js';
import Submission from '../models_sql/Submission.js';
import Exam from '../models_sql/Exam.js';
import User from '../models_sql/User.js';

/** POST /api/violations — Log a violation */
export const logViolation = async (req, res) => {
  try {
    const { examId, type, severity, details } = req.body;
    const violation = await Violation.create({
      examId,
      studentId: req.user.id,
      type,
      severity: severity || 'medium',
      details: details || '',
    });

    // Update submission violation count
    await Submission.increment('violationCount', {
      where: { examId, studentId: req.user.id, status: 'in_progress' }
    });

    // Check if max violations exceeded → auto-restrict
    const exam = await Exam.findByPk(examId);
    if (exam) {
      const count = await Violation.count({
        where: { examId, studentId: req.user.id }
      });

      const maxViolations = exam.proctoringConfig?.maxViolations || 3;
      if (count >= maxViolations) {
        // Create or update restriction
        const restrictionMins = exam.proctoringConfig?.restrictionMinutes || 30;
        const expiresAt = new Date(Date.now() + restrictionMins * 60000);

        await Restriction.upsert({
          studentId: req.user.id,
          examId,
          reason: `Exceeded maximum violations (${count}/${maxViolations})`,
          restrictedAt: new Date(),
          expiresAt,
          isActive: true,
          violationCount: count
        });

        // Auto-submit if configured
        if (exam.proctoringConfig?.autoSubmitOnMax) {
          await Submission.update(
            {
              status: 'auto_submitted',
              autoSubmit: true,
              autoSubmitReason: 'Max violations exceeded',
              submittedAt: new Date()
            },
            {
              where: { examId, studentId: req.user.id, status: 'in_progress' }
            }
          );
        }

        return res.json({
          success: true,
          data: violation,
          restricted: true,
          message: `Restricted for ${restrictionMins} minutes due to excessive violations.`,
        });
      }
    }

    res.json({ success: true, data: violation, restricted: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/violations/exam/:examId — Faculty: get all violations for an exam */
export const getExamViolations = async (req, res) => {
  try {
    const violations = await Violation.findAll({
      where: { examId: req.params.examId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'studentId']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: violations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/violations/student/:examId — Student's own violations */
export const getMyViolations = async (req, res) => {
  try {
    const violations = await Violation.findAll({
      where: { examId: req.params.examId, studentId: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: violations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/violations/restrictions/:examId — Get active restrictions */
export const getRestrictions = async (req, res) => {
  try {
    const restrictions = await Restriction.findAll({
      where: { examId: req.params.examId, isActive: true },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'studentId']
        }
      ]
    });
    res.json({ success: true, data: restrictions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
