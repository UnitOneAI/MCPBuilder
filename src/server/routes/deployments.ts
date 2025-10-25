import express from 'express';
import { deploymentsDb, mcpServersDb, generatedServersDb } from '../database.js';
import { spawn, ChildProcess } from 'child_process';
import { readFile } from 'fs/promises';
import path from 'path';

const router = express.Router();

// Store running processes (only for HTTP/SSE transport servers)
const runningProcesses = new Map<string, ChildProcess>();

// Security: Define safe environment variables for spawned processes
const SAFE_ENV_VARS = ['PATH', 'NODE_ENV', 'HOME', 'USER'] as const;

// Security: Timeout limits for operations (in milliseconds)
const OPERATION_TIMEOUTS = {
  INSTALL: 5 * 60 * 1000,  // 5 minutes for npm install
  BUILD: 5 * 60 * 1000,    // 5 minutes for build
  START: 60 * 1000,        // 1 minute for startup verification
} as const;

// Helper to get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Creates a sanitized environment object for spawned processes.
 * Security: Only includes safe, non-sensitive environment variables.
 */
function createSafeEnvironment(additionalVars: Record<string, string> = {}): NodeJS.ProcessEnv {
  const safeEnv: NodeJS.ProcessEnv = {};

  // Copy only safe environment variables
  for (const key of SAFE_ENV_VARS) {
    if (process.env[key]) {
      safeEnv[key] = process.env[key];
    }
  }

  // Add any additional safe variables
  Object.assign(safeEnv, additionalVars);

  return safeEnv;
}

/**
 * Validates package.json for security concerns before execution.
 * Security: Detects potentially malicious scripts and dependencies.
 */
async function validatePackageJson(packageJsonPath: string): Promise<void> {
  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);

    // Check for potentially dangerous lifecycle scripts
    const dangerousScripts = ['preinstall', 'postinstall', 'preuninstall', 'postuninstall'];
    const scripts = packageJson.scripts || {};

    for (const scriptName of dangerousScripts) {
      if (scripts[scriptName]) {
        console.warn(`[Security] Warning: Found lifecycle script "${scriptName}" in package.json`);
      }
    }

    console.log(`[Security] Package.json validation passed for ${packageJsonPath}`);
  } catch (error) {
    console.error(`[Security] Failed to validate package.json:`, error);
    throw new Error(`Security validation failed: ${getErrorMessage(error)}`);
  }
}

/**
 * Spawns a process with timeout and proper cleanup.
 * Security: Enforces timeout limits and handles process lifecycle safely.
 */
