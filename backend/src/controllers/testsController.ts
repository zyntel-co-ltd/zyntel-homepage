import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as testsService from '../services/testsService';
import * as testAnalyticsService from '../services/testAnalyticsService';

export const getTestsController = async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as string,
      labSection: req.query.labSection as string,
      shift: req.query.shift as string,
      laboratory: req.query.laboratory as string,
      testName: req.query.testName as string,
    };

    const data = await testsService.getTestsData(filters);
    res.json(data);
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ error: 'Failed to fetch tests data' });
  }
};

export const getSingleTestAnalyticsController = async (req: AuthRequest, res: Response) => {
  try {
    const { testName } = req.params;
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as string,
      labSection: req.query.labSection as string,
      shift: req.query.shift as string,
      laboratory: req.query.laboratory as string,
    };

    const data = await testAnalyticsService.getSingleTestAnalytics(testName, filters);
    res.json(data);
  } catch (error) {
    console.error('Get single test analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch test analytics' });
  }
};

export const getTestNamesController = async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string;
    const names = await testAnalyticsService.getTestNamesForSearch(search);
    res.json(names);
  } catch (error) {
    console.error('Get test names error:', error);
    res.status(500).json({ error: 'Failed to fetch test names' });
  }
};