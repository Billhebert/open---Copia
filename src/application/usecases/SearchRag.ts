import { AuthContext } from '../../domain/auth/AuthContext.js';
import { RagQuery, RagQueryBuilder, RagResult } from '../../domain/rag/RagQuery.js';
import { PolicyEngine } from '../../domain/auth/PolicyEngine.js';
import { RagPort } from '../ports/RagPort.js';
import { AuditPort } from '../ports/AuditPort.js';

export interface SearchRagInput {
  query: string;
  limit?: number;
  minScore?: number;
  filters?: {
    departments?: string[];
    subdepartments?: string[];
    tags?: string[];
    documentIds?: string[];
  };
}

export interface SearchRagOutput {
  results: RagResult[];
  query: RagQuery;
}

export class SearchRag {
  constructor(
    private ragPort: RagPort,
    private auditPort: AuditPort,
    private policyEngine: PolicyEngine
  ) {}

  async execute(ctx: AuthContext, input: SearchRagInput): Promise<SearchRagOutput> {
    if (!ctx.userId) {
      throw new Error('User must be authenticated');
    }

    // Verifica política de busca RAG
    const canSearch = this.policyEngine.isAllowed(ctx, 'rag', 'search');
    if (!canSearch) {
      throw new Error('User does not have permission to search RAG');
    }

    // Constrói a query baseada no contexto do usuário
    const ragQuery = RagQueryBuilder.fromAuthContext(
      input.query,
      ctx,
      input.filters
    );

    // Aplica limites se fornecidos
    if (input.limit) {
      ragQuery.limit = input.limit;
    }
    if (input.minScore !== undefined) {
      ragQuery.minScore = input.minScore;
    }

    console.log(`[SearchRag] Query: "${input.query}", minScore: ${ragQuery.minScore}, limit: ${ragQuery.limit}`);
    console.log(`[SearchRag] Contexto: tenant=${ctx.tenantId}, user=${ctx.userId}, dept=${ctx.department || 'none'}, tags=${ctx.tags.join(',') || 'none'}`);

    // Busca no Qdrant
    const results = await this.ragPort.search(ctx.tenantId, ragQuery);

    console.log(`[SearchRag] Retornando ${results.length} resultados`);

    // Auditoria
    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'rag.search',
      details: {
        query: input.query,
        resultsCount: results.length,
        filters: input.filters,
      },
    });

    return {
      results,
      query: ragQuery,
    };
  }
}
