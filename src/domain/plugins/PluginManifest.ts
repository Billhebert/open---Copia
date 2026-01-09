export interface PluginManifest {
  id: string;
  name: string;
  description?: string;
  version: string;
  type: PluginType;
  riskLevel: RiskLevel;
  config: PluginConfig;
  tools?: ToolDefinition[];
}

export type PluginType = 'mcp-process' | 'mcp-http' | 'custom';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface PluginConfig {
  // Para MCP Process
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // Para MCP HTTP
  url?: string;
  method?: string;
  headers?: Record<string, string>;

  // Para Custom
  entrypoint?: string;

  // Configurações gerais
  timeout?: number;
  maxRetries?: number;
  [key: string]: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  outputSchema?: {
    type: string;
    properties: Record<string, any>;
  };
}

export class PluginManifestValidator {
  static validate(manifest: any): manifest is PluginManifest {
    if (!manifest.id || typeof manifest.id !== 'string') {
      throw new Error('Plugin manifest must have an id');
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new Error('Plugin manifest must have a name');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new Error('Plugin manifest must have a version');
    }

    if (!['mcp-process', 'mcp-http', 'custom'].includes(manifest.type)) {
      throw new Error('Plugin type must be mcp-process, mcp-http, or custom');
    }

    if (!['low', 'medium', 'high'].includes(manifest.riskLevel)) {
      throw new Error('Plugin riskLevel must be low, medium, or high');
    }

    if (!manifest.config || typeof manifest.config !== 'object') {
      throw new Error('Plugin manifest must have a config object');
    }

    // Validação específica por tipo
    if (manifest.type === 'mcp-process') {
      if (!manifest.config.command) {
        throw new Error('MCP process plugin must have a command');
      }
    }

    if (manifest.type === 'mcp-http') {
      if (!manifest.config.url) {
        throw new Error('MCP HTTP plugin must have a URL');
      }
    }

    if (manifest.type === 'custom') {
      if (!manifest.config.entrypoint) {
        throw new Error('Custom plugin must have an entrypoint');
      }
    }

    return true;
  }

  static fromJSON(json: string): PluginManifest {
    const parsed = JSON.parse(json);
    this.validate(parsed);
    return parsed;
  }
}
