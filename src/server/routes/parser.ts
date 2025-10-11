import express from 'express';
import { ApiParser } from '../../generator/ApiParser.js';

const router = express.Router();
const parser = new ApiParser();

// Parse OpenAPI specification
router.post('/openapi', async (req, res) => {
  try {
    const { spec } = req.body;

    if (!spec) {
      return res.status(400).json({
        success: false,
        error: 'OpenAPI specification is required',
      });
    }

    const result = await parser.parseOpenApi(spec);

    res.json({
      success: true,
      data: result,
      message: 'OpenAPI specification parsed successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Parse API documentation
router.post('/documentation', async (req, res) => {
  try {
    const { documentation } = req.body;

    if (!documentation) {
      return res.status(400).json({
        success: false,
        error: 'API documentation is required',
      });
    }

    const result = parser.parseDocumentation(documentation);

    res.json({
      success: true,
      data: result,
      message: 'API documentation parsed successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Parse Postman collection
router.post('/postman', async (req, res) => {
  try {
    const { collection } = req.body;

    if (!collection) {
      return res.status(400).json({
        success: false,
        error: 'Postman collection is required',
      });
    }

    // Check payload size (rough estimate: 10MB max for JSON string)
    const payloadSize = JSON.stringify(collection).length;
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (payloadSize > maxSize) {
      return res.status(413).json({
        success: false,
        error: `Collection too large (${(payloadSize / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB. Consider breaking it into smaller collections or selecting specific folders.`,
      });
    }

    const result = await parser.parsePostmanCollection(collection);

    // Warn if too many endpoints
    let warning: string | undefined;
    if (result.endpoints && result.endpoints.length > 500) {
      warning = `Collection contains ${result.endpoints.length} endpoints. Consider filtering to only the endpoints you need for better performance.`;
    }

    res.json({
      success: true,
      data: result,
      message: 'Postman collection parsed successfully',
      warning,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
