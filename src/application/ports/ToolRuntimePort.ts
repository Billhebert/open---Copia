import { ToolCall } from '../../domain/plugins/ToolCall.js';
import { PluginManifest, ToolDefinition } from '../../domain/plugins/PluginManifest.js';

export interface ToolRuntimePort {
  /**
   * Executa um tool call
   */
  execute(plugin: PluginManifest, toolName: string, args: Record<string, any>): Promise<any>;

  /**
   * Valida os argumentos de um tool
   */
  validateArguments(tool: ToolDefinition, args: Record<string, any>): Promise<boolean>;

  /**
   * Lista ferramentas disponíveis de um plugin
   */
  listTools(plugin: PluginManifest): Promise<ToolDefinition[]>;

  /**
   * Verifica se um plugin está disponível (processo rodando, servidor respondendo, etc)
   */
  isAvailable(plugin: PluginManifest): Promise<boolean>;

  /**
   * Inicializa um plugin (se necessário)
   */
  initialize(plugin: PluginManifest): Promise<void>;

  /**
   * Encerra um plugin (se necessário)
   */
  shutdown(plugin: PluginManifest): Promise<void>;
}
