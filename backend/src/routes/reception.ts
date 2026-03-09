import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import {
  getReceptionController,
  updateTestStatusController,
  cancelTestController,
  uncancelTestController,
  bulkUpdateController,
} from '../controllers/receptionController';

const router = express.Router();

// All reception routes require authentication
router.use(authenticate);

router.get('/', getReceptionController);
router.put('/:id/status', updateTestStatusController);
router.post('/:id/cancel', cancelTestController);
router.post('/:id/uncancel', requireRole('admin'), uncancelTestController);
router.post('/bulk-update', bulkUpdateController);
router.post('/update-bulk', bulkUpdateController); // alias for frontend

export default router;