import Handlebars from "handlebars";

// Register Handlebars helpers
export function registerHelpers() {
  // Equality helper
  Handlebars.registerHelper("eq", (a, b) => a === b);

  // JSON stringify helper
  Handlebars.registerHelper("json", (context) =>
    JSON.stringify(context, null, 2),
  );

  // Capitalize helper
  Handlebars.registerHelper("capitalize", (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Sanitize path to valid TypeScript identifier
  Handlebars.registerHelper("sanitizePath", (str: string) => {
    if (!str) return "";
    // Remove leading/trailing slashes and replace special chars with underscores
    return str
      .replace(/^\/+|\/+$/g, "") // Remove leading/trailing slashes
      .replace(/[^a-zA-Z0-9]+/g, "_") // Replace non-alphanumeric with underscore
      .replace(/^(\d)/, "_$1") // Prefix with underscore if starts with number
      .split("_")
      .filter(Boolean)
      .map((part, i) =>
        i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
      )
      .join("");
  });

  // Unless helper
  Handlebars.registerHelper(
    "unless",
    function (this: any, conditional: any, options: any) {
      return !conditional ? options.fn(this) : options.inverse(this);
    },
  );

  // Sanitize parameter name to valid TypeScript identifier or quoted property
  Handlebars.registerHelper("sanitizeParamName", (name: string) => {
    if (!name) return "";
    // If name contains invalid chars, wrap in quotes
    if (/[^a-zA-Z0-9_$]/.test(name)) {
      return new Handlebars.SafeString(`"${name}"`);
    }
    return name;
  });

  // Map OpenAPI types to TypeScript types
  Handlebars.registerHelper("mapType", (type: string) => {
    const typeMap: Record<string, string> = {
      integer: "number",
      int32: "number",
      int64: "number",
      float: "number",
      double: "number",
      number: "number",
      string: "string",
      boolean: "boolean",
      array: "any[]",
      object: "any",
    };
    return typeMap[type?.toLowerCase()] || "any";
  });

  // Enhanced type mapping with support for formats, enums, and arrays
  Handlebars.registerHelper("mapTypeEnhanced", (param: any) => {
    if (!param) return "any";

    // Handle enums first
    if (param.enum && Array.isArray(param.enum) && param.enum.length > 0) {
      // Generate a union type from enum values
      return new Handlebars.SafeString(
        param.enum.map((v: any) => JSON.stringify(v)).join(" | "),
      );
    }

    const type = param.type?.toLowerCase();
    if (!type) return "any";

    // Handle arrays with item types
    if (type === "array") {
      if (param.items) {
        const itemType = param.items.type?.toLowerCase();
        const itemTypeMap: Record<string, string> = {
          string: "string",
          number: "number",
          integer: "number",
          boolean: "boolean",
          object: "any",
        };
        const mappedItemType = itemTypeMap[itemType] || "any";
        return new Handlebars.SafeString(`${mappedItemType}[]`);
      }
      return new Handlebars.SafeString("any[]");
    }

    // Handle format-specific string types
    if (type === "string" && param.format) {
      const formatMap: Record<string, string> = {
        date: "string", // ISO date string
        "date-time": "string", // ISO datetime string
        email: "string",
        uri: "string",
        url: "string",
        uuid: "string",
        binary: "string",
        byte: "string",
      };
      return formatMap[param.format.toLowerCase()] || "string";
    }

    // Default type mapping
    const typeMap: Record<string, string> = {
      integer: "number",
      int32: "number",
      int64: "number",
      float: "number",
      double: "number",
      number: "number",
      string: "string",
      boolean: "boolean",
      object: "Record<string, any>",
    };

    const mappedType = typeMap[type] || "any";
    // Use SafeString for types with angle brackets to prevent HTML escaping
    if (mappedType.includes("<")) {
      return new Handlebars.SafeString(mappedType);
    }
    return mappedType;
  });

  // Convert header name to environment variable name
  // e.g., "X-Auth-Token" -> "X_AUTH_TOKEN"
  Handlebars.registerHelper("toEnvVarName", (str: string) => {
    if (!str) return "API_KEY";
    return str.replace(/-/g, "_").toUpperCase();
  });

  // Map OpenAPI types to Zod types for runtime validation
  Handlebars.registerHelper("zodType", (type: string, format?: string) => {
    if (!type) return "z.any()";

    const lowerType = type.toLowerCase();
    const typeMap: Record<string, string> = {
      string: "z.string()",
      number: "z.number()",
      integer: "z.number().int()",
      int32: "z.number().int()",
      int64: "z.number().int()",
      float: "z.number()",
      double: "z.number()",
      boolean: "z.boolean()",
      array: "z.array(z.any())",
      object: "z.record(z.any())",
    };

    // Handle format-specific types
    if (lowerType === "string" && format) {
      const formatMap: Record<string, string> = {
        email: "z.string().email()",
        uri: "z.string().url()",
        url: "z.string().url()",
        date: "z.string().datetime()",
        "date-time": "z.string().datetime()",
        uuid: "z.string().uuid()",
      };
      return formatMap[format.toLowerCase()] || "z.string()";
    }

    return typeMap[lowerType] || "z.any()";
  });

  // Convert to camelCase for function/variable names
  Handlebars.registerHelper("camelCase", (str: string) => {
    if (!str) return "";
    return str
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^[A-Z]/, (char) => char.toLowerCase());
  });

  // Convert to PascalCase for type names
  Handlebars.registerHelper("pascalCase", (str: string) => {
    if (!str) return "";
    return str
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^[a-z]/, (char) => char.toUpperCase());
  });

  // Check if parameter has enum values
  Handlebars.registerHelper("hasEnum", (param: any) => {
    return (
      param && param.enum && Array.isArray(param.enum) && param.enum.length > 0
    );
  });

  // Generate Zod enum from array
  Handlebars.registerHelper("zodEnum", (enumValues: any[]) => {
    if (!Array.isArray(enumValues) || enumValues.length === 0) {
      return "z.string()";
    }
    const values = enumValues.map((v) => JSON.stringify(v)).join(", ");
    return `z.enum([${values}])`;
  });

  // Generate Zod enum with required/optional handling
  Handlebars.registerHelper(
    "zodEnumWithRequired",
    function (
      this: any,
      enumValues: any[],
      fieldName: string,
      requiredArray: any,
    ) {
      if (!Array.isArray(enumValues) || enumValues.length === 0) {
        const isRequired =
          Array.isArray(requiredArray) && requiredArray.includes(fieldName);
        return isRequired ? "z.string()" : "z.string().optional()";
      }
      const values = enumValues.map((v) => JSON.stringify(v)).join(", ");
      const zodEnum = `z.enum([${values}])`;
      const isRequired =
        Array.isArray(requiredArray) && requiredArray.includes(fieldName);
      return isRequired ? zodEnum : `${zodEnum}.optional()`;
    },
  );

  // Check if a field is required in the schema
  Handlebars.registerHelper(
    "isRequired",
    function (this: any, fieldName: string, requiredArray: any) {
      if (!Array.isArray(requiredArray)) return false;
      return requiredArray.includes(fieldName);
    },
  );

  // Enhanced Zod type with proper required/optional handling and constraints
  Handlebars.registerHelper(
    "zodTypeWithRequired",
    function (
      this: any,
      propDef: any,
      fieldName: string,
      requiredArray: any,
      ...args: any[]
    ) {
      // Handle both old signature (type, format, fieldName, requiredArray) and new signature (propDef, fieldName, requiredArray)
      let type: string;
      let format: string | undefined;
      let minimum: number | undefined;
      let maximum: number | undefined;
      let minLength: number | undefined;
      let maxLength: number | undefined;
      let items: any;

      if (typeof propDef === "string") {
        // Old signature: zodTypeWithRequired(type, format, fieldName, requiredArray)
        type = propDef;
        format = fieldName as any;
        fieldName = requiredArray as any;
        requiredArray = args[0];
      } else {
        // New signature: zodTypeWithRequired(propDef, fieldName, requiredArray)
        type = propDef?.type;
        format = propDef?.format;
        minimum = propDef?.minimum;
        maximum = propDef?.maximum;
        minLength = propDef?.minLength;
        maxLength = propDef?.maxLength;
        items = propDef?.items;
      }

      if (!type) return "z.any().optional()";

      const lowerType = type.toLowerCase();
      let zodType = "";

      // Handle different types
      switch (lowerType) {
        case "string":
          zodType = "z.string()";
          // Add string-specific formats
          if (format) {
            const formatMap: Record<string, string> = {
              email: "z.string().email()",
              uri: "z.string().url()",
              url: "z.string().url()",
              date: "z.string().datetime()",
              "date-time": "z.string().datetime()",
              uuid: "z.string().uuid()",
            };
            zodType = formatMap[format.toLowerCase()] || "z.string()";
          }
          // Add length constraints
          if (minLength !== undefined) {
            zodType += `.min(${minLength})`;
          }
          if (maxLength !== undefined) {
            zodType += `.max(${maxLength})`;
          }
          break;

        case "number":
        case "integer":
        case "int32":
        case "int64":
        case "float":
        case "double":
          zodType = lowerType.includes("int")
            ? "z.number().int()"
            : "z.number()";
          // Add numeric constraints
          if (minimum !== undefined) {
            zodType += `.min(${minimum})`;
          }
          if (maximum !== undefined) {
            zodType += `.max(${maximum})`;
          }
          break;

        case "boolean":
          zodType = "z.boolean()";
          break;

        case "array":
          // Try to infer array item type from items property
          if (items?.type) {
            const itemType = items.type.toLowerCase();
            const itemTypeMap: Record<string, string> = {
              string: "z.string()",
              number: "z.number()",
              integer: "z.number().int()",
              boolean: "z.boolean()",
              object: "z.record(z.any())",
            };
            zodType = `z.array(${itemTypeMap[itemType] || "z.any()"})`;
          } else {
            zodType = "z.array(z.any())";
          }
          break;

        case "object":
          zodType = "z.record(z.any())";
          break;

        default:
          zodType = "z.any()";
      }

      // Add .optional() if field is not in required array
      const isRequired =
        Array.isArray(requiredArray) && requiredArray.includes(fieldName);
      return isRequired ? zodType : `${zodType}.optional()`;
    },
  );
}

export default registerHelpers;
