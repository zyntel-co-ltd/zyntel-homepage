import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as receptionService from '../services/receptionService';

export const getReceptionController = async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as string,
      labSection: req.query.labSection as string,
      shift: req.query.shift as string,
      laboratory: req.query.laboratory as string,
      page: req.query.page,
      limit: req.query.limit,
    };

    const search = req.query.search as string;

    const result = await receptionService.getReceptionData(filters, search);
    if (result && typeof result === 'object' && 'data' in result && 'totalRecords' in result) {
      res.json(result);
    } else {
      res.json(Array.isArray(result) ? result : []);
    }
  } catch (error: any) {
    console.error('Get reception error:', error?.message ?? error);
    const body: { error: string; detail?: string } = { error: 'Failed to fetch reception data' };
    if (process.env.NODE_ENV !== 'production') body.detail = error?.message;
    res.status(500).json(body);
  }
};

export const updateTestStatusController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user!.userId;

    const result = await receptionService.updateTestStatus(
      parseInt(id),
      updates,
      userId
    );

    res.json(result);
  } catch (error) {
    console.error('Update test status error:', error);
    res.status(500).json({ error: 'Failed to update test status' });
  }
};

export const cancelTestController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.userId;

    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    const result = await receptionService.cancelTest(
      parseInt(id),
      reason,
      userId
    );

    res.json(result);
  } catch (error) {
    console.error('Cancel test error:', error);
    res.status(500).json({ error: 'Failed to cancel test' });
  }
};

export const bulkUpdateController = async (req: AuthRequest, res: Response) => {
  try {
    const { testIds, action } = req.body;
    const userId = req.user!.userId;

    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ error: 'Test IDs are required' });
    }

    if (!['urgent', 'receive', 'result'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const results = await receptionService.bulkUpdateTests(testIds, action, userId);
    res.json(results);
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update tests' });
  }
};