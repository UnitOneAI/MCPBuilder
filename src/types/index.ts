import { z } from 'zod';

// API Configuration Schema
export const ApiConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  baseUrl: z.string().url('Must be a valid URL').or(z.string().length(0)).default(''),
  authType: z.enum(['none', 'bearer', 'apiKey', 'oauth2']).default('none'),
  authConfig: z.record(z.string()).optional(),
  openApiSpec: z.string().optional(), // URL or JSON string
  endpoints: z.array(z.object({
    path: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    description: z.string().optional(),
    operationId: z.string().optional(),
    parameters: z.array(z.object({
      name: z.string(),
      in: z.string().optional(),
      type: z.string(),
      items: z.string().optional(), // For array types
      required: z.boolean().default(false),
      description: z.string().optional(),
      enum: z.array(z.any()).optional(),
      format: z.string().optional(),
    })).optional(),
  })).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

// MCP Server Configuration Schema
export const McpServerConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Server name is required'),
  description: z.string().optional(),
  apiConfigId: z.string(),
  transport: z.literal('stdio').default('stdio'),
  tools: z.array(z.object({
    name: z.string().optional(), // Generated from operationId if not provided
    description: z.string(),
    inputSchema: z.record(z.any()).optional(), // Generated from parameters if not provided
    endpoint: z.string(),
    method: z.string(),
    operationId: z.string().optional(),
    parameters: z.array(z.object({
      name: z.string(),
      in: z.string().optional(),
      type: z.string(),
      items: z.string().optional(),
      required: z.boolean().default(false),
      description: z.string().optional(),
      enum: z.array(z.any()).optional(),
      format: z.string().optional(),
    })).optional(),
  })).optional(),
  status: z.enum(['draft', 'active', 'inactive', 'error']).default('draft'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

// Deployment Configuration Schema
export const DeploymentConfigSchema = z.object({
  id: z.string().optional(),
  mcpServerId: z.string(),
  status: z.enum(['pending', 'deploying', 'running', 'stopped', 'failed', 'ready']).default('pending'),
  phase: z.enum(['pending', 'installing', 'installed', 'building', 'built', 'starting', 'ready', 'running', 'stopped', 'failed']).default('pending'),
  processId: z.number().optional(),
  port: z.number().optional(),
  startedAt: z.string().optional(),
  stoppedAt: z.string().optional(),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

// OpenAPI Schema Types
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema: {
    type: string;
    format?: string;
    enum?: string[];
  };
}

export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: {
    description?: string;
    required?: boolean;
    content: Record<string, any>;
  };
  responses: Record<string, any>;
}

export interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, OpenAPIPath>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

// Generator Options
export interface GeneratorOptions {
  apiConfig: ApiConfig;
  serverConfig: McpServerConfig;
  outputDir: string;
  transport: 'stdio';
}

// Generated Server Metadata
export interface GeneratedServer {
  id: string;
  name: string;
  path: string;
  files: string[];
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
