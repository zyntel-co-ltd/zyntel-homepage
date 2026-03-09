import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import {
  getTestsController,
  getSingleTestAnalyticsController,
  getTestNamesController,
} from '../controllers/testsController';

const router = express.Router();

// Tests routes - exclude viewer and technician
router.use(authenticate);
router.use(requireRole('admin', 'manager'));

router.get('/names', getTestNamesController);
router.get('/:testName/analytics', getSingleTestAnalyticsController);
router.get('/', getTestsController);

export default router;