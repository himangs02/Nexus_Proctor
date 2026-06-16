import prisma from '../lib/prisma.js';

/**
 * Helper: Serialize BigInt fields recursively for JSON compatibility.
 */
const serializeBigInts = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  return obj;
};

/** POST /api/violations — Log a violation */
export const logViolation = async (req, res) => {
  try {
    const { examId, type, severity, details } = req.body;
    const studentId = BigInt(req.user.id);
    const examIdBig = BigInt(examId);

    const violation = await prisma.violations.create({
      data: {
        exam_id: examIdBig,
        student_id: studentId,
        type,
        severity: severity || 'medium',
        details: details || '',
        created_at: new Date(),
        updated_at: new Date(),
      }
    });

    // Update submission violation count (atomic increment)
    await prisma.submissions.updateMany({
      where: {
        exam_id: examIdBig,
        student_id: studentId,
        status: 'in_progress'
      },
      data: {
        violation_count: { increment: 1 },
        updated_at: new Date(),
      }
    });

    // Check if max violations exceeded → auto-restrict
    const exam = await prisma.exams.findUnique({ where: { id: examIdBig } });
    if (exam) {
      const count = await prisma.violations.count({
        where: { exam_id: examIdBig, student_id: studentId }
      });

      const procConfig = exam.proctoring_config || {};
      const maxViolations = procConfig.maxViolations || 3;

      if (count >= maxViolations) {
        // Create or update restriction
        const restrictionMins = procConfig.restrictionMinutes || 30;
        const expiresAt = new Date(Date.now() + restrictionMins * 60000);

        // Find existing restriction for this student+exam
        const existing = await prisma.restrictions.findFirst({
          where: { student_id: studentId, exam_id: examIdBig }
        });

        if (existing) {
          await prisma.restrictions.update({
            where: { id: existing.id },
            data: {
              reason: `Exceeded maximum violations (${count}/${maxViolations})`,
              restricted_at: new Date(),
              expires_at: expiresAt,
              is_active: true,
              violation_count: count,
              updated_at: new Date(),
            }
          });
        } else {
          await prisma.restrictions.create({
            data: {
              student_id: studentId,
              exam_id: examIdBig,
              reason: `Exceeded maximum violations (${count}/${maxViolations})`,
              restricted_at: new Date(),
              expires_at: expiresAt,
              is_active: true,
              violation_count: count,
              created_at: new Date(),
              updated_at: new Date(),
            }
          });
        }

        // Auto-submit if configured
        if (procConfig.autoSubmitOnMax) {
          await prisma.submissions.updateMany({
            where: {
              exam_id: examIdBig,
              student_id: studentId,
              status: 'in_progress'
            },
            data: {
              status: 'auto_submitted',
              auto_submit: true,
              auto_submit_reason: 'Max violations exceeded',
              submitted_at: new Date(),
              updated_at: new Date(),
            }
          });
        }

        return res.json({
          success: true,
          data: serializeBigInts(violation),
          restricted: true,
          message: `Restricted for ${restrictionMins} minutes due to excessive violations.`,
        });
      }
    }

    res.json({ success: true, data: serializeBigInts(violation), restricted: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/violations/exam/:examId — Faculty: get all violations for an exam */
export const getExamViolations = async (req, res) => {
  try {
    const violations = await prisma.violations.findMany({
      where: { exam_id: BigInt(req.params.examId) },
      include: {
        users: {
          select: { id: true, name: true, email: true, student_id: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Map relation name for API contract
    const mapped = violations.map(v => {
      const { users, ...rest } = v;
      return { ...rest, student: users };
    });

    res.json({ success: true, data: serializeBigInts(mapped) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/violations/student/:examId — Student's own violations */
export const getMyViolations = async (req, res) => {
  try {
    const violations = await prisma.violations.findMany({
      where: {
        exam_id: BigInt(req.params.examId),
        student_id: BigInt(req.user.id)
      },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: serializeBigInts(violations) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/violations/restrictions/:examId — Get active restrictions */
export const getRestrictions = async (req, res) => {
  try {
    const restrictions = await prisma.restrictions.findMany({
      where: {
        exam_id: BigInt(req.params.examId),
        is_active: true
      },
      include: {
        users_restrictions_student_idTousers: {
          select: { id: true, name: true, email: true, student_id: true }
        }
      }
    });

    // Map relation name for API contract
    const mapped = restrictions.map(r => {
      const { users_restrictions_student_idTousers, ...rest } = r;
      return { ...rest, student: users_restrictions_student_idTousers };
    });

    res.json({ success: true, data: serializeBigInts(mapped) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
