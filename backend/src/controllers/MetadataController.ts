import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as metadataService from '../services/metadataService';

export const getMetadataController = async (req: AuthRequest, res: Response) => {
  try {
    const { labSection, search, page, limit } = req.query;

    const result = await metadataService.getAllMetadata({
      labSection: labSection as string,
      search: search as string,
      page: page as string,
      limit: limit as string,
    });

    if (result && typeof result === 'object' && 'data' in result && 'totalRecords' in result) {
      res.json(result);
    } else {
      res.json(Array.isArray(result) ? result : []);
    }
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
};

export const createMetadataController = async (req: AuthRequest, res: Response) => {
  try {
    const { testName, price, tat, labSection } = req.body;
    const createdBy = req.user!.userId;

    if (!testName || price === undefined || tat === undefined || !labSection) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const metadata = await metadataService.createMetadata(
      testName,
      parseFloat(price),
      parseInt(tat),
      labSection,
      createdBy
    );

    // Export to CSV
    await metadataService.exportMetadataToCSV();

    res.status(201).json(metadata);
  } catch (error: any) {
    console.error('Create metadata error:', error);
    res.status(500).json({ error: error.message || 'Failed to create metadata' });
  }
};

export const updateMetadataController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { testName, price, tat, labSection, reason } = req.body;
    const updatedBy = req.user!.userId;

    const updates: any = {};
    if (testName !== undefined) updates.testName = testName;
    if (price !== undefined) updates.price = parseFloat(price);
    if (tat !== undefined) updates.tat = parseInt(tat);
    if (labSection !== undefined) updates.labSection = labSection;

    const metadata = await metadataService.updateMetadata(
      parseInt(id),
      updates,
      updatedBy,
      reason
    );

    // Export to CSV
    await metadataService.exportMetadataToCSV();

    res.json(metadata);
  } catch (error) {
    console.error('Update metadata error:', error);
    res.status(500).json({ error: 'Failed to update metadata' });
  }
};

export const deleteMetadataController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user!.userId;

    await metadataService.deleteMetadata(parseInt(id), deletedBy);

    // Export to CSV
    await metadataService.exportMetadataToCSV();

    res.json({ message: 'Metadata deleted successfully' });
  } catch (error) {
    console.error('Delete metadata error:', error);
    res.status(500).json({ error: 'Failed to delete metadata' });
  }
};

export const cleanDefaultsController = async (req: AuthRequest, res: Response) => {
  try {
    const cleaned = await metadataService.cleanDefaultMetadata();
    await metadataService.exportMetadataToCSV();
    res.json({ message: `Cleaned ${cleaned.length} default entries`, cleaned });
  } catch (error) {
    console.error('Clean defaults error:', error);
    res.status(500).json({ error: 'Failed to clean defaults' });
  }
};