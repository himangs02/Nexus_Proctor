import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sequelize from './config/mysql.js';
import User from './models_sql/User.js';
import Exam from './models_sql/Exam.js';
import ExamQuestion from './models_sql/ExamQuestion.js';
import QuestionOption from './models_sql/QuestionOption.js';
import TestCase from './models_sql/TestCase.js';
import Submission from './models_sql/Submission.js';
import SubmissionAnswer from './models_sql/SubmissionAnswer.js';
import Violation from './models_sql/Violation.js';
import Restriction from './models_sql/Restriction.js';
// Import MongoDB models for reading
import UserMongo from './models/User.js';
import ExamMongo from './models/Exam.js';
import SubmissionMongo from './models/Submission.js';
import ViolationMongo from './models/Violation.js';
import RestrictionMongo from './models/Restriction.js';
// Import models associations
import './models_sql/index.js';

dotenv.config();

const migrate = async () => {
  try {
    console.log('🔄 Starting MongoDB to MySQL migration...\n');

    // Connect to both databases
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected\n');

    console.log('📡 Connecting to MySQL...');
    await sequelize.authenticate();
    console.log('✅ MySQL connected\n');

    console.log('🔄 Syncing MySQL models...');
    await sequelize.sync({ alter: false });
    console.log('✅ Models synced\n');

    // Migrate Users
    console.log('👥 Migrating Users...');
    const mongoUsers = await UserMongo.find();
    console.log(`   Found ${mongoUsers.length} users in MongoDB`);

    let migratedUsers = 0;
    for (const user of mongoUsers) {
      try {
        await User.findOrCreate({
          where: { email: user.email },
          defaults: {
            name: user.name,
            email: user.email,
            password: user.password,
            studentId: user.studentId || null,
            facultyId: user.facultyId || null,
            role: user.role,
            department: user.department || null,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            passwordResetRequired: user.passwordResetRequired
          }
        });
        migratedUsers++;
      } catch (err) {
        console.error(`   ❌ Failed to migrate user ${user.email}: ${err.message}`);
      }
    }
    console.log(`✅ Migrated ${migratedUsers}/${mongoUsers.length} users\n`);

    // Migrate Exams
    console.log('📝 Migrating Exams...');
    const mongoExams = await ExamMongo.find().populate('faculty');
    console.log(`   Found ${mongoExams.length} exams in MongoDB`);

    const examIdMap = new Map(); // Map MongoDB ID to MySQL ID
    let migratedExams = 0;

    for (const exam of mongoExams) {
      try {
        // Get faculty user from MySQL
        const facultyUser = await User.findOne({
          where: { email: exam.faculty.email }
        });

        if (!facultyUser) {
          console.error(`   ⚠️  Faculty not found for exam: ${exam.title}`);
          continue;
        }

        // Create exam
        const newExam = await Exam.create({
          title: exam.title,
          description: exam.description || '',
          course: exam.course || '',
          facultyId: facultyUser.id,
          publishedAt: exam.publishedAt,
          startTime: exam.startTime,
          endTime: exam.endTime,
          durationMinutes: exam.durationMinutes,
          status: exam.status,
          proctoringConfig: exam.proctoring || {},
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks
        });

        examIdMap.set(exam._id.toString(), newExam.id);

        // Migrate questions
        if (exam.questions && Array.isArray(exam.questions)) {
          for (let qIdx = 0; qIdx < exam.questions.length; qIdx++) {
            const question = exam.questions[qIdx];
            const newQuestion = await ExamQuestion.create({
              examId: newExam.id,
              type: question.type,
              title: question.title,
              description: question.description || '',
              points: question.points,
              starterCode: question.starterCode || {},
              timeLimitSeconds: question.timeLimitSeconds,
              memoryLimitMB: question.memoryLimitMB,
              inputFormat: question.inputFormat || '',
              outputFormat: question.outputFormat || '',
              constraints: question.constraints || '',
              allowedLanguages: question.allowedLanguages || []
            });

            // Migrate options
            if (question.options && Array.isArray(question.options)) {
              for (let oIdx = 0; oIdx < question.options.length; oIdx++) {
                const option = question.options[oIdx];
                await QuestionOption.create({
                  questionId: newQuestion.id,
                  text: option.text,
                  isCorrect: option.isCorrect,
                  orderIndex: oIdx
                });
              }
            }

            // Migrate test cases
            if (question.testCases && Array.isArray(question.testCases)) {
              for (let tcIdx = 0; tcIdx < question.testCases.length; tcIdx++) {
                const tc = question.testCases[tcIdx];
                await TestCase.create({
                  questionId: newQuestion.id,
                  input: tc.input || '',
                  expectedOutput: tc.expectedOutput || '',
                  isHidden: tc.isHidden,
                  points: tc.points,
                  orderIndex: tcIdx
                });
              }
            }
          }
        }

        migratedExams++;
      } catch (err) {
        console.error(`   ❌ Failed to migrate exam ${exam.title}: ${err.message}`);
      }
    }
    console.log(`✅ Migrated ${migratedExams}/${mongoExams.length} exams\n`);

    // Migrate Submissions
    console.log('📬 Migrating Submissions...');
    const mongoSubmissions = await SubmissionMongo.find().populate('exam').populate('student');
    console.log(`   Found ${mongoSubmissions.length} submissions in MongoDB`);

    let migratedSubmissions = 0;
    for (const submission of mongoSubmissions) {
      try {
        const examId = examIdMap.get(submission.exam._id.toString());
        const studentUser = await User.findOne({
          where: { email: submission.student.email }
        });

        if (!examId || !studentUser) {
          console.error(`   ⚠️  Skipping submission - exam or student not found`);
          continue;
        }

        const newSubmission = await Submission.create({
          examId,
          studentId: studentUser.id,
          status: submission.status,
          totalScore: submission.totalScore,
          maxScore: submission.maxScore,
          percentage: submission.percentage,
          startedAt: submission.startedAt,
          submittedAt: submission.submittedAt,
          autoSubmit: submission.autoSubmit,
          autoSubmitReason: submission.autoSubmitReason || '',
          violationCount: submission.violationCount
        });

        // Migrate submission answers
        if (submission.answers && Array.isArray(submission.answers)) {
          for (const answer of submission.answers) {
            await SubmissionAnswer.create({
              submissionId: newSubmission.id,
              questionId: 0, // Will be updated after questions are mapped
              questionType: answer.questionType,
              selectedOption: answer.selectedOption,
              code: answer.code || '',
              language: answer.language || 'python',
              textAnswer: answer.textAnswer || '',
              isCorrect: answer.isCorrect,
              score: answer.score,
              maxScore: answer.maxScore,
              verdict: answer.verdict || '',
              passedTests: answer.passedTests,
              totalTests: answer.totalTests
            });
          }
        }

        migratedSubmissions++;
      } catch (err) {
        console.error(`   ❌ Failed to migrate submission: ${err.message}`);
      }
    }
    console.log(`✅ Migrated ${migratedSubmissions}/${mongoSubmissions.length} submissions\n`);

    // Migrate Violations
    console.log('⚠️  Migrating Violations...');
    const mongoViolations = await ViolationMongo.find();
    console.log(`   Found ${mongoViolations.length} violations in MongoDB`);

    let migratedViolations = 0;
    for (const violation of mongoViolations) {
      try {
        const examId = examIdMap.get(violation.exam.toString());
        const studentUser = await User.findOne({
          where: { email: violation.student.email }
        });

        if (!examId || !studentUser) continue;

        await Violation.create({
          examId,
          studentId: studentUser.id,
          type: violation.type,
          severity: violation.severity,
          details: violation.details || '',
          timestamp: violation.timestamp
        });
        migratedViolations++;
      } catch (err) {
        console.error(`   ❌ Failed to migrate violation: ${err.message}`);
      }
    }
    console.log(`✅ Migrated ${migratedViolations}/${mongoViolations.length} violations\n`);

    // Migrate Restrictions
    console.log('🚫 Migrating Restrictions...');
    const mongoRestrictions = await RestrictionMongo.find();
    console.log(`   Found ${mongoRestrictions.length} restrictions in MongoDB`);

    let migratedRestrictions = 0;
    for (const restriction of mongoRestrictions) {
      try {
        const examId = examIdMap.get(restriction.exam.toString());
        const studentUser = await User.findOne({
          where: { email: restriction.student.email }
        });
        const imposedByUser = restriction.imposedBy ? await User.findOne({
          where: { email: restriction.imposedBy.email }
        }) : null;

        if (!examId || !studentUser) continue;

        await Restriction.create({
          studentId: studentUser.id,
          examId,
          reason: restriction.reason,
          restrictedAt: restriction.restrictedAt,
          expiresAt: restriction.expiresAt,
          isActive: restriction.isActive,
          violationCount: restriction.violationCount,
          imposedById: imposedByUser?.id || null
        });
        migratedRestrictions++;
      } catch (err) {
        console.error(`   ❌ Failed to migrate restriction: ${err.message}`);
      }
    }
    console.log(`✅ Migrated ${migratedRestrictions}/${mongoRestrictions.length} restrictions\n`);

    console.log('✅✅✅ Migration completed successfully! ✅✅✅\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${migratedUsers}/${mongoUsers.length}`);
    console.log(`   - Exams: ${migratedExams}/${mongoExams.length}`);
    console.log(`   - Submissions: ${migratedSubmissions}/${mongoSubmissions.length}`);
    console.log(`   - Violations: ${migratedViolations}/${mongoViolations.length}`);
    console.log(`   - Restrictions: ${migratedRestrictions}/${mongoRestrictions.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await mongoose.disconnect();
    await sequelize.close();
    process.exit(0);
  }
};

migrate();
