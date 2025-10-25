import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Api as ApiIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ViewModule as CardViewIcon,
  ViewList as ListViewIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { apiService } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

function McpServers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; server: any | null }>({
    open: false,
    server: null,
  });
  const [generateDialog, setGenerateDialog] = useState<{ open: boolean; server: any | null }>({
    open: false,
    server: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: () => apiService.getMcpServers(),
  });

  const servers = data?.data?.data || [];

  const filteredServers = servers.filter((server: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      server.name.toLowerCase().includes(searchLower) ||
      server.description?.toLowerCase().includes(searchLower) ||
      server.api_name?.toLowerCase().includes(searchLower) ||
      server.tools?.some((tool: any) =>
        tool.name?.toLowerCase().includes(searchLower) ||
        tool.description?.toLowerCase().includes(searchLower)
      )
    );
  });

  const toggleTools = (serverId: string) => {
    setExpandedTools((prev) => ({
      ...prev,
      [serverId]: !prev[serverId],
    }));
  };

  const buildMutation = useMutation({
    mutationFn: (serverId: string) => apiService.deployServer(serverId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      enqueueSnackbar(response.data?.message || 'STDIO server built successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.error || 'Failed to build server', { variant: 'error' });
    },
  });

  const rebuildMutation = useMutation({
    mutationFn: (serverId: string) => apiService.deployServer(serverId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      enqueueSnackbar(response.data?.message || 'STDIO server rebuilt successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.error || 'Failed to rebuild server', { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (serverId: string) => apiService.deleteMcpServer(serverId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      enqueueSnackbar(response.data?.message || 'Server deleted successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.error || 'Failed to delete server', { variant: 'error' });
    },
  });

  const getServerStatus = (server: any) => {
    // For STDIO servers, check deployment_status
    if (server.deployment_status === 'ready') {
      return { label: 'Ready', color: 'success' as const };
    }
    // If has been generated but not built yet
    if (server.generated_path) {
      return { label: 'Not Built', color: 'warning' as const };
    }
    // Not generated yet
    return { label: 'Draft', color: 'default' as const };
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
        pb={3}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <Box>
          <Typography variant="h3" component="h1" fontWeight="600" color="#020618">
            MCP Servers
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Deploy and manage your Model Context Protocol servers
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Box sx={{ display: 'flex', gap: 0.5, border: 1, borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
            <Tooltip title="Card View">
              <IconButton
                size="medium"
                onClick={() => setViewMode('card')}
                color={viewMode === 'card' ? 'primary' : 'default'}
                sx={{
                  bgcolor: viewMode === 'card' ? '#020618' : 'transparent',
                  color: viewMode === 'card' ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: viewMode === 'card' ? '#030a24' : 'action.hover',
                  },
                }}
              >
                <CardViewIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="List View">
              <IconButton
                size="medium"
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
                sx={{
                  bgcolor: viewMode === 'list' ? '#020618' : 'transparent',
                  color: viewMode === 'list' ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: viewMode === 'list' ? '#030a24' : 'action.hover',
                  },
                }}
              >
                <ListViewIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            href="/create-server"
            size="large"
            sx={{
              bgcolor: '#020618',
              '&:hover': {
                bgcolor: '#030a24',
              },
              textTransform: 'none',
              px: 3,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            Create MCP Server
          </Button>
        </Box>
      </Box>

      {/* Search Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
              <SearchIcon color="action" />
            </Box>
            <Box
              component="input"
              type="text"
              placeholder="Search servers by name, description, API, or tools..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              sx={{
                width: '100%',
                padding: '12px 48px 12px 48px',
                fontSize: '0.95rem',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                outline: 'none',
                '&:focus': {
                  borderColor: '#020618',
                  boxShadow: '0 0 0 2px rgba(2, 6, 24, 0.1)',
                },
              }}
            />
            {searchTerm && (
              <IconButton
                size="small"
                onClick={() => setSearchTerm('')}
                sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
              >
                <ClearIcon />
              </IconButton>
            )}
          </Box>
          {searchTerm && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Found {filteredServers.length} server{filteredServers.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </CardContent>
      </Card>

      {servers.length === 0 ? (
        <Card
          sx={{
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            border: '2px dashed',
            borderColor: '#020618',
            bgcolor: 'transparent',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
              bgcolor: 'rgba(2, 6, 24, 0.02)',
            },
          }}
          onClick={() => navigate('/create-server')}
        >
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <AddIcon sx={{ fontSize: 60, color: '#020618', mb: 2 }} />
            <Typography variant="h5" fontWeight="600" color="#020618" gutterBottom>
              Create New MCP Server
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              No MCP Servers Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first MCP server to get started
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
        {viewMode === 'card' ? (
        <Grid container spacing={3}>
          {filteredServers.map((server: any) => (
            <Grid item xs={12} md={6} lg={4} key={server.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6">{server.name}</Typography>
                    <Chip
                      label={getServerStatus(server).label}
                      size="small"
                      color={getServerStatus(server).color}
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" paragraph>
                    {server.description || 'No description'}
                  </Typography>

                  <Box display="flex" gap={1} mb={2} flexWrap="wrap" alignItems="center">
                    <Chip
                      label="STDIO"
                      size="small"
                      variant="outlined"
                    />
                    {server.api_name && (
                      <Tooltip title="View API Configuration">
                        <Chip
                          label={server.api_name}
                          size="small"
                          variant="outlined"
                          icon={<ApiIcon />}
                          onClick={() => navigate('/api-configs')}
                          sx={{ cursor: 'pointer' }}
                        />
                      </Tooltip>
                    )}
                    <Chip
                      label={`${server.tools?.length || 0} tools`}
                      size="small"
                      color="primary"
                      onClick={() => toggleTools(server.id)}
                      onDelete={server.tools?.length > 0 ? () => toggleTools(server.id) : undefined}
                      deleteIcon={
                        <IconButton
                          size="small"
                          sx={{
                            transform: expandedTools[server.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s',
                          }}
                        >
                          <ExpandMoreIcon fontSize="small" />
                        </IconButton>
                      }
                      sx={{ cursor: server.tools?.length > 0 ? 'pointer' : 'default' }}
                    />
                  </Box>

                  {/* Tools List */}
                  {server.tools && server.tools.length > 0 && (
                    <Collapse in={expandedTools[server.id]} timeout="auto" unmountOnExit>
                      <Divider sx={{ mb: 2 }} />
                      <Box
                        sx={{
                          mb: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={600}>
                          Tools ({server.tools.length})
                        </Typography>
                        {server.api_name && (
                          <Chip
                            icon={<LinkIcon />}
                            label={`Linked to ${server.api_name}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => navigate('/api-configs')}
                            sx={{ cursor: 'pointer' }}
                          />
                        )}
                      </Box>
                      <Box
                        sx={{
                          maxHeight: '250px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            borderRadius: '4px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            borderRadius: '4px',
                            '&:hover': {
                              backgroundColor: 'rgba(0,0,0,0.3)',
                            },
                          },
                        }}
                      >
                        <List dense disablePadding>
                          {server.tools.map((tool: any, index: number) => (
                            <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" fontWeight={500}>
                                    {tool.name}
                                  </Typography>
                                }
                                secondary={
                                  <Box>
                                    <Typography variant="caption" component="span" color="textSecondary">
                                      {tool.method} {tool.endpoint}
                                    </Typography>
                                    {tool.description && (
                                      <Typography variant="caption" display="block" color="textSecondary">
                                        {tool.description}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </Collapse>
                  )}

                  {/* Server Location */}
                  {server.status === 'active' && server.generated_path && (
                    <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                      <Box>
                        <Typography variant="caption" display="block" fontWeight="bold" mb={0.5}>
                          📍 Server Location:
                        </Typography>
                        <Typography
                          variant="caption"
                          component="code"
                          sx={{
                            fontSize: '0.7rem',
                            display: 'block',
                            wordBreak: 'break-all',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {server.generated_path}/dist/index.js
                        </Typography>
                      </Box>
                    </Alert>
                  )}

                  <Box display="flex" gap={1} mt={2} alignItems="center" justifyContent="space-between">
                    <Box display="flex" gap={1}>
                      {server.status === 'draft' && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CodeIcon />}
                          onClick={() => setGenerateDialog({ open: true, server })}
                        >
                          Generate Code
                        </Button>
                      )}
                      {server.status === 'active' && (
                        <>
                          <Tooltip title="Build Server">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => buildMutation.mutate(server.id)}
                              disabled={buildMutation.isPending || rebuildMutation.isPending}
                            >
                              <PlayIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Rebuild Server">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => rebuildMutation.mutate(server.id)}
                              disabled={buildMutation.isPending || rebuildMutation.isPending}
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                    <Tooltip title="Delete Server">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialog({ open: true, server })}
                        disabled={deleteMutation.isPending}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Typography variant="caption" color="textSecondary" display="block" mt={2}>
                    Created: {new Date(server.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Transport</TableCell>
                <TableCell>API</TableCell>
                <TableCell>Tools</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredServers.map((server: any) => (
                <TableRow key={server.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {server.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {server.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getServerStatus(server).label}
                      size="small"
                      color={getServerStatus(server).color}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label="STDIO"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {server.api_name ? (
                      <Tooltip title="View API Configuration">
                        <Chip
                          label={server.api_name}
                          size="small"
                          variant="outlined"
                          icon={<ApiIcon />}
                          onClick={() => navigate('/api-configs')}
                          sx={{ cursor: 'pointer' }}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="textSecondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${server.tools?.length || 0} tools`}
                      size="small"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(server.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" gap={0.5} justifyContent="flex-end">
                      {server.status === 'draft' && (
                        <Tooltip title="Generate Code">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setGenerateDialog({ open: true, server })}
                          >
                            <CodeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {server.status === 'active' && (
                        <>
                          <Tooltip title="Build Server">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => buildMutation.mutate(server.id)}
                              disabled={buildMutation.isPending || rebuildMutation.isPending}
                            >
                              <PlayIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Rebuild Server">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => rebuildMutation.mutate(server.id)}
                              disabled={buildMutation.isPending || rebuildMutation.isPending}
                            >
                              <RefreshIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Delete Server">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, server })}
                          disabled={deleteMutation.isPending}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        )}
        </>
      )}

      {/* Generate Confirmation Dialog */}
      <ConfirmDialog
        open={generateDialog.open}
        title="Generate MCP Server"
        message={`Are you sure you want to generate the code for "${generateDialog.server?.name}"? This will create all the necessary files for your MCP server.`}
        confirmText="Generate"
        confirmColor="primary"
        onConfirm={async () => {
          try {
            const response = await apiService.generateServer(generateDialog.server.id);
            queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
            setGenerateDialog({ open: false, server: null });
            enqueueSnackbar(response.data?.message || 'Server generated successfully', { variant: 'success' });
          } catch (error: any) {
            enqueueSnackbar(error.response?.data?.error || 'Generation failed', { variant: 'error' });
          }
        }}
        onCancel={() => setGenerateDialog({ open: false, server: null })}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete MCP Server"
        message={`Are you sure you want to delete "${deleteDialog.server?.name}"? This will permanently delete the server configuration and all generated code. This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="error"
        onConfirm={() => {
          deleteMutation.mutate(deleteDialog.server.id);
          setDeleteDialog({ open: false, server: null });
        }}
        onCancel={() => setDeleteDialog({ open: false, server: null })}
      />
    </Box>
  );
}

export default McpServers;
