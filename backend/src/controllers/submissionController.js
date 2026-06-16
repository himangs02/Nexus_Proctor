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

/** POST /api/submissions/start/:examId — Start or resume a submission */
export const startSubmission = async (req, res) => {
  try {
    const examId = BigInt(req.params.examId);
    const studentId = BigInt(req.user.id);

    const exam = await prisma.exams.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const now = new Date();
    const isAutoStarted = exam.status === 'published' && exam.start_time && new Date(exam.start_time) <= now;

    if (exam.status !== 'active' && !isAutoStarted) {
      return res.status(400).json({ success: false, message: 'Exam is not active yet. Please wait for the start time.' });
    }

    // If the student triggers the auto-start, update the DB
    if (isAutoStarted && exam.status !== 'active') {
      await prisma.exams.update({
        where: { id: examId },
        data: { status: 'active', updated_at: new Date() }
      });
    }

    // Check restrictions
    const restriction = await prisma.restrictions.findFirst({
      where: {
        student_id: studentId,
        exam_id: examId,
        is_active: true,
        expires_at: { gt: new Date() }
      }
    });

    if (restriction) {
      const mins = Math.ceil((new Date(restriction.expires_at) - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        message: `You are restricted from this exam. Try again in ${mins} minutes.`,
        restriction: { reason: restriction.reason, expiresAt: restriction.expires_at }
      });
    }

    let sub = await prisma.submissions.findFirst({
      where: { exam_id: examId, student_id: studentId }
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
        sub = await prisma.submissions.create({
          data: {
            exam_id: examId,
            student_id: studentId,
            max_score: exam.total_marks || 0,
            started_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          }
        });

        // Create empty answers for all questions
        const questions = await prisma.exam_questions.findMany({
          where: { exam_id: examId }
        });

        if (questions.length > 0) {
          const answers = questions.map(q => ({
            submission_id: sub.id,
            question_id: q.id,
            question_type: q.type,
            selected_option: -1,
            code: '',
            language: 'python',
            text_answer: '',
            max_score: q.points || 0,
            created_at: new Date(),
            updated_at: new Date(),
          }));

          await prisma.submission_answers.createMany({ data: answers });
        }
      } catch (err) {
        // Handle race condition (unique constraint on exam_id + student_id)
        if (err.code === 'P2002') {
          sub = await prisma.submissions.findFirst({
            where: { exam_id: examId, student_id: studentId }
          });
          resumed = true;
          if (!sub) throw err;
        } else {
          throw err;
        }
      }
    }

    res.json({ success: true, resumed, data: serializeBigInts(sub) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/submissions/:id/save — Auto-save answers */
export const saveAnswers = async (req, res) => {
  try {
    const sub = await prisma.submissions.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (Number(sub.student_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (sub.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Cannot modify a submitted exam' });
    }

    // Update each answer
    const { answers } = req.body;
    if (answers && Array.isArray(answers)) {
      for (const answerData of answers) {
        await prisma.submission_answers.updateMany({
          where: {
            submission_id: sub.id,
            question_id: BigInt(answerData.questionId)
          },
          data: {
            selected_option: answerData.selectedOption,
            code: answerData.code,
            language: answerData.language,
            text_answer: answerData.textAnswer,
            updated_at: new Date(),
          }
        });
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
    const sub = await prisma.submissions.findUnique({
      where: { id: BigInt(req.params.id) },
      include: { submission_answers: true }
    });

    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (Number(sub.student_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const exam = await prisma.exams.findUnique({
      where: { id: sub.exam_id },
      include: {
        exam_questions: {
          include: { question_options: true }
        }
      }
    });

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    // Update answers from request
    if (req.body.answers) {
      for (const answerData of req.body.answers) {
        await prisma.submission_answers.updateMany({
          where: {
            submission_id: sub.id,
            question_id: BigInt(answerData.questionId)
          },
          data: {
            selected_option: answerData.selectedOption,
            code: answerData.code,
            language: answerData.language,
            text_answer: answerData.textAnswer,
            updated_at: new Date(),
          }
        });
      }
    }

    // Reload answers after updates
    const updatedAnswers = await prisma.submission_answers.findMany({
      where: { submission_id: sub.id }
    });

    // Auto-grade MCQs
    let totalScore = 0;
    for (const ans of updatedAnswers) {
      const question = exam.exam_questions.find(q => q.id === ans.question_id);
      if (!question) continue;

      if (question.type === 'mcq' && ans.selected_option >= 0) {
        const correctOption = question.question_options.find(o => o.is_correct === true);
        const isCorrect = correctOption && correctOption.order_index === ans.selected_option;
        
        await prisma.submission_answers.update({
          where: { id: ans.id },
          data: {
            is_correct: isCorrect || false,
            score: isCorrect ? (question.points || 0) : 0,
            updated_at: new Date(),
          }
        });

        totalScore += isCorrect ? (question.points || 0) : 0;
      } else {
        totalScore += ans.score || 0;
      }
    }

    // Update submission
    const updated = await prisma.submissions.update({
      where: { id: sub.id },
      data: {
        total_score: totalScore,
        max_score: exam.total_marks || 0,
        percentage: exam.total_marks > 0 ? Math.round((totalScore / exam.total_marks) * 100) : 0,
        status: req.body.autoSubmit ? 'auto_submitted' : 'submitted',
        auto_submit: !!req.body.autoSubmit,
        auto_submit_reason: req.body.reason || '',
        submitted_at: new Date(),
        updated_at: new Date(),
      }
    });

    res.json({ success: true, data: serializeBigInts(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/submissions/my — Student's submissions */
export const getMySubmissions = async (req, res) => {
  try {
    const subs = await prisma.submissions.findMany({
      where: { student_id: BigInt(req.user.id) },
      include: {
        exams: {
          select: { id: true, title: true, total_marks: true, passing_marks: true, duration_minutes: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Map relation name for API contract compatibility
    const mapped = subs.map(s => {
      const { exams, ...rest } = s;
      return { ...rest, exam: exams };
    });

    res.json({ success: true, data: serializeBigInts(mapped) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/submissions/exam/:examId — Faculty view: all submissions for an exam */
export const getExamSubmissions = async (req, res) => {
  try {
    const subs = await prisma.submissions.findMany({
      where: { exam_id: BigInt(req.params.examId) },
      include: {
        users: {
          select: { id: true, name: true, email: true, student_id: true }
        }
      },
      orderBy: { total_score: 'desc' }
    });

    // Map relation name
    const mapped = subs.map(s => {
      const { users, ...rest } = s;
      return { ...rest, student: users };
    });

    res.json({ success: true, data: serializeBigInts(mapped) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
