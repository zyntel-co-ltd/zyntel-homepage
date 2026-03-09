import express from 'express';
import { getLabGuruInsightsController, getLabGuruTestsFullController } from '../controllers/labguruInsightsController';
import { requireRole } from '../middleware/roleCheck';

const router = express.Router();

router.get('/', requireRole('admin', 'manager'), getLabGuruInsightsController);
router.get('/full', requireRole('admin', 'manager'), getLabGuruTestsFullController);

export default router;
