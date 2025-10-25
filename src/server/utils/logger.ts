import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log directory configuration
const LOG_BASE_DIR = process.env.LOG_DIR || path.join(__dirname, '../../../logs');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB max per log file
const MAX_LOG_AGE_DAYS = 30; // Keep logs for 30 days

/**
 * Ensures the logs directory exists
 */
export function ensureLogDirectory(serverId: string): string {
  const serverLogDir = path.join(LOG_BASE_DIR, serverId);

  if (!fs.existsSync(serverLogDir)) {
    fs.mkdirSync(serverLogDir, { recursive: true });
  }

  return serverLogDir;
}

/**
 * Gets the log file path for a deployment
 */
export function getLogFilePath(serverId: string, deploymentId: string): string {
  const serverLogDir = ensureLogDirectory(serverId);
  return path.join(serverLogDir, `${deploymentId}.log`);
}

/**
 * Appends a log entry to the deployment log file
 */
export function appendLog(serverId: string, deploymentId: string, message: string): void {
  try {
    const logFilePath = getLogFilePath(serverId, deploymentId);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    fs.appendFileSync(logFilePath, logEntry, 'utf-8');
  } catch (error) {
    console.error(`Failed to write log for ${deploymentId}:`, error);
  }
}

/**
 * Reads logs from a deployment log file
 * @param serverId Server ID
 * @param deploymentId Deployment ID
 * @param lines Number of lines to read from the end (default: all)
 */
export function readLogs(serverId: string, deploymentId: string, lines?: number): string[] {
  try {
    const logFilePath = getLogFilePath(serverId, deploymentId);

    if (!fs.existsSync(logFilePath)) {
      return [];
    }

    const content = fs.readFileSync(logFilePath, 'utf-8');
    const allLines = content.split('\n').filter(line => line.trim() !== '');

    if (lines && lines > 0) {
      // Return last N lines
      return allLines.slice(-lines);
    }

    return allLines;
  } catch (error) {
    console.error(`Failed to read log for ${deploymentId}:`, error);
    return [];
  }
}

/**
 * Rotates a log file if it exceeds the maximum size
 */
export function rotateLogIfNeeded(serverId: string, deploymentId: string): void {
  try {
    const logFilePath = getLogFilePath(serverId, deploymentId);

    if (!fs.existsSync(logFilePath)) {
      return;
    }

    const stats = fs.statSync(logFilePath);

    if (stats.size >= MAX_LOG_SIZE) {
      const timestamp = Date.now();
      const rotatedPath = `${logFilePath}.${timestamp}`;

      fs.renameSync(logFilePath, rotatedPath);
      console.log(`Rotated log file: ${logFilePath} → ${rotatedPath}`);
    }
  } catch (error) {
    console.error(`Failed to rotate log for ${deploymentId}:`, error);
  }
}

/**
 * Cleans up old log files
 */
export function cleanupOldLogs(): void {
  try {
    if (!fs.existsSync(LOG_BASE_DIR)) {
      return;
    }

    const now = Date.now();
    const maxAge = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

    const serverDirs = fs.readdirSync(LOG_BASE_DIR);

    for (const serverDir of serverDirs) {
      const serverPath = path.join(LOG_BASE_DIR, serverDir);

      if (!fs.statSync(serverPath).isDirectory()) {
        continue;
      }

      const logFiles = fs.readdirSync(serverPath);

      for (const logFile of logFiles) {
        const logPath = path.join(serverPath, logFile);
        const stats = fs.statSync(logPath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(logPath);
          console.log(`Cleaned up old log file: ${logPath}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old logs:', error);
  }
}

/**
 * Deletes all logs for a specific server
 */
export function deleteServerLogs(serverId: string): void {
  try {
    const serverLogDir = path.join(LOG_BASE_DIR, serverId);

    if (fs.existsSync(serverLogDir)) {
      fs.rmSync(serverLogDir, { recursive: true, force: true });
      console.log(`Deleted logs for server: ${serverId}`);
    }
  } catch (error) {
    console.error(`Failed to delete logs for server ${serverId}:`, error);
  }
}
