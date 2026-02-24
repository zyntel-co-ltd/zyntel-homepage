import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as adminService from '../services/adminService';

export const getUnmatchedTestsController = async (req: AuthRequest, res: Response) => {
  try {
    const tests = await adminService.getUnmatchedTests();
    res.json(tests);
  } catch (error) {
    console.error('Get unmatched tests error:', error);
    res.status(500).json({ error: 'Failed to fetch unmatched tests' });
  }
};

export const resolveUnmatchedTestController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const result = await adminService.resolveUnmatchedTest(parseInt(id), userId);
    res.json(result);
  } catch (error) {
    console.error('Resolve unmatched test error:', error);
    res.status(500).json({ error: 'Failed to resolve unmatched test' });
  }
};

export const addUnmatchedToMetaController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { labSection, tat, price } = req.body;
    const userId = req.user!.userId;

    if (!labSection || tat === undefined || price === undefined) {
      return res.status(400).json({ error: 'labSection, tat, and price are required' });
    }

    const result = await adminService.addUnmatchedToMeta(
      parseInt(id),
      String(labSection),
      parseInt(tat) || 60,
      parseFloat(price) || 0,
      userId
    );
    res.json(result);
  } catch (error: any) {
    console.error('Add unmatched to meta error:', error);
    res.status(500).json({ error: error.message || 'Failed to add to Meta' });
  }
};

export const addMultipleUnmatchedToMetaController = async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;
    const userId = req.user!.userId;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const results = await adminService.addMultipleUnmatchedToMeta(
      items.map((i: any) => ({
        id: parseInt(i.id),
        labSection: String(i.labSection || 'CHEMISTRY'),
        tat: parseInt(i.tat) || 60,
        price: parseFloat(i.price) || 0,
      })),
      userId
    );
    res.json({ results });
  } catch (error: any) {
    console.error('Add multiple unmatched to meta error:', error);
    res.status(500).json({ error: error.message || 'Failed to add to Meta' });
  }
};

export const getDashboardStatsController = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};