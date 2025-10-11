import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  ApiConfig,
  McpServerConfig,
  GeneratorOptions,
  GeneratedServer,
} from '../types/index.js';
import { registerHelpers } from './handlebars-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class McpGenerator {
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    registerHelpers();
  }

  /**
   * Generate an MCP server from API configuration
   */
  async generate(options: GeneratorOptions): Promise<GeneratedServer> {
    const { apiConfig, serverConfig, outputDir } = options;

    // Create output directory
    const serverDir = path.join(outputDir, this.sanitizeName(serverConfig.name));
    await fs.mkdir(serverDir, { recursive: true });

    // Generate files
    const files: string[] = [];

    // 1. Generate package.json
    const packageJsonPath = await this.generatePackageJson(serverDir, serverConfig);
    files.push(packageJsonPath);

    // 2. Generate tsconfig.json
    const tsconfigPath = await this.generateTsConfig(serverDir);
    files.push(tsconfigPath);

    // 3. Generate main server file
    const serverFilePath = await this.generateServerFile(
      serverDir,
      apiConfig,
      serverConfig
    );
    files.push(serverFilePath);

    // 4. Generate types file
    const typesFilePath = await this.generateTypesFile(serverDir, apiConfig);
    files.push(typesFilePath);

    // 5. Generate README
    const readmePath = await this.generateReadme(serverDir, serverConfig, apiConfig);
    files.push(readmePath);

    // 6. Generate .env.example
    const envExamplePath = await this.generateEnvExample(serverDir, apiConfig);
    files.push(envExamplePath);

    // 7. Generate .vscode folder for VS Code integration
    const vscodeFiles = await this.generateVsCodeConfig(serverDir, serverConfig, apiConfig);
    files.push(...vscodeFiles);

    return {
      id: serverConfig.id || crypto.randomUUID(),
      name: serverConfig.name,
      path: serverDir,
      files,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generate package.json file
   */
  private async generatePackageJson(
    serverDir: string,
    config: McpServerConfig
  ): Promise<string> {
    const template = await this.loadTemplate('package.json.hbs');
    const compiled = Handlebars.compile(template);

    const content = compiled({
      name: this.sanitizeName(config.name),
      description: config.description || 'Built by UNITONE MCP Builder',
      version: '1.0.0',
      transport: config.transport,
    });

    const filePath = path.join(serverDir, 'package.json');
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Generate tsconfig.json file
   */
  private async generateTsConfig(serverDir: string): Promise<string> {
    const template = await this.loadTemplate('tsconfig.json.hbs');
    const compiled = Handlebars.compile(template);
    const content = compiled({});

    const filePath = path.join(serverDir, 'tsconfig.json');
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Generate main server file
   */
  private async generateServerFile(
    serverDir: string,
    apiConfig: ApiConfig,
    serverConfig: McpServerConfig
  ): Promise<string> {
    // Always use STDIO transport template
    const template = await this.loadTemplate('server-stdio.ts.hbs');
    const compiled = Handlebars.compile(template);

    // Build tools from API endpoints
    const tools = this.buildToolsFromApi(apiConfig, serverConfig);

    const content = compiled({
      serverName: serverConfig.name,
      serverVersion: '1.0.0',
      tools,
      apiBaseUrl: apiConfig.baseUrl,
      authType: apiConfig.authType,
    });

    const srcDir = path.join(serverDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    const filePath = path.join(srcDir, 'index.ts');
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Generate types file
   */
  private async generateTypesFile(serverDir: string, apiConfig: ApiConfig): Promise<string> {
    const template = await this.loadTemplate('types.ts.hbs');
    const compiled = Handlebars.compile(template);

    // Deduplicate parameters for each endpoint to prevent TypeScript errors
    const endpointsWithDeduplicatedParams = (apiConfig.endpoints || []).map(endpoint => ({
      ...endpoint,
      parameters: this.deduplicateParameters(endpoint.parameters || [])
    }));

    const content = compiled({
      endpoints: endpointsWithDeduplicatedParams,
    });

    const srcDir = path.join(serverDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    const filePath = path.join(srcDir, 'types.ts');
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Process parameters with prefixes to avoid naming conflicts
   * Path parameters get 'path_' prefix, query parameters get 'query_' prefix
   * Body parameters keep their original names
   */
  private deduplicateParameters(parameters: any[]): any[] {
    const seen = new Set<string>();
    const processed: any[] = [];

    for (const param of parameters) {
      let paramName = param.name;

      // Add prefix based on parameter location to avoid conflicts
      if (param.in === 'path') {
        paramName = `path_${param.name}`;
      } else if (param.in === 'query') {
        paramName = `query_${param.name}`;
      } else if (param.in === 'header') {
        paramName = `header_${param.name}`;
      }
      // Body parameters (no 'in' field) keep original name

      if (!seen.has(paramName)) {
        processed.push({
          ...param,
          name: paramName
        });
        seen.add(paramName);
      }
    }

    return processed;
  }

  /**
   * Generate README.md file
   */
  private async generateReadme(
    serverDir: string,
    serverConfig: McpServerConfig,
    apiConfig: ApiConfig
  ): Promise<string> {
    const template = await this.loadTemplate('README.md.hbs');
    const compiled = Handlebars.compile(template);

    const content = compiled({
      name: serverConfig.name,
      description: serverConfig.description || 'Built by UNITONE MCP Builder',
      apiName: apiConfig.name,
      apiBaseUrl: apiConfig.baseUrl,
      transport: serverConfig.transport,
      tools: serverConfig.tools || [],
    });

    const filePath = path.join(serverDir, 'README.md');
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Generate .env.example file
   */
  private async generateEnvExample(serverDir: string, apiConfig: ApiConfig): Promise<string> {
    const template = await this.loadTemplate('.env.example.hbs');
    const compiled = Handlebars.compile(template);

    const content = compiled({
      apiBaseUrl: apiConfig.baseUrl,
      authType: apiConfig.authType,
      needsApiKey: apiConfig.authType === 'apiKey' || apiConfig.authType === 'bearer' || apiConfig.authType === 'oauth2',
    });

    const filePath = path.join(serverDir, '.env.example');
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Generate .vscode configuration folder
   */
  private async generateVsCodeConfig(
    serverDir: string,
    serverConfig: McpServerConfig,
    apiConfig: ApiConfig
  ): Promise<string[]> {
    const vscodeDir = path.join(serverDir, '.vscode');
    await fs.mkdir(vscodeDir, { recursive: true });

    const files: string[] = [];

    const templateData = {
      serverName: serverConfig.name,
      transport: serverConfig.transport,
      apiBaseUrl: apiConfig.baseUrl,
      authType: apiConfig.authType,
    };

    // Generate launch.json
    const launchTemplate = await this.loadTemplate('.vscode/launch.json.hbs');
    const launchCompiled = Handlebars.compile(launchTemplate);
    const launchContent = launchCompiled(templateData);
    const launchPath = path.join(vscodeDir, 'launch.json');
    await fs.writeFile(launchPath, launchContent, 'utf-8');
    files.push(launchPath);

    // Generate mcp.json
    const mcpTemplate = await this.loadTemplate('.vscode/mcp.json.hbs');
    const mcpCompiled = Handlebars.compile(mcpTemplate);
    const mcpContent = mcpCompiled(templateData);
    const mcpPath = path.join(vscodeDir, 'mcp.json');
    await fs.writeFile(mcpPath, mcpContent, 'utf-8');
    files.push(mcpPath);

    // Generate tasks.json
    const tasksTemplate = await this.loadTemplate('.vscode/tasks.json.hbs');
    const tasksCompiled = Handlebars.compile(tasksTemplate);
    const tasksContent = tasksCompiled(templateData);
    const tasksPath = path.join(vscodeDir, 'tasks.json');
    await fs.writeFile(tasksPath, tasksContent, 'utf-8');
    files.push(tasksPath);

    return files;
  }

  /**
   * Build MCP tools from API configuration
   */
  private buildToolsFromApi(apiConfig: ApiConfig, serverConfig: McpServerConfig): any[] {
    const tools: any[] = [];

    // Use predefined tools from server config if available
    const sourceTools = serverConfig.tools && serverConfig.tools.length > 0
      ? serverConfig.tools
      : apiConfig.endpoints || [];

    for (const tool of sourceTools) {
      // Normalize endpoint property (tools have 'endpoint', apiConfig endpoints have 'path')
      const endpoint = 'endpoint' in tool ? tool.endpoint : tool.path;

      // Generate tool name from operationId (preferred) or path+method
      const toolName = this.generateToolName(
        endpoint,
        tool.method,
        tool.operationId
      );

      const inputSchema: any = {
        type: 'object',
        properties: {},
        required: [],
      };

      // Add parameters to input schema
      // Deduplicate parameters to add prefixes (path_, query_, header_)
      const parameters = this.deduplicateParameters(tool.parameters || []);
      for (const param of parameters) {
        const propertySchema: any = {
          type: param.type,
          description: param.description || '',
        };

        // Add items property for array types (required by JSON Schema spec)
        if (param.type === 'array') {
          propertySchema.items = {
            type: param.items || 'string'  // Default to string if items type not specified
          };
        }

        inputSchema.properties[param.name] = propertySchema;

        if (param.required) {
          inputSchema.required.push(param.name);
        }
      }

      tools.push({
        name: toolName,
        description: tool.description || `${tool.method} ${endpoint}`,
        inputSchema,
        endpoint: endpoint,
        method: tool.method,
      });
    }

    return tools;
  }

  /**
   * Generate a tool name from endpoint information
   * Prefers operationId if available, otherwise falls back to path+method
   */
  private generateToolName(path: string, method: string, operationId?: string): string {
    // If operationId exists, use it (convert to snake_case)
    if (operationId) {
      return operationId
        .replace(/\./g, '_') // users.list -> users_list
        .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase -> snake_case
        .toLowerCase();
    }

    // Fallback: Generate from path and method
    // Include path parameters to avoid collisions
    const pathParts = path
      .split('/')
      .filter(p => p)
      .map(p => {
        // Convert {user-id} to ById, {id} to ById
        if (p.startsWith('{') && p.endsWith('}')) {
          const param = p.slice(1, -1).replace(/-/g, '_');
          return 'By' + param.charAt(0).toUpperCase() + param.slice(1);
        }
        return p;
      })
      .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)));

    const methodPrefix = method.toLowerCase();
    const toolName = methodPrefix + pathParts.join('');

    return this.sanitizeToolName(toolName);
  }

  /**
   * Sanitize tool name to match MCP requirements
   * MCP tool names must contain only alphanumeric characters, underscores, and hyphens
   */
  private sanitizeToolName(name: string): string {
    return name
      // Remove any invalid characters (keep only alphanumeric, underscore, hyphen)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      // Replace multiple consecutive underscores/hyphens with single underscore
      .replace(/[_-]+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
      // Ensure it's not empty
      || 'tool';
  }

  /**
   * Sanitize name for file system
   */
  private sanitizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  /**
   * Load template file
   */
  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(this.templatesDir, templateName);
    return await fs.readFile(templatePath, 'utf-8');
  }

  /**
   * Parse OpenAPI spec and create API config
   */
  async parseOpenApiSpec(_specUrl: string): Promise<Partial<ApiConfig>> {
    // This would fetch and parse the OpenAPI spec
    // For now, return a placeholder
    throw new Error('OpenAPI parsing not yet implemented');
  }
}

export default McpGenerator;
