import prisma from '../lib/prisma.js';
import { getIO } from '../sockets/proctorSocket.js';

/**
 * Helpers: Serialize BigInt fields recursively for JSON compatibility.
 * Prisma returns BigInt for BIGINT columns; JSON.stringify chokes on them.
 */
const serializeBigInts = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  return obj;
};

/** POST /api/exams — Create exam (faculty only) */
export const createExam = async (req, res) => {
  try {
    const exam = await prisma.exams.create({
      data: {
        title: req.body.title,
        description: req.body.description || null,
        course: req.body.course || '',
        faculty_id: BigInt(req.user.id),
        published_at: req.body.publishedAt || null,
        start_time: req.body.startTime || null,
        end_time: req.body.endTime || null,
        duration_minutes: req.body.durationMinutes || 60,
        status: req.body.status || 'draft',
        proctoring_config: req.body.proctoringConfig || null,
        total_marks: req.body.totalMarks || 0,
        passing_marks: req.body.passingMarks || 40,
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
    res.status(201).json({ success: true, data: serializeBigInts(exam) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/exams — List all exams */
export const getExams = async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'teacher' || req.user.role === 'faculty') {
      where = { faculty_id: BigInt(req.user.id) };
    } else {
      where = {
        status: { in: ['published', 'active', 'ended'] }
      };
    }

    const isStudent = req.user.role === 'student';

    const exams = await prisma.exams.findMany({
      where,
      include: {
        users: {
          select: { id: true, name: true, email: true }
        },
        exam_questions: {
          select: {
            id: true,
            type: true,
            title: true,
            points: true,
            question_options: {
              select: isStudent
                ? { id: true, text: true }
                : { id: true, text: true, is_correct: true }
            },
            test_cases: isStudent
              ? { where: { is_hidden: false } }
              : true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Map relation names for API contract compatibility
    const mapped = exams.map(e => {
      const { users, exam_questions, ...rest } = e;
      return {
        ...rest,
        faculty: users,
        questions: exam_questions.map(q => {
          const { question_options, test_cases, ...qRest } = q;
          return { ...qRest, options: question_options, testCases: test_cases };
        })
      };
    });

    res.json({ success: true, data: serializeBigInts(mapped) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/exams/:id — Get single exam */
export const getExam = async (req, res) => {
  try {
    const isStudent = req.user.role === 'student';

    const exam = await prisma.exams.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        users: {
          select: { id: true, name: true, email: true }
        },
        exam_questions: {
          include: {
            question_options: {
              select: isStudent
                ? { id: true, text: true }
                : { id: true, text: true, is_correct: true }
            },
            test_cases: isStudent
              ? { where: { is_hidden: false } }
              : true
          }
        }
      }
    });

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    // Map relation names
    const { users, exam_questions, ...rest } = exam;
    const mapped = {
      ...rest,
      faculty: users,
      questions: exam_questions.map(q => {
        const { question_options, test_cases, ...qRest } = q;
        return { ...qRest, options: question_options, testCases: test_cases };
      })
    };

    res.json({ success: true, data: serializeBigInts(mapped) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/exams/:id — Update exam (faculty only) */
export const updateExam = async (req, res) => {
  try {
    const exam = await prisma.exams.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (Number(exam.faculty_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Build update data from camelCase request body → snake_case DB fields
    const updateData = { updated_at: new Date() };
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.course !== undefined) updateData.course = req.body.course;
    if (req.body.startTime !== undefined) updateData.start_time = req.body.startTime;
    if (req.body.endTime !== undefined) updateData.end_time = req.body.endTime;
    if (req.body.durationMinutes !== undefined) updateData.duration_minutes = req.body.durationMinutes;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.proctoringConfig !== undefined) updateData.proctoring_config = req.body.proctoringConfig;
    if (req.body.totalMarks !== undefined) updateData.total_marks = req.body.totalMarks;
    if (req.body.passingMarks !== undefined) updateData.passing_marks = req.body.passingMarks;

    const updated = await prisma.exams.update({
      where: { id: exam.id },
      data: updateData
    });

    res.json({ success: true, data: serializeBigInts(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** DELETE /api/exams/:id — Delete exam (faculty only) */
export const deleteExam = async (req, res) => {
  try {
    const exam = await prisma.exams.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (Number(exam.faculty_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await prisma.exams.delete({ where: { id: exam.id } });
    res.json({ success: true, message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/exams/:id/status — Change exam status */
export const updateExamStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const exam = await prisma.exams.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (Number(exam.faculty_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    const updated = await prisma.exams.update({
      where: { id: exam.id },
      data: {
        status,
        published_at: status === 'published' ? new Date() : exam.published_at,
        updated_at: new Date(),
      }
    });

    // Broadcast deployment
    if (status === 'published' || status === 'active') {
      try {
        const io = getIO();
        io.to('students_global').emit('exam_published', serializeBigInts(updated));
      } catch (e) { console.error('Socket broadcast failed:', e); }
    }

    res.json({ success: true, data: serializeBigInts(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
