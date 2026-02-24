import express from 'express';
import { loginController, requestPasswordResetController } from '../controllers/authController';

const router = express.Router();

router.post('/login', loginController);
router.post('/request-password-reset', requestPasswordResetController);

export default router;