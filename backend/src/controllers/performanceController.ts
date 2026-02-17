import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as performanceService from '../services/performanceService';

export const getPerformanceController = async (req: AuthRequest, res: Response) => {
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

    const result = await performanceService.getPerformanceData(filters);
    if (result && typeof result === 'object' && 'data' in result && 'totalRecords' in result) {
      res.json(result);
    } else {
      res.json(Array.isArray(result) ? result : []);
    }
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
};