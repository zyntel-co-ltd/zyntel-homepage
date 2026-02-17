import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as numbersService from '../services/numbersService';

export const getNumbersController = async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as string,
      labSection: req.query.labSection as string,
      shift: req.query.shift as string,
      laboratory: req.query.laboratory as string,
    };

    const data = await numbersService.getNumbersData(filters);
    res.json(data);
  } catch (error: any) {
    console.error('Get numbers error:', error?.message ?? error);
    const body: { error: string; detail?: string } = { error: 'Failed to fetch numbers data' };
    if (process.env.NODE_ENV !== 'production') body.detail = error?.message;
    res.status(500).json(body);
  }
};