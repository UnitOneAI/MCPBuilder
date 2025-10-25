import axios from "axios";
import YAML from "yaml";
import type {
  ApiConfig,
  OpenAPISpec,
  OpenAPIOperation,
} from "../types/index.js";

export class ApiParser {
  private currentSpec?: OpenAPISpec; // Store current spec for reference resolution

  /**
   * Sanitize description text for safe use in generated code
   * Removes newlines, collapses whitespace, escapes quotes, and decodes HTML entities
   */
  private sanitizeDescription(description: string | undefined): string {
    if (!description) return "";

    return description
      .replace(/&lt;/g, "<") // Decode HTML entities
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x60;/g, "`")
      .replace(/&amp;/g, "&")
      .replace(/\r?\n/g, " ") // Replace newlines with spaces
      .replace(/\s+/g, " ") // Collapse multiple spaces into one
      .replace(/'/g, "\\'") // Escape single quotes
      .trim();
  }

  /**
   * Parse OpenAPI/Swagger specification
   */
  async parseOpenApi(specUrlOrJson: string): Promise<Partial<ApiConfig>> {
    let spec: OpenAPISpec;

    // Check if it's a URL or JSON/YAML string
    if (specUrlOrJson.startsWith("http")) {
      const response = await axios.get(specUrlOrJson, {
        responseType: "text", // Always get as text first
      });

      // Parse the response (could be JSON or YAML)
      if (typeof response.data === "string") {
        try {
          spec = JSON.parse(response.data);
        } catch {
          try {
            spec = YAML.parse(response.data);
          } catch {
            throw new Error(
              "Invalid OpenAPI specification from URL: must be valid JSON or YAML format",
            );
          }
        }
      } else {
        // Already parsed as JSON by axios
        spec = response.data;
      }
    } else {
      // Try to parse as JSON first, then fall back to YAML
      try {
        spec = JSON.parse(specUrlOrJson);
      } catch {
        try {
          spec = YAML.parse(specUrlOrJson);
        } catch {
          throw new Error(
            "Invalid OpenAPI specification: must be valid JSON or YAML format",
          );
        }
      }
    }

    // Store spec for reference resolution
    this.currentSpec = spec;

    // Validate spec structure
    this.validateSpec(spec);

    // Extract API information
    const apiConfig: Partial<ApiConfig> = {
      name: spec.info.title,
      description: spec.info.description,
      baseUrl: spec.servers?.[0]?.url || "",
      endpoints: [],
      authType: this.detectAuthType(spec),
    };

    // Parse endpoints
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!["get", "post", "put", "delete", "patch"].includes(method))
          continue;

        const op = operation as OpenAPIOperation;

        // Combine summary and description for better AI context
        let description = "";
        const summary = op.summary?.trim() || "";
        const desc = op.description?.trim() || "";

        if (summary && desc && summary !== desc) {
          // Both exist and are different - combine them
          description = `${summary}. ${desc}`;
        } else {
          // Use whichever exists, preferring description
          description = desc || summary || "";
        }

        // Sanitize description for use in generated code
        description = this.sanitizeDescription(description);

