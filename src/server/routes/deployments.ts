import express from 'express';
import { deploymentsDb, mcpServersDb, generatedServersDb } from '../database.js';
import { spawn, ChildProcess } from 'child_process';

const router = express.Router();

// Store running processes
const runningProcesses = new Map<string, ChildProcess>();

// Helper to get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Get deployment for a server
router.get('/server/:serverId', (req, res) => {
  try {
    const deployment = deploymentsDb.findByServerId(req.params.serverId);

    res.json({
      success: true,
      data: deployment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: getErrorMessage(error),
    });
  }
});

// Deploy MCP server
router.post('/:serverId/deploy', async (req, res) => {
  try {
    const server = mcpServersDb.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found',
      });
    }

    // Check if server code is generated
    const generatedServer = generatedServersDb.findByServerId(req.params.serverId);
    if (!generatedServer) {
      return res.status(400).json({
        success: false,
        error: 'Server code not generated. Please generate the server first.',
      });
    }

    // Check if already deployed
    const existingDeployment = deploymentsDb.findByServerId(req.params.serverId);
    if (existingDeployment && existingDeployment.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Server is already running',
      });
    }

    // Install dependencies first
    console.log(`[${server.name}] Installing dependencies...`);
    const installProcess = spawn('npm', ['install'], {
      cwd: generatedServer.path,
    });

    let installLogs = '';
    installProcess.stdout?.on('data', (data) => {
      installLogs += data.toString();
    });
    installProcess.stderr?.on('data', (data) => {
      installLogs += data.toString();
    });

    installProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[${server.name}] Installation failed:`, installLogs);
        return res.status(500).json({
          success: false,
          error: 'Failed to install dependencies. Check server logs for details.',
        });
      }

      console.log(`[${server.name}] Building server...`);
      // Build the server
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: generatedServer.path,
      });

      let buildLogs = '';
      buildProcess.stdout?.on('data', (data) => {
        buildLogs += data.toString();
      });
      buildProcess.stderr?.on('data', (data) => {
        buildLogs += data.toString();
      });

      buildProcess.on('close', (buildCode) => {
        if (buildCode !== 0) {
          console.error(`[${server.name}] Build failed:`, buildLogs);
          return res.status(500).json({
            success: false,
            error: 'Failed to build server. Check server logs for details.',
          });
        }

        console.log(`[${server.name}] Starting server...`);
        // Start the server
        const env = { ...process.env };
        // Set PORT explicitly from server config for HTTP transport
        if (server.httpConfig?.port) {
          env.PORT = server.httpConfig.port.toString();
        }

        const serverProcess = spawn('npm', ['start'], {
          cwd: generatedServer.path,
          env,
        });

        const logs: string[] = [];

        serverProcess.stdout?.on('data', (data) => {
          const log = data.toString();
          logs.push(log);
          console.log(`[${server.name}] ${log}`);
        });

        serverProcess.stderr?.on('data', (data) => {
          const log = data.toString();
          logs.push(log);
          console.error(`[${server.name}] ERROR: ${log}`);
        });

        serverProcess.on('error', (error) => {
          console.error(`[${server.name}] Process error:`, error);
        });

        // Save deployment
        const deploymentId = crypto.randomUUID();
        const deploymentData = {
          id: deploymentId,
          mcpServerId: req.params.serverId,
          status: 'running' as const,
          processId: serverProcess.pid,
          logs,
          startedAt: new Date().toISOString(),
        };

        deploymentsDb.create(deploymentData);

        // Store process reference
        runningProcesses.set(req.params.serverId, serverProcess);

        console.log(`[${server.name}] Deployment completed successfully`);
        res.json({
          success: true,
          data: {
            id: deploymentId,
            status: 'running',
            processId: serverProcess.pid,
          },
          message: 'Server deployed successfully. Installation, build, and startup completed.',
        });
      });
    });
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error),
    });
  }
});

// Stop deployment
router.post('/:serverId/stop', async (req, res) => {
  try {
    const deployment = deploymentsDb.findByServerId(req.params.serverId);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'No deployment found for this server. The server may not have been deployed yet.',
      });
    }

    if (deployment.status !== 'running') {
      return res.status(400).json({
        success: false,
        error: `Server is not running (current status: ${deployment.status})`,
      });
    }

    // Kill the process
    const process = runningProcesses.get(req.params.serverId);
    if (process) {
      process.kill();
      runningProcesses.delete(req.params.serverId);
    }

    // Update deployment
    deploymentsDb.update(deployment.id, {
      ...deployment,
      status: 'stopped',
      stoppedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Server stopped successfully',
    });
  } catch (error) {
    console.error('Error stopping deployment:', error);
    res.status(500).json({
      success: false,
      error: getErrorMessage(error),
    });
  }
});

export default router;
