import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import {
  getMetadataController,
  createMetadataController,
  updateMetadataController,
  deleteMetadataController,
  cleanDefaultsController,
} from '../controllers/MetadataController';

const router = express.Router();

// All metadata routes require authentication
router.use(authenticate);

router.get('/', getMetadataController);
router.post('/', requireRole('admin', 'manager'), createMetadataController);
router.put('/:id', requireRole('admin', 'manager'), updateMetadataController);
router.delete('/:id', requireRole('admin'), deleteMetadataController);
router.post('/clean-defaults', requireRole('admin'), cleanDefaultsController);

export default router;