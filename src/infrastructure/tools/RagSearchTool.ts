import { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../../domain/tools/Tool.js';
import { RagPort } from '../../application/ports/RagPort.js';

/**
 * RagSearchTool - Busca em documentos RAG do tenant
 */
export class RagSearchTool extends Tool {
  definition: ToolDefinition = {
    id: 'search_documents',
    name: 'Search Documents',
    description: 'Searches through the tenant\'s uploaded documents using RAG (Retrieval-Augmented Generation). Returns relevant text chunks from documents.',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The search query to look up in documents',
        required: true,
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
        required: false,
        default: 5,
      },
      {
        name: 'min_score',
        type: 'number',
        description: 'Minimum similarity score (0-1, default: 0.5)',
        required: false,
        default: 0.5,
      },
    ],
    requiresApproval: false,
    category: 'knowledge',
    tags: ['rag', 'documents', 'search', 'knowledge'],
  };

  constructor(private ragPort: RagPort) {
    super();
  }

  async execute(
    context: ToolExecutionContext,
    parameters: Record<string, any>
  ): Promise<ToolExecutionResult> {
    // Valida parâmetros
    const validation = this.validateParameters(parameters);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    try {
      const query = parameters.query as string;
      const limit = (parameters.limit as number) || 5;
      const minScore = (parameters.min_score as number) || 0.5;

      // Executa busca RAG
      const results = await this.ragPort.search(context.tenantId, {
        text: query,
        limit,
        minScore,
        accessScope: {
          department: context.variables?.department as string | undefined,
          subdepartment: context.variables?.subdepartment as string | undefined,
          tags: (context.variables?.tags as string[]) || [],
          roles: (context.variables?.roles as string[]) || [],
        },
      });

      return {
        success: true,
        data: {
          query,
          results: results.map(r => ({
            text: r.text,
            score: r.score,
            documentId: r.documentId,
            metadata: r.metadata,
          })),
          count: results.length,
        },
        metadata: {
          executedAt: new Date().toISOString(),
          source: 'rag',
          tenantId: context.tenantId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
