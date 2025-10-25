import express from 'express';
import { mcpServersDb, apiConfigsDb, generatedServersDb, deploymentsDb } from '../database.js';
import { McpServerConfigSchema } from '../../types/index.js';
import { McpGenerator } from '../../generator/McpGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteServerLogs } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const generator = new McpGenerator();

// Get all MCP servers
router.get('/', (req, res) => {
  try {
    const servers = mcpServersDb.findAll();

    // Enrich each server with generated_path and deployment status
    const enrichedServers = servers.map((server: any) => {
      const generatedServer = generatedServersDb.findByServerId(server.id);
      const deployment = deploymentsDb.findByServerId(server.id);
      return {
        ...server,
        generated_path: generatedServer?.path || null,
        deployment_status: deployment?.status || null,
        is_running: deployment?.status === 'running',
      };
    });

    res.json({
      success: true,
      data: enrichedServers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get MCP server by ID
router.get('/:id', (req, res) => {
  try {
    const server = mcpServersDb.findById(req.params.id);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found',
      });
    }

    // Fetch associated API config
    const apiConfig = apiConfigsDb.findById(server.api_config_id);

    // Fetch generated server info if available
    const generatedServer = generatedServersDb.findByServerId(server.id);

    res.json({
      success: true,
      data: {
        ...server,
        api_base_url: apiConfig?.base_url,
        api_auth_type: apiConfig?.auth_type,
        api_auth_config: apiConfig?.authConfig,
        api_name: apiConfig?.name,
        generated_path: generatedServer?.path,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create new MCP server
router.post('/', (req, res) => {
  try {
    const validated = McpServerConfigSchema.parse(req.body);
    const id = crypto.randomUUID();

    // Verify API config exists
    const apiConfig = apiConfigsDb.findById(validated.apiConfigId);
    if (!apiConfig) {
      return res.status(404).json({
        success: false,
        error: 'API configuration not found',
      });
    }

    mcpServersDb.create({
      id,
      ...validated,
    });

    const created = mcpServersDb.findById(id);

    res.status(201).json({
      success: true,
      data: created,
      message: 'MCP server configuration created successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Update MCP server
router.put('/:id', (req, res) => {
  try {
    const existing = mcpServersDb.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found',
      });
    }

    const validated = McpServerConfigSchema.parse(req.body);
    mcpServersDb.update(req.params.id, validated);

    const updated = mcpServersDb.findById(req.params.id);

    res.json({
      success: true,
      data: updated,
      message: 'MCP server updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete MCP server
router.delete('/:id', async (req, res) => {
  try {
    const existing = mcpServersDb.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found',
      });
    }

    const apiConfigId = existing.api_config_id;

    // First, stop any running deployment
    const deployment = deploymentsDb.findByServerId(req.params.id);
    if (deployment && deployment.status === 'running' && deployment.process_id) {
      try {
        process.kill(deployment.process_id, 'SIGTERM');
        console.log(`Stopped deployment process ${deployment.process_id} for server ${req.params.id}`);
        // Update deployment status
        deploymentsDb.update(deployment.id, {
          status: 'stopped' as const,
          stoppedAt: new Date().toISOString(),
        });
      } catch (killError: any) {
        console.error(`Failed to stop process ${deployment.process_id}:`, killError.message);
        // Continue with deletion even if process kill fails
      }
    }

    // Delete deployment record if exists
    if (deployment) {
      deploymentsDb.delete(deployment.id);
      console.log(`Deleted deployment record for server ${req.params.id}`);
    }

    // Delete all log files for this server
    deleteServerLogs(req.params.id);
    console.log(`Deleted log files for server ${req.params.id}`);

    // Check if there's generated code to delete
    const generatedServer = generatedServersDb.findByServerId(req.params.id);
    if (generatedServer) {
      // Delete the generated server directory
      const fs = await import('fs/promises');
      try {
        await fs.rm(generatedServer.path, { recursive: true, force: true });
        console.log(`Deleted generated server directory: ${generatedServer.path}`);
      } catch (fsError: any) {
        console.error(`Failed to delete directory: ${fsError.message}`);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Check if API config is used by any other servers (before deleting this one)
    const otherServersUsingConfig = mcpServersDb.findAll().filter(
      (s: any) => s.api_config_id === apiConfigId && s.id !== req.params.id
    );

    // Delete from database (CASCADE will delete related records)
    mcpServersDb.delete(req.params.id);

    // If no other servers use this API config, delete it
    if (otherServersUsingConfig.length === 0 && apiConfigId) {
      apiConfigsDb.delete(apiConfigId);
      console.log(`Deleted orphaned API config: ${apiConfigId}`);
    }

    res.json({
      success: true,
      message: 'MCP server, generated files, and unused API config deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Generate MCP server code
router.post('/:id/generate', async (req, res) => {
  try {
    const server = mcpServersDb.findById(req.params.id);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found',
      });
    }

    const apiConfig = apiConfigsDb.findById(server.api_config_id);
    if (!apiConfig) {
      return res.status(404).json({
        success: false,
        error: 'API configuration not found',
      });
    }

    // Check if server already generated
    const existingGenerated = generatedServersDb.findByServerId(req.params.id);

    // If already generated, regenerate (idempotent operation)
    if (existingGenerated) {
      console.log(`[${server.name}] Server already generated, regenerating...`);

      // Delete existing generated files
      const fs = await import('fs/promises');
      try {
        await fs.rm(existingGenerated.path, { recursive: true, force: true });
        console.log(`[${server.name}] Deleted existing generated files at ${existingGenerated.path}`);
      } catch (fsError: any) {
        console.error(`[${server.name}] Failed to delete existing files:`, fsError.message);
        // Continue with regeneration even if deletion fails
      }

      // Reset deployment phase so rebuild will run install and build again
      const existingDeployment = deploymentsDb.findByServerId(req.params.id);
      if (existingDeployment && existingDeployment.status === 'ready') {
        console.log(`[${server.name}] Resetting deployment phase to pending for rebuild`);
        deploymentsDb.update(existingDeployment.id, {
          ...existingDeployment,
          phase: 'pending',
        });
      }
    }

    // Generate server
    const outputDir = path.join(__dirname, '../../../generated-servers');
    const result = await generator.generate({
      apiConfig: {
        id: apiConfig.id,
        name: apiConfig.name,
        description: apiConfig.description,
        baseUrl: apiConfig.base_url,
        authType: apiConfig.auth_type as any,
        authConfig: apiConfig.authConfig,
        openApiSpec: apiConfig.open_api_spec || undefined,
        endpoints: apiConfig.endpoints,
      },
      serverConfig: {
        id: server.id,
        name: server.name,
        description: server.description,
        apiConfigId: server.api_config_id,
        transport: 'stdio', // Always use STDIO transport
        tools: server.tools,
        status: server.status as any,
      },
      outputDir,
      transport: 'stdio', // Always use STDIO transport
    });

    // Save or update generated server info (idempotent)
    if (existingGenerated) {
      // Update existing record
      console.log(`[${server.name}] Updating generated server record`);
      generatedServersDb.update(existingGenerated.id, {
        name: result.name,
        path: result.path,
        files: result.files,
      });
    } else {
      // Create new record
      generatedServersDb.create({
        id: result.id,
        mcpServerId: server.id,
        name: result.name,
        path: result.path,
        files: result.files,
      });
    }

    // Update server status
    mcpServersDb.update(req.params.id, {
      ...server,
      status: 'active',
    });

    res.json({
      success: true,
      data: result,
      message: existingGenerated
        ? 'MCP server regenerated successfully (idempotent operation)'
        : 'MCP server generated successfully',
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
