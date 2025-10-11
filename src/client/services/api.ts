import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // API Configurations
  getApiConfigs: () => api.get('/configs'),
  getApiConfig: (id: string) => api.get(`/configs/${id}`),
  createApiConfig: (data: any) => api.post('/configs', data),
  updateApiConfig: (id: string, data: any) => api.put(`/configs/${id}`, data),
  deleteApiConfig: (id: string) => api.delete(`/configs/${id}`),

  // MCP Servers
  getMcpServers: () => api.get('/servers'),
  getMcpServer: (id: string) => api.get(`/servers/${id}`),
  createMcpServer: (data: any) => api.post('/servers', data),
  updateMcpServer: (id: string, data: any) => api.put(`/servers/${id}`, data),
  deleteMcpServer: (id: string) => api.delete(`/servers/${id}`),
  generateServer: (id: string) => api.post(`/servers/${id}/generate`),

  // Deployments
  getDeployment: (serverId: string) => api.get(`/deployments/server/${serverId}`),
  deployServer: (serverId: string) => api.post(`/deployments/${serverId}/deploy`),
  stopServer: (serverId: string) => api.post(`/deployments/${serverId}/stop`),

  // Parser
  parseOpenApi: (spec: string) => api.post('/parser/openapi', { spec }),
  parseDocumentation: (documentation: string) => api.post('/parser/documentation', { documentation }),
  parsePostman: (collection: string) => api.post('/parser/postman', { collection }),
};

export default api;
