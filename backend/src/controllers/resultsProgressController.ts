import { Request, Response } from 'express';
import { getResultsByLabNo } from '../services/resultsProgressService';

export const getResultsByLabNoController = async (req: Request, res: Response) => {
  try {
    const labNo = (req.params.labNo || '').trim();
    const result = await getResultsByLabNo(labNo);
    res.json(result);
  } catch (error: any) {
    console.error('Results progress error:', error?.message ?? error);
    const message = error?.message || 'Failed to fetch results';
    res.status(500).json({ error: message });
  }
};
