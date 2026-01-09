/**
 * Tool - Custom Tool para agentes
 *
 * Baseado em: https://opencode.ai/docs/custom-tools
 */

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  default?: any;
  properties?: Record<string, ToolParameter>; // Para tipo object
  items?: ToolParameter; // Para tipo array
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  requiresApproval?: boolean;
  category?: string;
  tags?: string[];
}

export interface ToolExecutionContext {
  tenantId: string;
  userId?: string;
  chatId?: string;
  messageId?: string;
  variables?: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export abstract class Tool {
  abstract definition: ToolDefinition;

  abstract execute(
    context: ToolExecutionContext,
    parameters: Record<string, any>
  ): Promise<ToolExecutionResult>;

  /**
   * Valida os parâmetros antes da execução
   */
  validateParameters(parameters: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of this.definition.parameters) {
      const value = parameters[param.name];

      // Verifica required
      if (param.required && (value === undefined || value === null)) {
        errors.push(`Parameter '${param.name}' is required`);
        continue;
      }

      // Se não é required e está ausente, tudo bem
      if (value === undefined || value === null) {
        continue;
      }

      // Valida tipo
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== param.type) {
        errors.push(`Parameter '${param.name}' must be of type ${param.type}, got ${actualType}`);
      }

      // Valida enum
      if (param.enum && !param.enum.includes(value)) {
        errors.push(`Parameter '${param.name}' must be one of: ${param.enum.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converte Tool para formato do OpenCode AI SDK
   */
  toOpencodeFormat() {
    return {
      type: 'function',
      function: {
        name: this.definition.id,
        description: this.definition.description,
        parameters: {
          type: 'object',
          properties: this.parametersToJsonSchema(),
          required: this.definition.parameters
            .filter(p => p.required)
            .map(p => p.name),
        },
      },
    };
  }

  private parametersToJsonSchema(): Record<string, any> {
    const schema: Record<string, any> = {};

    for (const param of this.definition.parameters) {
      schema[param.name] = {
        type: param.type,
        description: param.description,
      };

      if (param.enum) {
        schema[param.name].enum = param.enum;
      }

      if (param.properties) {
        schema[param.name].properties = this.convertPropertiesToJsonSchema(param.properties);
      }

      if (param.items) {
        schema[param.name].items = {
          type: param.items.type,
          description: param.items.description,
        };
      }
    }

    return schema;
  }

  private convertPropertiesToJsonSchema(properties: Record<string, ToolParameter>): Record<string, any> {
    const schema: Record<string, any> = {};

    for (const [key, param] of Object.entries(properties)) {
      schema[key] = {
        type: param.type,
        description: param.description,
      };
    }

    return schema;
  }
}
