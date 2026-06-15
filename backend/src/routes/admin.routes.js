import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getFacultyList,
  createFaculty,
  toggleFacultyStatus,
  resetFacultyPassword,
  deleteFaculty,
  testEmail
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes are protected and restricted to 'admin' role
router.use(protect);
router.use(adminOnly);

router.post('/test-email', testEmail);

router.route('/faculty')
  .get(getFacultyList)
  .post(createFaculty);

router.route('/faculty/:id/status')
  .patch(toggleFacultyStatus);

router.route('/faculty/:id/reset-password')
  .post(resetFacultyPassword);

router.route('/faculty/:id')
  .delete(deleteFaculty);

export default router;
