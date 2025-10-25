import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Alert,
} from "@mui/material";
import StepApiConfig from "../components/steps/StepApiConfig";
import StepSelectEndpoints from "../components/steps/StepSelectEndpoints";
import StepServerConfig from "../components/steps/StepServerConfig";
import StepGenerate from "../components/steps/StepGenerate";
import { apiService } from "../services/api";

const steps = ["Parse API", "Select Endpoints", "Server Settings", "Generate"];

function CreateServer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [apiConfig, setApiConfig] = useState<any>(null);
  const [selectedEndpoints, setSelectedEndpoints] = useState<any[]>([]);
  const [serverConfig, setServerConfig] = useState<any>({
    transport: "stdio",
    description: "Built by UNITONE MCP Builder",
  });
  const [generatedServerId, setGeneratedServerId] = useState<string | null>(
    null,
  );

  // Step 1 parsing state
  const [parseFunc, setParseFunc] = useState<(() => Promise<void>) | null>(
    null,
  );
  const [canParse, setCanParse] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const handleParseRequest = (
    func: () => Promise<void>,
    can: boolean,
    parsing: boolean,
  ) => {
    setParseFunc(() => func);
    setCanParse(can);
    setIsParsing(parsing);
  };

  // Scroll to top when step changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep]);

  const createApiConfigMutation = useMutation({
    mutationFn: (data: any) => apiService.createApiConfig(data),
    onSuccess: (response) => {
      setApiConfig(response.data.data);
      queryClient.invalidateQueries({ queryKey: ["api-configs"] });
    },
  });

  const createServerMutation = useMutation({
    mutationFn: (data: any) => apiService.createMcpServer(data),
    onSuccess: (response) => {
      setGeneratedServerId(response.data.data.id);
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
    },
  });

  const generateServerMutation = useMutation({
    mutationFn: (serverId: string) => apiService.generateServer(serverId),
    onSuccess: () => {
      // Invalidate both the list and the specific server to refetch with updated path
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
      queryClient.invalidateQueries({
        queryKey: ["mcp-server", generatedServerId],
      });
    },
  });

  const handleNext = async () => {
    setError(null);

    try {
      if (activeStep === 0) {
        // Step 1: Parse API
        if (!apiConfig && parseFunc) {
          // Trigger parsing
          await parseFunc();
          // Don't increment step - parseFunc will set apiConfig and we'll advance on next click
          return;
        }
        if (!apiConfig) {
          setError("Please provide your API specification");
          return;
        }
      } else if (activeStep === 1) {
        // Step 2: Validate endpoints selection
        if (selectedEndpoints.length === 0) {
          setError("Please select at least one endpoint");
          return;
        }
      } else if (activeStep === 2) {
        // Step 3: Create API Config and MCP Server together in a transaction
        if (!serverConfig.name) {
          setError("Please provide a server name");
          return;
        }

        // First create the API config if not already persisted
        let apiConfigId = apiConfig.id;
        if (!apiConfigId) {
          const apiConfigResponse =
            await createApiConfigMutation.mutateAsync(apiConfig);
          apiConfigId = apiConfigResponse.data.data.id;
        }

        const serverData = {
          name: serverConfig.name,
          description: serverConfig.description,
          apiConfigId: apiConfigId,
          transport: serverConfig.transport,
          tools: selectedEndpoints.map((ep) => ({
            description: ep.description,
            endpoint: ep.path,
            method: ep.method,
            operationId: ep.operationId,
            parameters: ep.parameters,
          })),
        };

        try {
          await createServerMutation.mutateAsync(serverData);
        } catch (err) {
          // If server creation fails and we just created the API config, clean it up
          if (!apiConfig.id && apiConfigId) {
            try {
              await apiService.deleteApiConfig(apiConfigId);
            } catch (cleanupErr) {
              console.error("Failed to cleanup API config:", cleanupErr);
            }
          }
          throw err;
        }
      } else if (activeStep === 3) {
        // Step 4: Generate server code
        if (!generatedServerId) {
          setError("Server configuration not found");
          return;
        }

        await generateServerMutation.mutateAsync(generatedServerId);
        // Don't increment step after final generation - stay on step 3
        return;
      }

      setActiveStep((prev) => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <StepApiConfig
            apiConfig={apiConfig}
            setApiConfig={setApiConfig}
            createApiConfig={createApiConfigMutation}
            onParseRequest={handleParseRequest}
          />
        );
      case 1:
        return (
          <StepSelectEndpoints
            apiConfig={apiConfig}
            selectedEndpoints={selectedEndpoints}
            setSelectedEndpoints={setSelectedEndpoints}
          />
        );
      case 2:
        return (
          <StepServerConfig
            serverConfig={serverConfig}
            setServerConfig={setServerConfig}
            apiConfig={apiConfig}
            setApiConfig={setApiConfig}
          />
        );
      case 3:
        return (
          <StepGenerate
            serverId={generatedServerId}
            isGenerated={generateServerMutation.isSuccess}
          />
        );
      default:
        return "Unknown step";
    }
  };

  const isLastStep = activeStep === steps.length - 1;
  const isLoading =
    createApiConfigMutation.isPending ||
    createServerMutation.isPending ||
    generateServerMutation.isPending ||
    isParsing;

  // Dynamic Next button text based on step
  const getNextButtonText = () => {
    if (isLoading) return "Processing...";
    if (activeStep === 0 && !apiConfig) return "Parse & Continue";
    if (isLastStep) return "Generate";
    return "Next";
  };

  return (
    <Box>
      <Box mb={4} pb={3} borderBottom="1px solid" borderColor="divider">
        <Typography
          variant="h3"
          component="h1"
          fontWeight="600"
          color="#020618"
        >
          Create MCP Server
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Generate a new server from your API configuration
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ minHeight: 400 }}>{getStepContent(activeStep)}</Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
          <Button onClick={() => navigate("/mcp-servers")} disabled={isLoading}>
            Cancel
          </Button>
          <Box>
            <Button
              disabled={
                activeStep === 0 ||
                isLoading ||
                (isLastStep && generateServerMutation.isSuccess)
              }
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            {isLastStep && generateServerMutation.isSuccess ? (
              <Button
                variant="contained"
                onClick={() => navigate("/mcp-servers")}
                sx={{
                  bgcolor: "#020618",
                  "&:hover": {
                    bgcolor: "#030a24",
                  },
                }}
              >
                View Servers
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={
                  isLoading || (activeStep === 0 && !canParse && !apiConfig)
                }
                sx={{
                  bgcolor: "#020618",
                  "&:hover": {
                    bgcolor: "#030a24",
                  },
                }}
              >
                {getNextButtonText()}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default CreateServer;
