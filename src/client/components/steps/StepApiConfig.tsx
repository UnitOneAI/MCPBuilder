import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
} from "@mui/material";
import { Upload as UploadIcon } from "@mui/icons-material";
import { apiService } from "../../services/api";

interface StepApiConfigProps {
  apiConfig: any;
  setApiConfig: (config: any) => void;
  onParseRequest?: (
    parseFunc: () => Promise<void>,
    canParse: boolean,
    isParsing: boolean,
  ) => void;
}

function StepApiConfig({
  apiConfig,
  setApiConfig,
  onParseRequest,
}: StepApiConfigProps) {
  const [inputMethod, setInputMethod] = useState(0);
  const [formData, setFormData] = useState({
    baseUrl: "",
    openApiSpec: "",
    documentation: "",
    postmanCollection: "",
  });
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const canParse =
    (inputMethod === 0 && !!formData.openApiSpec) ||
    (inputMethod === 1 && !!formData.documentation) ||
    (inputMethod === 2 && !!formData.postmanCollection);

  // Notify parent component of parse function and state
  React.useEffect(() => {
    if (onParseRequest) {
      onParseRequest(handleParse, canParse, parsing);
    }
  }, [canParse, parsing, formData, inputMethod]);

  const handleParse = async () => {
    setParsing(true);
    setParseError(null);

    try {
      // Client-side validation for file size
      if (inputMethod === 2) {
        const sizeInBytes = new Blob([formData.postmanCollection]).size;
        const sizeInMB = sizeInBytes / 1024 / 1024;

        if (sizeInMB > 10) {
          setParseError(
            `File too large (${sizeInMB.toFixed(2)}MB). Maximum size is 10MB. Please export a smaller collection or select specific folders from Postman.`,
          );
          setParsing(false);
          return;
        }

        // Validate JSON
        try {
          const parsed = JSON.parse(formData.postmanCollection);
          if (!parsed.info || !parsed.item) {
            throw new Error("Invalid Postman collection format");
          }
        } catch (e) {
          setParseError("Invalid Postman collection JSON format");
          setParsing(false);
          return;
        }
      }

      let parsedData: any;

      if (inputMethod === 0) {
        // OpenAPI/Swagger
        const response = await apiService.parseOpenApi(formData.openApiSpec);
        parsedData = response.data.data;
      } else if (inputMethod === 1) {
        // Documentation
        const response = await apiService.parseDocumentation(
          formData.documentation,
        );
        parsedData = response.data.data;
      } else if (inputMethod === 2) {
        // Postman
        const response = await apiService.parsePostman(
          formData.postmanCollection,
        );
        parsedData = response.data.data;

        // Show warning if present
        if (parsedData.warning) {
          console.warn(parsedData.warning);
        }
      }

      // Store parsed data (baseUrl can be overridden in Step 3)
      const apiConfigData = {
        name: parsedData.name || "My API",
        description: parsedData.description || "",
        baseUrl: parsedData.baseUrl || "",
        authType: parsedData.authType || "none",
        authConfig: parsedData.authConfig,
        endpoints: parsedData.endpoints || [],
        openApiSpec: inputMethod === 0 ? formData.openApiSpec : undefined,
        warning: parsedData.warning,
      };

      // Store config in state - will be persisted when MCP server is created
      setApiConfig(apiConfigData);
    } catch (error: any) {
      setParseError(
        error.response?.data?.error || error.message || "Failed to parse",
      );
    } finally {
      setParsing(false);
    }
  };

  if (apiConfig) {
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 2 }}>
          API parsed successfully!
        </Alert>
        {apiConfig.warning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {apiConfig.warning}
          </Alert>
        )}
        <Typography variant="h6" gutterBottom>
          {apiConfig.name}
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          {apiConfig.description}
        </Typography>
        <Typography variant="body2">
          <strong>Endpoints Found:</strong> {apiConfig.endpoints?.length || 0}
        </Typography>
        {apiConfig.endpoints?.length > 500 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Tip:</strong> You'll be able to filter and select specific
            endpoints in the next step.
          </Alert>
        )}
        <Button
          variant="outlined"
          onClick={() => setApiConfig(null)}
          sx={{ mt: 2 }}
        >
          Parse Different API
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Parse Your API
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Provide your API specification to automatically extract endpoints and
        generate MCP tools.
      </Typography>

      <Tabs
        value={inputMethod}
        onChange={(_, v) => setInputMethod(v)}
        sx={{ mb: 2 }}
      >
        <Tab label="OpenAPI/Swagger" />
        <Tab label="API Documentation" />
        <Tab label="Postman Collection" />
      </Tabs>

      {inputMethod === 0 && (
        <Box>
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Upload File
              <input
                type="file"
                hidden
                accept=".json,.yaml,.yml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const sizeInMB = file.size / 1024 / 1024;
                    if (sizeInMB > 10) {
                      setParseError(
                        `File too large (${sizeInMB.toFixed(2)}MB). Maximum size is 10MB.`,
                      );
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setFormData({
                        ...formData,
                        openApiSpec: event.target?.result as string,
                      });
                      setParseError(null);
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </Button>
            <Typography variant="caption" color="textSecondary">
              Accepts JSON, YAML, or YML files (Max 10MB)
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="OpenAPI Specification"
            value={formData.openApiSpec}
            onChange={(e) =>
              setFormData({ ...formData, openApiSpec: e.target.value })
            }
            multiline
            rows={10}
            placeholder="Or paste URL, YAML, or JSON here..."
            helperText="Enter a URL to the OpenAPI spec, or paste/upload the YAML/JSON specification"
          />
        </Box>
      )}

      {inputMethod === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Upload File
              <input
                type="file"
                hidden
                accept=".txt,.md,.markdown"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const sizeInMB = file.size / 1024 / 1024;
                    if (sizeInMB > 5) {
                      setParseError(
                        `File too large (${sizeInMB.toFixed(2)}MB). Maximum size is 5MB.`,
                      );
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setFormData({
                        ...formData,
                        documentation: event.target?.result as string,
                      });
                      setParseError(null);
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </Button>
            <Typography variant="caption" color="textSecondary">
              Accepts TXT or Markdown files (Max 5MB)
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="API Documentation"
            value={formData.documentation}
            onChange={(e) =>
              setFormData({ ...formData, documentation: e.target.value })
            }
            multiline
            rows={10}
            placeholder={`Example:\nGET /users - Get all users\n- page (number) - Page number\n- limit (number) - Items per page\n\nPOST /users - Create user\n- name (string) - User name\n- email (string) - User email`}
            helperText="Paste or upload your API documentation with endpoints, methods, and parameters"
          />
        </Box>
      )}

      {inputMethod === 2 && (
        <Box>
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Upload File
              <input
                type="file"
                hidden
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const sizeInMB = file.size / 1024 / 1024;
                    if (sizeInMB > 10) {
                      setParseError(
                        `File too large (${sizeInMB.toFixed(2)}MB). Maximum size is 10MB.`,
                      );
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setFormData({
                        ...formData,
                        postmanCollection: event.target?.result as string,
                      });
                      setParseError(null);
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </Button>
            <Typography variant="caption" color="textSecondary">
              Accepts JSON files (Max 10MB)
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Postman Collection JSON"
            value={formData.postmanCollection}
            onChange={(e) =>
              setFormData({ ...formData, postmanCollection: e.target.value })
            }
            multiline
            rows={10}
            placeholder="Or paste Postman collection JSON here..."
            helperText="Export your Postman collection as JSON (File > Export in Postman)"
          />
        </Box>
      )}

      {parseError && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          onClose={() => setParseError(null)}
        >
          {parseError}
        </Alert>
      )}

      {parsing && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ mt: 1, display: "block" }}
          >
            {inputMethod === 2
              ? "Parsing Postman collection... This may take a moment for large files."
              : "Parsing API specification..."}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default StepApiConfig;
