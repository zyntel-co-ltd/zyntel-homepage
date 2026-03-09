import express from 'express';
import { getResultsByLabNoController } from '../controllers/resultsProgressController';

const router = express.Router();

// Public - no auth. Patient-facing results lookup by lab number.
router.get('/:labNo', getResultsByLabNoController);

export default router;
