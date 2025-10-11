import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Switch,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';

interface StepServerConfigProps {
  serverConfig: any;
  setServerConfig: (config: any) => void;
  apiConfig: any;
  setApiConfig?: (config: any) => void;
}

function StepServerConfig({ serverConfig, setServerConfig, apiConfig, setApiConfig }: StepServerConfigProps) {
  const [manualAuthOverride, setManualAuthOverride] = useState(false);
  const [localAuthType, setLocalAuthType] = useState(apiConfig?.authType || 'none');
  const [localBaseUrl, setLocalBaseUrl] = useState(apiConfig?.baseUrl || '');
  const [localHeaderName, setLocalHeaderName] = useState(apiConfig?.authConfig?.headerName || 'X-API-Key');

  // Update local state when apiConfig changes (e.g., when moving between steps)
  React.useEffect(() => {
    if (apiConfig && !manualAuthOverride) {
      setLocalAuthType(apiConfig.authType || 'none');
      setLocalBaseUrl(apiConfig.baseUrl || '');
      setLocalHeaderName(apiConfig.authConfig?.headerName || 'X-API-Key');
    }
  }, [apiConfig, manualAuthOverride]);

  const authType = manualAuthOverride ? localAuthType : (apiConfig?.authType || 'none');
  const authConfig = apiConfig?.authConfig || {};
  const displayBaseUrl = manualAuthOverride ? localBaseUrl : (apiConfig?.baseUrl || '');

  const handleAuthOverrideToggle = (checked: boolean) => {
    setManualAuthOverride(checked);
    if (checked) {
      // Initialize local state with current values
      setLocalAuthType(apiConfig?.authType || 'none');
      setLocalBaseUrl(apiConfig?.baseUrl || '');
      setLocalHeaderName(apiConfig?.authConfig?.headerName || 'X-API-Key');
    } else {
      // Reset to auto-detected values
      if (setApiConfig) {
        setApiConfig({
          ...apiConfig,
          authType: apiConfig?.authType || 'none',
          baseUrl: apiConfig?.baseUrl || '',
          authConfig: apiConfig?.authConfig || {},
        });
      }
    }
  };

  const updateAuthConfig = (field: string, value: any) => {
    if (!setApiConfig) return;

    const updates: any = {};
    if (field === 'authType') {
      setLocalAuthType(value);
      updates.authType = value;
    } else if (field === 'baseUrl') {
      setLocalBaseUrl(value);
      updates.baseUrl = value;
    } else if (field === 'headerName') {
      setLocalHeaderName(value);
      updates.authConfig = { ...apiConfig?.authConfig, headerName: value };
    }

    setApiConfig({ ...apiConfig, ...updates });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Server Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Configure how your MCP server will run and communicate.
      </Typography>

      <TextField
        fullWidth
        label="Server Name"
        value={serverConfig.name || ''}
        onChange={(e) => setServerConfig({ ...serverConfig, name: e.target.value })}
        margin="normal"
        required
        helperText="A unique name for your MCP server (e.g., 'my-MCP-server')"
        placeholder="my-MCP-server"
      />

      <TextField
        fullWidth
        label="Description (Optional)"
        value={serverConfig.description || ''}
        onChange={(e) => setServerConfig({ ...serverConfig, description: e.target.value })}
        margin="normal"
        multiline
        rows={3}
        helperText="Optional description to help identify this server"
        placeholder="MCP server for my API"
      />

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            Authentication Configuration
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={manualAuthOverride}
              onChange={(e) => handleAuthOverrideToggle(e.target.checked)}
            />
          }
          label="Manual Override"
        />
      </Box>

      <TextField
        fullWidth
        label="API Base URL"
        value={displayBaseUrl}
        onChange={(e) => manualAuthOverride && updateAuthConfig('baseUrl', e.target.value)}
        margin="normal"
        placeholder="https://api.example.com"
        helperText={displayBaseUrl ? "Base URL for all API requests" : "Not detected - please provide the base URL for your API"}
        required
        disabled={!manualAuthOverride}
        InputProps={{
          readOnly: !manualAuthOverride,
        }}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Authentication Type</InputLabel>
        <Select
          value={authType}
          label="Authentication Type"
          onChange={(e) => manualAuthOverride && updateAuthConfig('authType', e.target.value)}
          disabled={!manualAuthOverride}
        >
          <MenuItem value="none">None</MenuItem>
          <MenuItem value="bearer">Bearer Token</MenuItem>
          <MenuItem value="apiKey">API Key</MenuItem>
          <MenuItem value="oauth2">OAuth 2.0</MenuItem>
        </Select>
      </FormControl>

      {authType === 'apiKey' && (
        <TextField
          fullWidth
          label="API Key Header Name"
          value={manualAuthOverride ? localHeaderName : (authConfig.headerName || 'X-API-Key')}
          onChange={(e) => manualAuthOverride && updateAuthConfig('headerName', e.target.value)}
          margin="normal"
          disabled={!manualAuthOverride}
          helperText="The header name where the API key will be sent"
        />
      )}

      {authType !== 'none' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Note:</strong> You'll need to provide the actual API key/token as an environment variable when deploying the server.
        </Alert>
      )}

      <Divider sx={{ my: 3 }} />

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Transport Type
        </Typography>
      </Box>

      <FormControl component="fieldset">
        <RadioGroup
          value={serverConfig.transport || 'stdio'}
          onChange={(e) =>
            setServerConfig({ ...serverConfig, transport: e.target.value })
          }
        >
          <FormControlLabel
            value="stdio"
            control={<Radio />}
            label="STDIO - Standard Input/Output (Local MCP servers)"
          />
          <FormControlLabel
            value="http"
            control={<Radio />}
            label="HTTP - Streamable HTTP (Remote MCP Servers) - Coming Soon"
            disabled
          />
        </RadioGroup>
      </FormControl>
    </Box>
  );
}

export default StepServerConfig;
