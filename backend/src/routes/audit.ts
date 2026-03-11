import express from 'express';
import { requireRole } from '../middleware/roleCheck';
import { getAuditLogsController, getLoginAuditController } from '../controllers/auditController';

const router = express.Router();

router.get('/logs', requireRole('admin'), getAuditLogsController);
router.get('/login', requireRole('admin'), getLoginAuditController);

export default router;
