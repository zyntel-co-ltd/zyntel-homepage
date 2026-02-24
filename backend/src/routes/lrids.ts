import express from 'express';
import { getLRIDSController } from '../controllers/LRIDSController';

const router = express.Router();

// LRIDS is public (for waiting area displays)
// No authentication required
router.get('/', getLRIDSController);

export default router;