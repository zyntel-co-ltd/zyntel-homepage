import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as progressService from '../services/progressService';

export const getProgressController = async (req: AuthRequest, res: Response) => {
  try {
    const limitParam = req.query.limit;
    const pageParam = req.query.page;
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as string,
      labSection: req.query.labSection as string,
      shift: req.query.shift as string,
      laboratory: req.query.laboratory as string,
      ...(limitParam != null && { limit: limitParam }),
      ...(pageParam != null && pageParam !== '' && { page: pageParam }),
    };

    const data = await progressService.getProgressData(filters);
    res.json(data);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
};