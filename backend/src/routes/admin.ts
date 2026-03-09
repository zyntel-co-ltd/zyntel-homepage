import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import {
  getUnmatchedTestsController,
  resolveUnmatchedTestController,
  getDashboardStatsController,
  addUnmatchedToMetaController,
  addMultipleUnmatchedToMetaController,
  getCancellationAnalyticsController,
} from '../controllers/adminController';
import {
  getUsersController,
  createUserController,
  updateUserController,
  deleteUserController,
  resetPasswordController,
} from '../controllers/authController';
import {
  setMonthlyTargetController,
  setTestsTargetController,
  setNumbersTargetController,
} from '../controllers/settingsController';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin', 'manager'));

// User management
router.get('/users', getUsersController);
router.post('/users', createUserController);
router.put('/users/:id', updateUserController);
router.delete('/users/:id', requireRole('admin'), deleteUserController);
router.post('/users/:id/reset-password', requireRole('admin'), resetPasswordController);
router.post('/users/:id/toggle-active', (req, res) => {
  req.body = { is_active: req.body?.is_active };
  updateUserController(req as any, res);
});

// Targets (extract from Admin's payload shape and delegate to settings)
router.post('/targets/revenue', (req, res) => {
  const { monthlyTarget } = req.body;
  req.body = monthlyTarget ? { month: monthlyTarget.month, year: monthlyTarget.year, target: monthlyTarget.target } : req.body;
  setMonthlyTargetController(req as any, res);
});
router.post('/targets/tests', (req, res) => {
  const { testsTarget } = req.body;
  req.body = testsTarget ? { month: testsTarget.month, year: testsTarget.year, target: testsTarget.target } : req.body;
  setTestsTargetController(req as any, res);
});
router.post('/targets/numbers', (req, res) => {
  const { numbersTarget } = req.body;
  req.body = numbersTarget ? { month: numbersTarget.month, year: numbersTarget.year, target: numbersTarget.target } : req.body;
  setNumbersTargetController(req as any, res);
});

// Unmatched tests and stats
router.get('/unmatched-tests', getUnmatchedTestsController);
router.post('/unmatched-tests/:id/resolve', resolveUnmatchedTestController);
router.post('/unmatched-tests/:id/add-to-meta', addUnmatchedToMetaController);
router.post('/unmatched-tests/add-multiple-to-meta', addMultipleUnmatchedToMetaController);
router.get('/stats', getDashboardStatsController);
router.get('/cancellation-analytics', getCancellationAnalyticsController);

export default router;