import express from 'express';
import { authenticate } from '../middleware/auth';
import { getTestsByLabNoController } from '../controllers/encountersController';

const router = express.Router();

router.use(authenticate);

router.get('/:labNo/tests', getTestsByLabNoController);

export default router;
