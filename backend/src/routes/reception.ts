import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getReceptionController,
  updateTestStatusController,
  cancelTestController,
  bulkUpdateController,
} from '../controllers/receptionController';

const router = express.Router();

// All reception routes require authentication
router.use(authenticate);

router.get('/', getReceptionController);
router.put('/:id/status', updateTestStatusController);
router.post('/:id/cancel', cancelTestController);
router.post('/bulk-update', bulkUpdateController);
router.post('/update-bulk', bulkUpdateController); // alias for frontend

export default router;