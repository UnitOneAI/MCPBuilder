import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './database.js';
import apiConfigsRouter from './routes/apiConfigs.js';
import mcpServersRouter from './routes/mcpServers.js';
import deploymentsRouter from './routes/deployments.js';
import parserRouter from './routes/parser.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Initialize database
initializeDatabase();

// Cleanup orphaned API configs on startup
import { apiConfigsDb, mcpServersDb } from './database.js';
const cleanupOrphanedApiConfigs = () => {
  try {
    const allApiConfigs = apiConfigsDb.findAll();
    const allServers = mcpServersDb.findAll();
    const usedApiConfigIds = new Set(allServers.map((s: any) => s.api_config_id).filter(Boolean));

    let cleanedCount = 0;
    allApiConfigs.forEach((config: any) => {
      if (!usedApiConfigIds.has(config.id)) {
        apiConfigsDb.delete(config.id);
        cleanedCount++;
        console.log(`Cleaned up orphaned API config: ${config.id} (${config.name})`);
      }
    });

    if (cleanedCount > 0) {
      console.log(`✨ Cleaned up ${cleanedCount} orphaned API config(s)`);
    }
  } catch (error) {
    console.error('Failed to cleanup orphaned API configs:', error);
  }
};
cleanupOrphanedApiConfigs();

// API Routes
app.use('/api/configs', apiConfigsRouter);
app.use('/api/servers', mcpServersRouter);
app.use('/api/deployments', deploymentsRouter);
app.use('/api/parser', parserRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../client');
  app.use(express.static(clientPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UNITONE MCP Generator API running on http://localhost:${PORT}`);
  console.log(`📊 Database initialized`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