function spawnWithTimeout(
  command: string,
  args: string[],
  options: any,
  timeoutMs: number
): Promise<{ code: number; logs: string }> {
  return new Promise((resolve, reject) => {
    let logs = '';
    let timedOut = false;

    const childProcess = spawn(command, args, options);

    // Set timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      childProcess.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill('SIGKILL');
        }
      }, 5000);

      reject(new Error(`Operation timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);

    // Capture output
    childProcess.stdout?.on('data', (data) => {
      logs += data.toString();
    });

    childProcess.stderr?.on('data', (data) => {
      logs += data.toString();
    });

    // Handle completion
    childProcess.on('close', (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        return; // Already rejected
      }

      if (code === 0) {
        resolve({ code, logs });
      } else {
        reject(new Error(`Process exited with code ${code}\n${logs}`));
      }
    });

    // Handle errors
    childProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Checks if a process is still running by its PID.
 * Uses signal 0 which doesn't actually send a signal but checks if the process exists.
 */
function isProcessRunning(pid: number | undefined): boolean {
  if (!pid) return false;

  try {
    // Signal 0 checks if process exists without actually sending a signal
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    if (error.code === 'ESRCH') {
      return false; // Process does not exist
    }
    if (error.code === 'EPERM') {
      return true; // Process exists but we don't have permission (still running)
    }
    return false;
  }
}

/**
 * Waits for a process to stabilize and confirms it's running.
 * Some processes exit immediately on startup errors, so we wait briefly to verify.
 */
async function verifyProcessStarted(pid: number, waitMs: number = 1000): Promise<{ running: boolean; message: string }> {
  await new Promise(resolve => setTimeout(resolve, waitMs));

  const running = isProcessRunning(pid);

  if (running) {
    return { running: true, message: 'Process started successfully and is running' };
  } else {
    return { running: false, message: 'Process started but exited immediately (likely configuration error)' };
  }
}

// Get deployment for a server
router.get('/server/:serverId', (req, res) => {
  try {
    const deployment = deploymentsDb.findByServerId(req.params.serverId);

    if (!deployment) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // Only verify process status for "running" deployments (HTTP/SSE servers)
    if (deployment.status === 'running') {
      const actuallyRunning = isProcessRunning(deployment.processId);

      if (!actuallyRunning) {
        console.warn(`[Deployment ${deployment.id}] Process PID ${deployment.processId} is no longer running, updating status`);

        deploymentsDb.update(deployment.id, {
          ...deployment,
          status: 'stopped',
          stoppedAt: new Date().toISOString(),
        });

        return res.json({
          success: true,
          data: {
            ...deployment,
            status: 'stopped',
            stoppedAt: new Date().toISOString(),
          },
        });
      }
    }

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

    const generatedServer = generatedServersDb.findByServerId(req.params.serverId);
    if (!generatedServer) {
      return res.status(400).json({
        success: false,
        error: 'Server code not generated. Please generate the server first.',
      });
    }

    // Check if already deployed
    const existingDeployment = deploymentsDb.findByServerId(req.params.serverId);

    // For HTTP/SSE: prevent if status is 'running' (can't deploy while running)
    // For STDIO: allow rebuild anytime (no running process to conflict with)
    const isStdio = server.transport === 'stdio';

    if (!isStdio && existingDeployment && existingDeployment.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Server is already running. Stop it first before redeploying.',
      });
    }

    // Security: Validate package.json before proceeding
    const packageJsonPath = path.join(generatedServer.path, 'package.json');
    console.log(`[${server.name}] Validating package.json for security...`);
    await validatePackageJson(packageJsonPath);

    // Create safe environment
    const safeEnv = createSafeEnvironment({
      NODE_ENV: 'production',
    });

    // Phase 1: Install dependencies with security hardening
    console.log(`[${server.name}] Installing dependencies (with security restrictions)...`);
    try {
      await spawnWithTimeout(
        'npm',
        [
          'install',
          '--ignore-scripts',     // Security: Prevent preinstall/postinstall script execution
          '--production',         // Only install production dependencies
          '--no-audit',
          '--no-fund',
        ],
        {
          cwd: generatedServer.path,
          env: safeEnv,
        },
        OPERATION_TIMEOUTS.INSTALL
      );
      console.log(`[${server.name}] Dependencies installed successfully`);
    } catch (error) {
      console.error(`[${server.name}] Installation failed:`, error);
      return res.status(500).json({
        success: false,
        error: `Failed to install dependencies: ${getErrorMessage(error)}`,
      });
    }

    // Phase 2: Build the server
    console.log(`[${server.name}] Building server...`);
    try {
      await spawnWithTimeout(
        'npm',
        ['run', 'build'],
        {
          cwd: generatedServer.path,
          env: safeEnv,
        },
        OPERATION_TIMEOUTS.BUILD
      );
      console.log(`[${server.name}] Build completed successfully`);
    } catch (error) {
      console.error(`[${server.name}] Build failed:`, error);
      return res.status(500).json({
        success: false,
        error: `Failed to build server: ${getErrorMessage(error)}`,
      });
    }

    // Transport-aware Phase 3: STDIO vs HTTP/SSE
    if (isStdio) {
      // STDIO: Build complete - server ready for MCP client to spawn
      console.log(`[${server.name}] STDIO server built and ready for MCP client connection`);

      const deploymentId = crypto.randomUUID();
      const deploymentData = {
        id: deploymentId,
        mcpServerId: req.params.serverId,
        status: 'ready' as const,
        processId: null,
        logs: [],
        startedAt: new Date().toISOString(),
      };

      deploymentsDb.create(deploymentData);

      return res.json({
        success: true,
        data: {
          id: deploymentId,
          status: 'ready',
          transport: 'stdio',
        },
        message: 'STDIO server built successfully and ready for MCP client connection. The server will be spawned by MCP clients (e.g., Claude Desktop) when they connect.',
      });
    } else {
      // HTTP/SSE: Start the server process
      console.log(`[${server.name}] Starting HTTP/SSE server...`);

      const serverProcess = spawn('npm', ['start'], {
        cwd: generatedServer.path,
        env: {
          ...safeEnv,
          ...(server.httpConfig?.port ? { PORT: server.httpConfig.port.toString() } : {}),
        },
      });

      const recentLogs: string[] = [];
      const MAX_LOG_LINES = 100;

      serverProcess.stdout?.on('data', (data) => {
        const log = data.toString();
        recentLogs.push(log);
        if (recentLogs.length > MAX_LOG_LINES) {
          recentLogs.shift();
        }
        console.log(`[${server.name}] ${log}`);
      });

      serverProcess.stderr?.on('data', (data) => {
        const log = data.toString();
        recentLogs.push(log);
        if (recentLogs.length > MAX_LOG_LINES) {
          recentLogs.shift();
        }
        console.error(`[${server.name}] ERROR: ${log}`);
      });

      serverProcess.on('error', (error) => {
        console.error(`[${server.name}] Process error:`, error);
      });

      serverProcess.on('exit', (code, signal) => {
        console.log(`[${server.name}] Process exited with code ${code}, signal ${signal}`);
        runningProcesses.delete(req.params.serverId);

        const deployment = deploymentsDb.findByServerId(req.params.serverId);
        if (deployment) {
          deploymentsDb.update(deployment.id, {
            ...deployment,
            status: 'stopped',
            stoppedAt: new Date().toISOString(),
          });
        }
      });

      // Verify process actually started and is running
      console.log(`[${server.name}] Verifying process stability...`);
      const verification = await verifyProcessStarted(serverProcess.pid!);

      const deploymentStatus = verification.running ? 'running' : 'stopped';

      const deploymentId = crypto.randomUUID();
      const deploymentData = {
        id: deploymentId,
        mcpServerId: req.params.serverId,
        status: deploymentStatus as const,
        processId: serverProcess.pid,
        logs: recentLogs.slice(-50),
        startedAt: new Date().toISOString(),
        ...(deploymentStatus === 'stopped' ? { stoppedAt: new Date().toISOString() } : {}),
      };

      deploymentsDb.create(deploymentData);

      if (verification.running) {
        runningProcesses.set(req.params.serverId, serverProcess);
        console.log(`[${server.name}] HTTP/SSE server started successfully (PID: ${serverProcess.pid})`);

        return res.json({
          success: true,
          data: {
            id: deploymentId,
            status: 'running',
            processId: serverProcess.pid,
            transport: server.transport,
          },
          message: 'HTTP/SSE server deployed and verified running. Installation, build, and startup completed with security hardening.',
        });
      } else {
        console.warn(`[${server.name}] Process exited immediately after spawn (PID: ${serverProcess.pid})`);

        return res.status(500).json({
          success: false,
          error: 'Server process started but exited immediately. This usually indicates a configuration error. Check the server logs for details.',
          data: {
            id: deploymentId,
            status: 'stopped',
            processId: serverProcess.pid,
            logs: recentLogs.slice(-10),
          },
        });
      }
    }

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
    const server = mcpServersDb.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found',
      });
    }

    // STDIO servers cannot be stopped (they don't run in the portal)
    if (server.transport === 'stdio') {
      return res.status(400).json({
        success: false,
        error: 'STDIO servers cannot be stopped from the admin portal. STDIO servers are spawned and managed by MCP clients (e.g., Claude Desktop). You can rebuild or delete the server.',
      });
    }

    const deployment = deploymentsDb.findByServerId(req.params.serverId);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'No deployment found for this server. The server may not have been deployed yet.',
      });
    }

    // Check actual process status
    const actuallyRunning = isProcessRunning(deployment.processId);

    if (!actuallyRunning) {
      if (deployment.status === 'running') {
        console.log(`[Stop] Process PID ${deployment.processId} already stopped, updating database`);
        deploymentsDb.update(deployment.id, {
          ...deployment,
          status: 'stopped',
          stoppedAt: new Date().toISOString(),
        });
      }

      return res.status(400).json({
        success: false,
        error: `Server is not running (current status: ${deployment.status}, PID ${deployment.processId} not found)`,
      });
    }

    // Kill the process
    const process = runningProcesses.get(req.params.serverId);
    if (process) {
      process.kill('SIGTERM');
      runningProcesses.delete(req.params.serverId);
      console.log(`[Stop] Sent SIGTERM to process PID ${deployment.processId}`);
    } else {
      // Process running but not in our map - kill by PID directly
      try {
        process.kill(deployment.processId!, 'SIGTERM');
        console.log(`[Stop] Sent SIGTERM to process PID ${deployment.processId} (not in process map)`);
      } catch (error) {
        console.error(`[Stop] Failed to kill process ${deployment.processId}:`, error);
      }
    }

    // Update deployment status
    deploymentsDb.update(deployment.id, {
      ...deployment,
      status: 'stopped',
      stoppedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Server stopped successfully',
      data: {
        processId: deployment.processId,
        stoppedAt: new Date().toISOString(),
      },
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
