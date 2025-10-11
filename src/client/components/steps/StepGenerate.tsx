import React, { useState } from 'react';
import { Box, Typography, Alert, Button, Paper } from '@mui/material';
import { CheckCircle as CheckIcon, ContentCopy as CopyIcon, Pending as PendingIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

interface StepGenerateProps {
  serverId: string | null;
  isGenerated?: boolean;
}

function StepGenerate({ serverId, isGenerated = false }: StepGenerateProps) {
  const [copied, setCopied] = useState(false);

  const { data: serverData } = useQuery({
    queryKey: ['mcp-server', serverId],
    queryFn: () => apiService.getMcpServer(serverId!),
    enabled: !!serverId,
  });

  const server = serverData?.data?.data;
  // Use the actual generated path from the backend, or construct a placeholder if not available
  const serverPath = server?.generated_path ||
    (server?.name ? `<YOUR_PROJECT_PATH>/generated-servers/${server.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}` : '<YOUR_PROJECT_PATH>/generated-servers/<server-name>');

  // Show "Ready to Generate" state if not yet generated
  if (!isGenerated) {
    return (
      <Box py={4}>
        <Box textAlign="center" mb={4}>
          <PendingIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Ready to Generate MCP Server
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Your server configuration is complete. Click "Generate" below to create your MCP server code.
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            📦 What will be generated:
          </Typography>
          <ul style={{ marginLeft: 20, marginBottom: 0 }}>
            <li><strong>Server Code:</strong> TypeScript MCP server implementation</li>
            <li><strong>Tool Definitions:</strong> {server?.tools?.length || 0} API endpoints as MCP tools</li>
            <li><strong>Transport:</strong> {server?.transport === 'stdio' ? 'STDIO (Claude Desktop)' : `HTTP on port ${server?.httpConfig?.port || 3000}`}</li>
            <li><strong>Dependencies:</strong> package.json with all required packages</li>
            <li><strong>Configuration:</strong> Ready-to-use Claude Desktop config</li>
          </ul>
        </Alert>

        <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            📋 Server Details:
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, rowGap: 1.5 }}>
            <Typography variant="body2" fontWeight="bold">Name:</Typography>
            <Typography variant="body2">{server?.name || 'N/A'}</Typography>

            <Typography variant="body2" fontWeight="bold">Description:</Typography>
            <Typography variant="body2">{server?.description || 'N/A'}</Typography>

            <Typography variant="body2" fontWeight="bold">API Base URL:</Typography>
            <Typography variant="body2">{server?.api_base_url || '(Set via environment variable)'}</Typography>

            <Typography variant="body2" fontWeight="bold">Authentication:</Typography>
            <Typography variant="body2">{server?.api_auth_type || 'none'}</Typography>

            <Typography variant="body2" fontWeight="bold">Tools:</Typography>
            <Typography variant="body2">{server?.tools?.length || 0} endpoints</Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  // Show "Generated Successfully" state after generation
  const getClaudeConfig = () => {
    if (!server) return '';

    if (server.transport === 'stdio') {
      const config: any = {
        mcpServers: {
          [server.name]: {
            command: 'node',
            args: [`${serverPath}/dist/index.js`],
            env: {
              API_BASE_URL: server.api_base_url || 'YOUR_API_BASE_URL',
            },
          },
        },
      };

      // Add authentication based on type
      if (server.api_auth_type === 'bearer' || server.api_auth_type === 'oauth2') {
        config.mcpServers[server.name].env.API_TOKEN = 'YOUR_API_TOKEN_HERE';
      } else if (server.api_auth_type === 'apiKey') {
        // Check if there's a custom header name in auth config
        const headerName = server.api_auth_config?.headerName || 'X-API-Key';
        const envVarName = headerName.replace(/-/g, '_').toUpperCase();
        config.mcpServers[server.name].env[envVarName] = 'YOUR_API_KEY_HERE';
      }

      return JSON.stringify(config, null, 2);
    } else {
      return `# HTTP Server Configuration
Server URL: http://localhost:${server.httpConfig?.port || 3000}/sse

Add this to your MCP client configuration:
{
  "mcpServers": {
    "${server.name}": {
      "url": "http://localhost:${server.httpConfig?.port || 3000}/sse"
    }
  }
}`;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getClaudeConfig());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box py={4}>
      <Box textAlign="center" mb={4}>
        <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          MCP Server Generated Successfully!
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Your MCP server code has been generated and is ready to use.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          📍 Server Location:
        </Typography>
        <Typography variant="body2" component="code" sx={{ display: 'block', mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
          {serverPath}/dist/index.js
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight="bold">
            {server?.transport === 'stdio' ? '🖥️ Claude Desktop Configuration' : '🌐 HTTP Server Configuration'}
          </Typography>
          <Button
            size="small"
            startIcon={<CopyIcon />}
            onClick={copyToClipboard}
            variant={copied ? 'contained' : 'outlined'}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </Box>

        {server?.transport === 'stdio' && (
          <>
            <Typography variant="body2" color="textSecondary" paragraph>
              Add this to your Claude Desktop config file:
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" mb={1}>
              <strong>MacOS:</strong> ~/Library/Application Support/Claude/claude_desktop_config.json
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" mb={2}>
              <strong>Windows:</strong> %APPDATA%/Claude/claude_desktop_config.json
            </Typography>
          </>
        )}

        <Box
          component="pre"
          sx={{
            bgcolor: '#1e1e1e',
            color: '#d4d4d4',
            p: 2,
            borderRadius: 1,
            overflow: 'auto',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
          }}
        >
          {getClaudeConfig()}
        </Box>
      </Paper>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          ⚙️ Important: Replace Placeholder Values
        </Typography>
        <Typography variant="body2" component="div">
          Before restarting Claude Desktop, make sure to replace the placeholder values in the configuration above:
        </Typography>
        <ul style={{ marginTop: 8, marginBottom: 0, fontSize: '0.875rem' }}>
          <li><code>YOUR_API_BASE_URL</code> - Replace with the actual API base URL</li>
          {server?.api_auth_type === 'apiKey' && (
            <li><code>YOUR_API_KEY_HERE</code> - Replace with your actual API key</li>
          )}
          {(server?.api_auth_type === 'bearer' || server?.api_auth_type === 'oauth2') && (
            <li><code>YOUR_API_TOKEN_HERE</code> - Replace with your actual API token</li>
          )}
        </ul>
      </Alert>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          📋 Next Steps:
        </Typography>
        <ol style={{ marginLeft: 20, marginBottom: 0 }}>
          <li>Copy the configuration above to your Claude Desktop config</li>
          <li>Replace the placeholder values (API_BASE_URL, API_KEY, etc.) with your actual credentials</li>
          <li>Save the config file</li>
          <li>Restart Claude Desktop to load the new server</li>
        </ol>
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="contained" href="/mcp-servers" size="large">
          View MCP Servers
        </Button>
      </Box>
    </Box>
  );
}

export default StepGenerate;
