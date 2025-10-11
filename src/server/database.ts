import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ApiConfig, McpServerConfig, DeploymentConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/mcp-generator.db');

// Create database connection
export const db: Database.Database = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      base_url TEXT NOT NULL,
      auth_type TEXT NOT NULL DEFAULT 'none',
      auth_config TEXT,
      open_api_spec TEXT,
      endpoints TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      api_config_id TEXT NOT NULL,
      transport TEXT NOT NULL DEFAULT 'stdio',
      http_config TEXT,
      tools TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_config_id) REFERENCES api_configs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      mcp_server_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      process_id INTEGER,
      port INTEGER,
      logs TEXT,
      started_at TEXT,
      stopped_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mcp_server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS generated_servers (
      id TEXT PRIMARY KEY,
      mcp_server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      files TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mcp_server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_api_configs_name ON api_configs(name);
    CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(name);
    CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status);
    CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
  `);

  console.log('Database initialized successfully');
}

// API Configs
export const apiConfigsDb = {
  create: (config: Partial<ApiConfig> & { id?: string }) => {
    const stmt = db.prepare(`
      INSERT INTO api_configs (id, name, description, base_url, auth_type, auth_config, open_api_spec, endpoints)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      config.id || crypto.randomUUID(),
      config.name,
      config.description || null,
      config.baseUrl,
      config.authType || 'none',
      config.authConfig ? JSON.stringify(config.authConfig) : null,
      config.openApiSpec || null,
      config.endpoints ? JSON.stringify(config.endpoints) : null
    );
  },

  findAll: () => {
    const stmt = db.prepare('SELECT * FROM api_configs ORDER BY created_at DESC');
    const rows = stmt.all();
    return rows.map((row: any) => ({
      ...row,
      authConfig: row.auth_config ? JSON.parse(row.auth_config) : null,
      endpoints: row.endpoints ? JSON.parse(row.endpoints) : null,
    }));
  },

  findById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM api_configs WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      ...row,
      authConfig: row.auth_config ? JSON.parse(row.auth_config) : null,
      endpoints: row.endpoints ? JSON.parse(row.endpoints) : null,
    };
  },

  update: (id: string, config: Partial<ApiConfig>) => {
    const stmt = db.prepare(`
      UPDATE api_configs
      SET name = ?, description = ?, base_url = ?, auth_type = ?,
          auth_config = ?, open_api_spec = ?, endpoints = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(
      config.name,
      config.description || null,
      config.baseUrl,
      config.authType || 'none',
      config.authConfig ? JSON.stringify(config.authConfig) : null,
      config.openApiSpec || null,
      config.endpoints ? JSON.stringify(config.endpoints) : null,
      id
    );
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM api_configs WHERE id = ?');
    return stmt.run(id);
  },
};

// MCP Servers
export const mcpServersDb = {
  create: (server: Partial<McpServerConfig> & { id?: string; apiConfigId: string }) => {
    const stmt = db.prepare(`
      INSERT INTO mcp_servers (id, name, description, api_config_id, transport, http_config, tools, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      server.id || crypto.randomUUID(),
      server.name,
      server.description || null,
      server.apiConfigId,
      server.transport || 'stdio',
      null, // http_config kept for backward compatibility but not used
      server.tools ? JSON.stringify(server.tools) : null,
      server.status || 'draft'
    );
  },

  findAll: () => {
    const stmt = db.prepare(`
      SELECT ms.*, ac.name as api_name
      FROM mcp_servers ms
      LEFT JOIN api_configs ac ON ms.api_config_id = ac.id
      ORDER BY ms.created_at DESC
    `);
    const rows = stmt.all();
    return rows.map((row: any) => ({
      ...row,
      tools: row.tools ? JSON.parse(row.tools) : null,
    }));
  },

  findById: (id: string) => {
    const stmt = db.prepare(`
      SELECT ms.*, ac.name as api_name
      FROM mcp_servers ms
      LEFT JOIN api_configs ac ON ms.api_config_id = ac.id
      WHERE ms.id = ?
    `);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      ...row,
      tools: row.tools ? JSON.parse(row.tools) : null,
    };
  },

  update: (id: string, server: Partial<McpServerConfig>) => {
    const stmt = db.prepare(`
      UPDATE mcp_servers
      SET name = ?, description = ?, transport = ?, http_config = ?,
          tools = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(
      server.name,
      server.description || null,
      server.transport || 'stdio',
      null, // http_config kept for backward compatibility but not used
      server.tools ? JSON.stringify(server.tools) : null,
      server.status || 'draft',
      id
    );
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM mcp_servers WHERE id = ?');
    return stmt.run(id);
  },
};

// Deployments
export const deploymentsDb = {
  create: (deployment: Partial<DeploymentConfig> & { id?: string; mcpServerId: string }) => {
    const stmt = db.prepare(`
      INSERT INTO deployments (id, mcp_server_id, status, process_id, port, logs, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      deployment.id || crypto.randomUUID(),
      deployment.mcpServerId,
      deployment.status || 'pending',
      deployment.processId || null,
      deployment.port || null,
      deployment.logs ? JSON.stringify(deployment.logs) : null,
      deployment.startedAt || null
    );
  },

  findByServerId: (serverId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM deployments
      WHERE mcp_server_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(serverId) as any;
    if (!row) return null;

    return {
      ...row,
      logs: row.logs ? JSON.parse(row.logs) : [],
    };
  },

  update: (id: string, deployment: Partial<DeploymentConfig>) => {
    const stmt = db.prepare(`
      UPDATE deployments
      SET status = ?, process_id = ?, port = ?, logs = ?, stopped_at = ?
      WHERE id = ?
    `);

    return stmt.run(
      deployment.status,
      deployment.processId || null,
      deployment.port || null,
      deployment.logs ? JSON.stringify(deployment.logs) : null,
      deployment.stoppedAt || null,
      id
    );
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM deployments WHERE id = ?');
    return stmt.run(id);
  },
};

// Generated Servers
export const generatedServersDb = {
  create: (server: { id?: string; mcpServerId: string; name: string; path: string; files: string[] }) => {
    const stmt = db.prepare(`
      INSERT INTO generated_servers (id, mcp_server_id, name, path, files)
      VALUES (?, ?, ?, ?, ?)
    `);

    return stmt.run(
      server.id || crypto.randomUUID(),
      server.mcpServerId,
      server.name,
      server.path,
      JSON.stringify(server.files)
    );
  },

  findByServerId: (serverId: string) => {
    const stmt = db.prepare('SELECT * FROM generated_servers WHERE mcp_server_id = ?');
    const row = stmt.get(serverId) as any;
    if (!row) return null;

    return {
      ...row,
      files: JSON.parse(row.files),
    };
  },
};

export default db;
