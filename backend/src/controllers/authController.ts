import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as authService from '../services/authService';
import * as auditService from '../services/auditService';

export const loginController = async (req: AuthRequest, res: Response) => {
  const identifier = (req.body.username ?? req.body.email)?.trim?.() ?? '';
  const password = req.body.password;

  try {
    if (!identifier || !password) {
      await auditService.logLogin({ username: identifier || '(empty)', success: false, req });
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const result = await authService.login(identifier, password);
    await auditService.logLogin({
      username: identifier,
      userId: result.user.id,
      success: true,
      req,
    });
    res.json(result);
  } catch (error: any) {
    await auditService.logLogin({
      username: identifier || '(empty)',
      success: false,
      req,
    }).catch((e) => console.error('Audit log failed:', e));
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
};

export const getUsersController = async (req: AuthRequest, res: Response) => {
  try {
    const users = await authService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUserController = async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, role } = req.body;
    const createdBy = req.user!.userId;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    const user = await authService.createUser(username, email, password, role, createdBy);
    res.status(201).json(user);
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
};

export const updateUserController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedBy = req.user!.userId;

    const user = await authService.updateUser(parseInt(id), updates, updatedBy);
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUserController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user!.userId;

    await authService.deleteUser(parseInt(id), deletedBy);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const requestPasswordResetController = async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }
    const users = await authService.getAllUsers();
    const user = users.find((u: any) => u.username === username.trim());
    if (!user) {
      return res.status(404).json({ error: 'No user found with that username. Contact your administrator.' });
    }
    res.json({
      message: 'Contact your administrator to reset your password. Administrators can reset passwords in Admin > Users.',
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const resetPasswordController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword, password } = req.body;
    const resetBy = req.user!.userId;
    const newPass = newPassword ?? password;

    if (!newPass) {
      return res.status(400).json({ error: 'New password is required' });
    }

    await authService.resetPassword(parseInt(id), newPass, resetBy);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};