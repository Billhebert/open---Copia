import { Tool } from '../../domain/tools/Tool.js';
import { SearchWebTool } from './SearchWebTool.js';
import { RagSearchTool } from './RagSearchTool.js';
import { RagPort } from '../../application/ports/RagPort.js';

/**
 * ToolRegistry - Registro central de todas as tools disponíveis
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor(private ragPort: RagPort) {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Registra tools padrão
    this.register(new SearchWebTool());
    this.register(new RagSearchTool(this.ragPort));
  }

  register(tool: Tool) {
    this.tools.set(tool.definition.id, tool);
  }

  unregister(toolId: string) {
    this.tools.delete(toolId);
  }

  get(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getAllByCategory(category: string): Tool[] {
    return this.getAll().filter(tool => tool.definition.category === category);
  }

  getAllByTag(tag: string): Tool[] {
    return this.getAll().filter(tool => tool.definition.tags?.includes(tag));
  }

  /**
   * Retorna tools no formato do OpenCode AI SDK
   */
  toOpencodeFormat(): any[] {
    return this.getAll().map(tool => tool.toOpencodeFormat());
  }

  /**
   * Filtra tools baseado em permissões do tenant/user
   */
  getAvailableTools(tenantId: string, userId?: string): Tool[] {
    // TODO: Implementar filtragem baseada em políticas/permissões
    // Por enquanto, retorna todas
    return this.getAll();
  }
}