        apiConfig.endpoints!.push({
          path,
          method: method.toUpperCase() as
            | "GET"
            | "POST"
            | "PUT"
            | "DELETE"
            | "PATCH",
          description,
          operationId: op.operationId,
          parameters: this.extractParameters(op),
        });
      }
    }

    return apiConfig;
  }

  /**
   * Parse API documentation from text/markdown
   */
  parseDocumentation(documentation: string): Partial<ApiConfig> {
    // This is a simple heuristic parser
    // In production, you might want to use an LLM to extract structured data

    const endpoints: ApiConfig["endpoints"] = [];
    const lines = documentation.split("\n");

    let currentEndpoint: any = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Detect HTTP method and path (e.g., GET /api/users)
      const methodMatch = trimmedLine.match(
        /^(GET|POST|PUT|DELETE|PATCH)\s+(.+?)\s*[-–—]\s*(.+)/i,
      );
      if (methodMatch) {
        if (currentEndpoint) {
          endpoints.push(currentEndpoint);
        }

        const method = methodMatch[1].toUpperCase();
        const path = methodMatch[2].trim();

        currentEndpoint = {
          method,
          path,
          description: methodMatch[3].trim(),
          operationId: this.generateOperationId(method, path),
          parameters: [],
        };
        continue;
      }

      // Detect parameters (supports various formats)
      const paramMatch = trimmedLine.match(
        /[-*]\s*`?(\w+)`?\s*\((\w+)\)\s*[-:–—]\s*(.+)/,
      );
      if (paramMatch && currentEndpoint) {
        currentEndpoint.parameters.push({
          name: paramMatch[1],
          type: paramMatch[2],
          required: trimmedLine.toLowerCase().includes("required"),
          description: this.sanitizeDescription(paramMatch[3]),
        });
      }
    }

    if (currentEndpoint) {
      endpoints.push(currentEndpoint);
    }

    return {
      endpoints,
    };
  }

  /**
   * Parse Postman collection
   */
  async parsePostmanCollection(
    collectionUrlOrJson: string,
  ): Promise<Partial<ApiConfig>> {
    let collection: any;

    // Check if it's a URL or JSON string
    if (collectionUrlOrJson.startsWith("http")) {
      const response = await axios.get(collectionUrlOrJson);
      collection = response.data;
    } else {
      collection = JSON.parse(collectionUrlOrJson);
    }

    const apiConfig: Partial<ApiConfig> = {
      name: collection.info.name,
      description: collection.info.description,
      endpoints: [],
      baseUrl: "", // Default to empty string
    };

    // Detect authentication from collection-level auth or first request
    const authInfo = this.detectPostmanAuth(collection);
    apiConfig.authType = authInfo.type;
    if (authInfo.config) {
      apiConfig.authConfig = authInfo.config;
    }

    // Extract base URL from first request
    if (collection.item && collection.item.length > 0) {
      const firstRequest = this.findFirstRequest(collection.item);
      if (firstRequest && firstRequest.request.url) {
        const url =
          typeof firstRequest.request.url === "string"
            ? firstRequest.request.url
            : firstRequest.request.url.raw;
        const extractedUrl = this.extractBaseUrl(url);
        if (extractedUrl) {
          apiConfig.baseUrl = extractedUrl;
        }
      }
    }

    // Parse requests
    this.parsePostmanItems(collection.item, apiConfig.endpoints!);

    return apiConfig;
  }

  /**
   * Validate OpenAPI specification structure
   */
  private validateSpec(spec: any): void {
    if (!spec.openapi && !spec.swagger) {
      throw new Error(
        'Invalid OpenAPI specification: missing required field "openapi" or "swagger"',
      );
    }

    if (!spec.info) {
      throw new Error(
        'Invalid OpenAPI specification: missing required field "info"',
      );
    }

    if (!spec.info.title) {
      throw new Error(
        'Invalid OpenAPI specification: missing required field "info.title"',
      );
    }

    if (!spec.info.version) {
      throw new Error(
        'Invalid OpenAPI specification: missing required field "info.version"',
      );
    }

    if (!spec.paths && !spec.components && !spec.webhooks) {
      throw new Error(
        'Invalid OpenAPI specification: must have at least one of "paths", "components", or "webhooks"',
      );
    }
  }

  /**
   * Detect authentication type from OpenAPI spec
   */
  private detectAuthType(
    spec: OpenAPISpec,
  ): "none" | "bearer" | "apiKey" | "oauth2" {
    if (!spec.components?.securitySchemes) return "none";

    const schemes = spec.components.securitySchemes;

    for (const scheme of Object.values(schemes)) {
      if (scheme.type === "http" && scheme.scheme === "bearer") {
        return "bearer";
      }
      if (scheme.type === "apiKey") {
        return "apiKey";
      }
      if (scheme.type === "oauth2") {
        return "oauth2";
      }
    }

    return "none";
  }

  /**
   * Resolve a $ref reference to its actual value
   */
  private resolveRef(ref: string): any {
    if (!this.currentSpec) return null;

    // Remove the leading '#/' and split by '/'
    const parts = ref.replace(/^#\//, "").split("/");

    let current: any = this.currentSpec;
    for (const part of parts) {
      if (!current || !(part in current)) return null;
      current = current[part];
    }

    return current;
  }

  /**
   * Extract parameters from OpenAPI operation
   */
  private extractParameters(operation: OpenAPIOperation): any[] {
    const params: any[] = [];

    if (operation.parameters) {
      for (const param of operation.parameters) {
        let resolvedParam = param;

        // Resolve $ref if present
        if ("$ref" in param && typeof param.$ref === "string") {
          const resolved = this.resolveRef(param.$ref);
          if (!resolved) continue; // Skip if we can't resolve
          resolvedParam = resolved;
        }

        // Only add parameters that have a name
        if (resolvedParam.name) {
          params.push({
            name: resolvedParam.name,
            in: resolvedParam.in,
            type: resolvedParam.schema?.type || "string",
            required: resolvedParam.required || false,
            description: this.sanitizeDescription(resolvedParam.description),
            enum: resolvedParam.schema?.enum,
          });
        }
      }
    }

    // Extract from request body
    if (operation.requestBody?.content) {
      // Try different content types
      const contentTypes = [
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data",
      ];

      for (const contentType of contentTypes) {
        const mediaType = operation.requestBody.content[contentType];
        if (mediaType?.schema) {
          let schema = mediaType.schema;

          // Resolve $ref if present
          if ("$ref" in schema && typeof schema.$ref === "string") {
            schema = this.resolveRef(schema.$ref);
          }

          // Extract parameters from schema with circular reference protection
          const visitedRefs = new Set<string>();
          const bodyParams = this.extractSchemaProperties(
            schema,
            "",
            visitedRefs,
          );
          params.push(...bodyParams);
          break; // Use first available content type
        }
      }
    }

    return params;
  }

  /**
   * Extract properties from schema with support for composition keywords and nested objects
   * Includes circular reference protection to prevent infinite loops
   */
  private extractSchemaProperties(
    schema: any,
    prefix: string,
    visitedRefs: Set<string> = new Set(),
    depth: number = 0,
  ): any[] {
    if (!schema) return [];

    // Limit nesting depth to prevent excessive recursion (even without circular refs)
    const MAX_DEPTH = 5;
    if (depth > MAX_DEPTH) return [];

    const params: any[] = [];

    // Handle composition keywords: allOf, oneOf, anyOf
    for (const compositionKey of ["allOf", "oneOf", "anyOf"]) {
      if (schema[compositionKey] && Array.isArray(schema[compositionKey])) {
        for (const subSchema of schema[compositionKey]) {
          let resolved = subSchema;

          // Resolve $ref if present
          if ("$ref" in subSchema && typeof subSchema.$ref === "string") {
            const refKey = subSchema.$ref;

            // Skip if we've already visited this reference
            if (visitedRefs.has(refKey)) continue;

            visitedRefs.add(refKey);
            resolved = this.resolveRef(refKey);
          }

          // Recursively extract properties from composed schemas
          if (resolved) {
            params.push(
              ...this.extractSchemaProperties(
                resolved,
                prefix,
                visitedRefs,
                depth + 1,
              ),
            );
          }
        }
      }
    }

    // Handle object properties
    if (schema.type === "object" && schema.properties) {
      const requiredFields = schema.required || [];

      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const prop = propSchema as any;
        const fullName = prefix ? `${prefix}.${propName}` : propName;

        // Resolve $ref if present in property
        let resolvedProp = prop;
        if ("$ref" in prop && typeof prop.$ref === "string") {
          const refKey = prop.$ref;

          // Skip if circular reference
          if (visitedRefs.has(refKey)) {
            params.push({
              name: fullName,
              type: "object",
              required: requiredFields.includes(propName),
              description: this.sanitizeDescription(
                prop.description || `Circular reference to ${refKey}`,
              ),
            });
            continue;
          }

          visitedRefs.add(refKey);
          resolvedProp = this.resolveRef(refKey);
        }

        // Handle nested objects recursively
        if (resolvedProp.type === "object" && resolvedProp.properties) {
          params.push(
            ...this.extractSchemaProperties(
              resolvedProp,
              fullName,
              visitedRefs,
              depth + 1,
            ),
          );
        }
        // Handle arrays
        else if (resolvedProp.type === "array" && resolvedProp.items) {
          let itemSchema = resolvedProp.items;

          // Resolve $ref in array items
          if ("$ref" in itemSchema && typeof itemSchema.$ref === "string") {
            const refKey = itemSchema.$ref;

            // Skip if circular reference in array items
            if (visitedRefs.has(refKey)) {
              params.push({
                name: fullName,
                type: "array",
                items: "object",
                required: requiredFields.includes(propName),
                description: this.sanitizeDescription(
                  resolvedProp.description ||
                    `Array with circular reference to ${refKey}`,
                ),
              });
              continue;
            }

            visitedRefs.add(refKey);
            itemSchema = this.resolveRef(refKey);
          }

          // If array items are objects, extract their properties
          if (itemSchema.type === "object" && itemSchema.properties) {
            params.push(
              ...this.extractSchemaProperties(
                itemSchema,
                `${fullName}[]`,
                visitedRefs,
                depth + 1,
              ),
            );
          } else {
            // Simple array type
            params.push({
              name: fullName,
              type: "array",
              items: itemSchema.type || "string",
              required: requiredFields.includes(propName),
              description: this.sanitizeDescription(resolvedProp.description),
              enum: itemSchema.enum,
            });
          }
        }
        // Handle simple properties
        else {
          params.push({
            name: fullName,
            type: resolvedProp.type || "string",
            required: requiredFields.includes(propName),
            description: this.sanitizeDescription(resolvedProp.description),
            enum: resolvedProp.enum,
            format: resolvedProp.format,
          });
        }
      }
    }
    // Handle array type at schema level
    else if (schema.type === "array" && schema.items) {
      let itemSchema = schema.items;

      // Resolve $ref in array items
      if ("$ref" in itemSchema && typeof itemSchema.$ref === "string") {
        const refKey = itemSchema.$ref;

        if (!visitedRefs.has(refKey)) {
          visitedRefs.add(refKey);
          itemSchema = this.resolveRef(refKey);
        }
      }

      if (itemSchema.type === "object" && itemSchema.properties) {
        params.push(
          ...this.extractSchemaProperties(
            itemSchema,
            prefix ? `${prefix}[]` : "[]",
            visitedRefs,
            depth + 1,
          ),
        );
      }
    }

    return params;
  }

  /**
   * Find first request in Postman collection
   */
  private findFirstRequest(items: any[]): any {
    for (const item of items) {
      if (item.request) return item;
      if (item.item) {
        const found = this.findFirstRequest(item.item);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Extract base URL from full URL
   */
  private extractBaseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // If URL parsing fails (e.g., contains variables like {{baseUrl}}), return empty string
      return "";
    }
  }

  /**
   * Parse Postman collection items recursively
   */
  private parsePostmanItems(items: any[], endpoints: any[]): void {
    for (const item of items) {
      if (item.request) {
        const url =
          typeof item.request.url === "string"
            ? item.request.url
            : item.request.url.raw;

        const path = this.extractPath(url);
        const method = item.request.method;

        endpoints.push({
          path,
          method,
          description: item.name || "",
          operationId: this.generateOperationId(method, path),
          parameters: this.extractPostmanParameters(item.request),
        });
      }

      if (item.item) {
        this.parsePostmanItems(item.item, endpoints);
      }
    }
  }

  /**
   * Generate operationId from method and path
   * e.g., GET /submissions -> getSubmissions
   * e.g., POST /submissions/{id}/documents -> postSubmissionsIdDocuments
   */
  private generateOperationId(method: string, path: string): string {
    // Convert method to lowercase
    const methodLower = method.toLowerCase();

    // Clean and convert path to camelCase
    // Remove leading slash and split by /
    const pathParts = path
      .replace(/^\//, "") // Remove leading slash
      .split("/")
      .filter((part) => part.length > 0) // Remove empty parts
      .map((part) => {
        // Replace path parameters {id} with just "id"
        if (part.startsWith("{") && part.endsWith("}")) {
          return part.slice(1, -1);
        }
        // Replace hyphens and underscores with spaces for proper casing
        return part.replace(/[-_]/g, " ");
      })
      .map((part) => {
        // Convert to title case for all parts
        return part
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("");
      })
      .join("");

    return methodLower + (pathParts || "Root");
  }

  /**
   * Extract path from URL
   */
  private extractPath(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      // If not a valid URL (e.g., contains {{variables}}), extract the path part
      // Remove protocol and host if present
      let path = url;

      // Remove variables like {{baseUrl}}, {{host}}, etc.
      path = path.replace(/\{\{[^}]+\}\}/g, "");

      // If it starts with http/https, try to extract pathname
      if (path.startsWith("http://") || path.startsWith("https://")) {
        const parts = path.split("/");
        path = "/" + parts.slice(3).join("/");
      }

      // Ensure it starts with /
      if (!path.startsWith("/")) {
        path = "/" + path;
      }

      // Clean up double slashes
      path = path.replace(/\/+/g, "/");

      return path;
    }
  }

  /**
   * Extract parameters from Postman request
   */
  private extractPostmanParameters(request: any): any[] {
    const params: any[] = [];

    // Query parameters
    if (request.url?.query) {
      for (const param of request.url.query) {
        params.push({
          name: param.key,
          type: "string",
          required: !param.disabled,
          description: this.sanitizeDescription(param.description),
        });
      }
    }

    // Body parameters
    if (request.body?.mode === "raw") {
      try {
        const body = JSON.parse(request.body.raw);
        for (const [key, value] of Object.entries(body)) {
          params.push({
            name: key,
            type: typeof value,
            required: true,
            description: "",
          });
        }
      } catch {
        // Ignore parse errors
      }
    }

    return params;
  }

  /**
   * Detect authentication type from Postman collection
   * Checks collection-level auth and first request auth
   */
  private detectPostmanAuth(collection: any): {
    type: "none" | "bearer" | "apiKey" | "oauth2";
    config?: Record<string, string>;
  } {
    // Check collection-level auth first
    let auth = collection.auth;

    // Check if collection-level auth has detailed config
    const hasDetailedConfig =
      auth &&
      ((auth.type === "apikey" && auth.apikey && auth.apikey.length > 0) ||
        (auth.type === "bearer" && auth.bearer) ||
        (auth.type === "oauth2" && auth.oauth2));

    // If no collection-level auth OR no detailed config, check first request
    if (
      (!auth || auth.type === "noauth" || !hasDetailedConfig) &&
      collection.item &&
      collection.item.length > 0
    ) {
      const firstRequest = this.findFirstRequest(collection.item);
      if (firstRequest?.request?.auth) {
        auth = firstRequest.request.auth;
      }
    }

    if (!auth || auth.type === "noauth") {
      return { type: "none" };
    }

    // Map Postman auth types to our types
    switch (auth.type) {
      case "bearer":
        return {
          type: "bearer",
          config: { headerName: "Authorization" },
        };

      case "apikey": {
        // Extract the key name from Postman's apikey config
        // apikey is an array of objects with key-value pairs
        const apikeyConfig = auth.apikey || [];
        const keyItem = apikeyConfig.find((item: any) => item.key === "key");
        const inItem = apikeyConfig.find((item: any) => item.key === "in");

        const headerName = keyItem?.value || "X-API-Key";
        const location = inItem?.value || "header";

        return {
          type: "apiKey",
          config: {
            headerName,
            location,
          },
        };
      }

      case "oauth2":
        return {
          type: "oauth2",
          config: { headerName: "Authorization" },
        };

      default:
        // For other types, default to none
        return { type: "none" };
    }
  }
}

export default ApiParser;
