import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as encountersService from '../services/encountersService';

export const getTestsByLabNoController = async (req: AuthRequest, res: Response) => {
  try {
    const labNo = req.params.labNo;
    if (!labNo) {
      res.status(400).json({ error: 'Lab number is required' });
      return;
    }
    const tests = await encountersService.getTestsByLabNo(labNo);
    res.json(tests);
  } catch (error) {
    console.error('Get tests by lab number error:', error);
    res.status(500).json({ error: 'Failed to fetch tests for lab number' });
  }
};
