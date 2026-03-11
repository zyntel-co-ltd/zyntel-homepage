import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as auditService from '../services/auditService';

export const getAuditLogsController = async (req: AuthRequest, res: Response) => {
  try {
    const { action, userId, startDate, endDate, limit, offset } = req.query;
    const result = await auditService.getAuditLogs({
      action: action as string,
      userId: userId ? parseInt(userId as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    // If table doesn't exist (migration not run), return empty
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return res.json({ rows: [], total: 0 });
    }
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

export const getLoginAuditController = async (req: AuthRequest, res: Response) => {
  try {
    const { username, success, startDate, endDate, limit, offset } = req.query;
    const result = await auditService.getLoginAudit({
      username: username as string,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Get login audit error:', error);
    // If table doesn't exist (migration not run), return empty
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return res.json({ rows: [], total: 0 });
    }
    res.status(500).json({ error: 'Failed to fetch login audit' });
  }
};
