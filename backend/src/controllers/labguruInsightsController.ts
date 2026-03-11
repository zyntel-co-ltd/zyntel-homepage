import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getLabGuruInsights, getLabGuruTestsFull } from '../services/labguruInsightsService';

export const getLabGuruInsightsController = async (req: AuthRequest, res: Response) => {
  try {
    const { period, startDate, endDate } = req.query;
    const result = await getLabGuruInsights({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    if ('error' in result && !('ourCount' in result)) {
      return res.status(500).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('LabGuru insights error:', error);
    res.status(500).json({ error: 'Failed to fetch LabGuru insights' });
  }
};

export const getLabGuruTestsFullController = async (req: AuthRequest, res: Response) => {
  try {
    const { period, startDate, endDate } = req.query;
    const result = await getLabGuruTestsFull({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    if ('error' in result && !('ourTests' in result)) {
      return res.status(500).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('LabGuru tests full error:', error);
    res.status(500).json({ error: 'Failed to fetch LabGuru tests' });
  }
};
