import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as trackerService from '../services/trackerService';

export const getTrackerController = async (req: AuthRequest, res: Response) => {
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

    const result = await trackerService.getTrackerData(filters, search);
    if (result && typeof result === 'object' && 'data' in result && 'totalRecords' in result) {
      res.json(result);
    } else {
      res.json(Array.isArray(result) ? result : []);
    }
  } catch (error) {
    console.error('Get tracker error:', error);
    res.status(500).json({ error: 'Failed to fetch tracker data' });
  }
};