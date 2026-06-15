import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { startSubmission, saveAnswers, submitExam, getMySubmissions, getExamSubmissions } from '../controllers/submissionController.js';

const router = express.Router();

router.post('/start/:examId', protect, startSubmission);
router.put('/:id/save',      protect, saveAnswers);
router.put('/:id/submit',    protect, submitExam);
router.get('/my',             protect, getMySubmissions);
router.get('/exam/:examId',   protect, getExamSubmissions);

export default router;
