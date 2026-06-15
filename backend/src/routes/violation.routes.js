import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { logViolation, getExamViolations, getMyViolations, getRestrictions } from '../controllers/violationController.js';

const router = express.Router();

router.post('/',                      protect, logViolation);
router.get('/exam/:examId',           protect, getExamViolations);
router.get('/my/:examId',             protect, getMyViolations);
router.get('/restrictions/:examId',   protect, getRestrictions);

export default router;
