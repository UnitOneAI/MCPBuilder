import express from 'express';
import { apiConfigsDb } from '../database.js';
import { ApiConfigSchema } from '../../types/index.js';

const router = express.Router();

// Get all API configurations
router.get('/', (req, res) => {
  try {
    const configs = apiConfigsDb.findAll();
    res.json({
      success: true,
      data: configs,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get API configuration by ID
router.get('/:id', (req, res) => {
  try {
    const config = apiConfigsDb.findById(req.params.id);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'API configuration not found',
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create new API configuration
router.post('/', (req, res) => {
  try {
    const validated = ApiConfigSchema.parse(req.body);
    const id = crypto.randomUUID();

    apiConfigsDb.create({
      id,
      ...validated,
    });

    const created = apiConfigsDb.findById(id);

    res.status(201).json({
      success: true,
      data: created,
      message: 'API configuration created successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Update API configuration
router.put('/:id', (req, res) => {
  try {
    const existing = apiConfigsDb.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'API configuration not found',
      });
    }

    const validated = ApiConfigSchema.parse(req.body);
    apiConfigsDb.update(req.params.id, validated);

    const updated = apiConfigsDb.findById(req.params.id);

    res.json({
      success: true,
      data: updated,
      message: 'API configuration updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete API configuration
router.delete('/:id', (req, res) => {
  try {
    const existing = apiConfigsDb.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'API configuration not found',
      });
    }

    apiConfigsDb.delete(req.params.id);

    res.json({
      success: true,
      message: 'API configuration deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
