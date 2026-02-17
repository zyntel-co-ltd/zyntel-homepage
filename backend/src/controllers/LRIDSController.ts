import { Request, Response } from 'express';
import * as lridsService from '../services/lridsService';

export const getLRIDSController = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const data = await lridsService.getLRIDSData(limit);
    res.json(data);
  } catch (error) {
    console.error('Get LRIDS error:', error);
    res.status(500).json({ error: 'Failed to fetch LRIDS data' });
  }
};