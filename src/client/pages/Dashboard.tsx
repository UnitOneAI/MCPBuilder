import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as DeployIcon,
  Add as AddIcon,
  Build as ToolIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import mcpLogo from '../assets/mcp-logo.png';

function Dashboard() {
  const navigate = useNavigate();

  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: () => apiService.getMcpServers(),
  });

  const stats = [
    {
      title: 'MCP Servers',
      value: servers?.data?.data?.length || 0,
      icon: (
        <Box
          component="img"
          src={mcpLogo}
          alt="MCP Servers"
          sx={{
            width: 40,
            height: 40,
            objectFit: 'contain',
          }}
        />
      ),
      color: '#020618',
      action: () => navigate('/mcp-servers'),
    },
    {
      title: 'Active Deployments',
      value: servers?.data?.data?.filter((s: any) => s.status === 'active').length || 0,
      icon: <DeployIcon sx={{ fontSize: 40, color: '#020618' }} />,
      color: '#020618',
      action: () => navigate('/mcp-servers'),
    },
    {
      title: 'Total Tools',
      value: servers?.data?.data?.reduce((acc: number, s: any) => acc + (s.tools?.length || 0), 0) || 0,
      icon: <ToolIcon sx={{ fontSize: 40, color: '#020618' }} />,
      color: '#020618',
      action: () => navigate('/mcp-servers'),
    },
  ];

  if (serversLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={4} pb={3} borderBottom="1px solid" borderColor="divider">
        <Typography variant="h3" component="h1" fontWeight="600" color="#020618">
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Build and manage your Model Context Protocol servers
        </Typography>
      </Box>

      <Grid container spacing={3} mb={4}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                },
              }}
              onClick={stat.action}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h3" component="div" fontWeight="bold">
                      {stat.value}
                    </Typography>
                  </Box>
                  {stat.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create New Server Card */}
      <Card
        sx={{
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          border: '2px dashed',
          borderColor: '#020618',
          bgcolor: 'transparent',
          mb: 4,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            bgcolor: 'rgba(2, 6, 24, 0.02)',
          },
        }}
        onClick={() => navigate('/create-server')}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <AddIcon sx={{ fontSize: 60, color: '#020618', mb: 2 }} />
          <Typography variant="h5" fontWeight="600" color="#020618" gutterBottom>
            Create New MCP Server
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Build a Model Context Protocol server from your API specification
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Welcome to UNITONE MCP Builder
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Generate Model Context Protocol (MCP) servers from your API specifications with ease.
          </Typography>
          <Box mt={3}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Getting Started:
            </Typography>
            <ol style={{ marginLeft: 20 }}>
              <li>
                <Typography variant="body2" paragraph>
                  <strong>Parse Your API:</strong> Upload your OpenAPI/Swagger specification,
                  API documentation, or Postman collection.
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  <strong>Select Endpoints:</strong> Choose which API endpoints to expose as MCP tools.
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  <strong>Configure Server:</strong> Set your server name and configure authentication settings.
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  <strong>Generate & Integrate:</strong> Generate your MCP server code and connect it to Claude Desktop
                  or other MCP-compatible clients.
                </Typography>
              </li>
            </ol>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Dashboard;
