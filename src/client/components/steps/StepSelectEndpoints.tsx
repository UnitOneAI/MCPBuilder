import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControlLabel,
  TextField,
  TablePagination,
  InputAdornment,
  Alert,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";

interface StepSelectEndpointsProps {
  apiConfig: any;
  selectedEndpoints: any[];
  setSelectedEndpoints: (endpoints: any[]) => void;
}

function StepSelectEndpoints({
  apiConfig,
  selectedEndpoints,
  setSelectedEndpoints,
}: StepSelectEndpointsProps) {
  const endpoints = apiConfig?.endpoints || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filter endpoints based on search
  const filteredEndpoints = useMemo(() => {
    if (!searchTerm) return endpoints;
    const searchLower = searchTerm.toLowerCase();
    return endpoints.filter(
      (endpoint: any) =>
        endpoint.path?.toLowerCase().includes(searchLower) ||
        endpoint.method?.toLowerCase().includes(searchLower) ||
        endpoint.description?.toLowerCase().includes(searchLower),
    );
  }, [endpoints, searchTerm]);

  // Paginate filtered endpoints
  const paginatedEndpoints = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredEndpoints.slice(start, start + rowsPerPage);
  }, [filteredEndpoints, page, rowsPerPage]);

  const allSelected =
    filteredEndpoints.length > 0 &&
    filteredEndpoints.every((ep: any) =>
      selectedEndpoints.some(
        (e) => e.path === ep.path && e.method === ep.method,
      ),
    );

  const handleToggle = (endpoint: any) => {
    const existing = selectedEndpoints.find(
      (e) => e.path === endpoint.path && e.method === endpoint.method,
    );

    if (existing) {
      setSelectedEndpoints(selectedEndpoints.filter((e) => e !== existing));
    } else {
      // Don't pre-generate toolName - let backend use operationId
      setSelectedEndpoints([...selectedEndpoints, endpoint]);
    }
  };

  const isSelected = (endpoint: any) => {
    return selectedEndpoints.some(
      (e) => e.path === endpoint.path && e.method === endpoint.method,
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered endpoints
      const filteredIds = new Set(
        filteredEndpoints.map((ep: any) => `${ep.method}:${ep.path}`),
      );
      setSelectedEndpoints(
        selectedEndpoints.filter(
          (e) => !filteredIds.has(`${e.method}:${e.path}`),
        ),
      );
    } else {
      // Select all filtered endpoints (don't pre-generate toolName)
      const newSelections = filteredEndpoints.filter(
        (endpoint: any) => !isSelected(endpoint),
      );
      setSelectedEndpoints([...selectedEndpoints, ...newSelections]);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            Select API Endpoints
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Choose which endpoints to expose as MCP tools (
            {selectedEndpoints.length} of {endpoints.length} selected)
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={allSelected}
              indeterminate={selectedEndpoints.length > 0 && !allSelected}
              onChange={handleSelectAll}
            />
          }
          label={searchTerm ? "Select All Filtered" : "Select All"}
        />
      </Box>

      {/* Tool count warnings */}
      {selectedEndpoints.length > 100 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Too Many Tools Selected ({selectedEndpoints.length})</strong>
          <Typography variant="body2" sx={{ mt: 1 }}>
            You may proceed, however MCP servers with this many tools may
            experience significant performance issues and poor tool selection
            accuracy.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Recommendation:</strong> Create multiple focused servers
            instead:
          </Typography>
          <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
            <li>Group related endpoints by functionality</li>
            <li>
              Create separate servers for each group (e.g., "users", "orders",
              "reports")
            </li>
            <li>Keep each server under 40 tools for optimal performance</li>
          </ul>
        </Alert>
      )}

      {selectedEndpoints.length > 40 && selectedEndpoints.length <= 100 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Many Tools Selected ({selectedEndpoints.length})</strong>
          <Typography variant="body2" sx={{ mt: 1 }}>
            You may proceed, however best practices recommend keeping MCP
            servers under 40 tools for optimal performance and accuracy.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Consider:</strong> Creating multiple focused servers or
            selecting fewer endpoints.
          </Typography>
        </Alert>
      )}

      {endpoints.length > 10 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Large Collection Detected:</strong> This API has{" "}
          {endpoints.length} endpoints. Use the search below to filter endpoints
          before selection.
        </Alert>
      )}

      <TextField
        fullWidth
        placeholder="Search endpoints by path, method, or description..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setPage(0); // Reset to first page on search
        }}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">Select</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Path</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Parameters</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedEndpoints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    {searchTerm
                      ? "No endpoints match your search"
                      : "No endpoints available"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEndpoints.map((endpoint: any, index: number) => (
                <TableRow key={index} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected(endpoint)}
                      onChange={() => handleToggle(endpoint)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={endpoint.method}
                      size="small"
                      color={
                        endpoint.method === "GET"
                          ? "primary"
                          : endpoint.method === "POST"
                            ? "success"
                            : endpoint.method === "DELETE"
                              ? "error"
                              : "default"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <code>{endpoint.path}</code>
                  </TableCell>
                  <TableCell>{endpoint.description}</TableCell>
                  <TableCell>{endpoint.parameters?.length || 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredEndpoints.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
}

export default StepSelectEndpoints;
