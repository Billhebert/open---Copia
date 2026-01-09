import { AuthContext } from '../auth/AuthContext.js';
import { MessageAccessScope } from '../chat/Visibility.js';

export interface RagQuery {
  text: string;
  limit?: number;
  minScore?: number;
  filters?: RagFilters;
  accessScope: MessageAccessScope;
}

export interface RagFilters {
  departments?: string[];
  subdepartments?: string[];
  tags?: string[];
  documentIds?: string[];
  documentVersionIds?: string[];
}

export interface RagResult {
  documentId: string;
  documentVersionId: string;
  chunkId: string;
  text: string;
  score: number;
  metadata: Record<string, any>;
  accessScope: Record<string, any>;
}

export class RagQueryBuilder {
  private query: Partial<RagQuery>;

  constructor(text: string, accessScope: MessageAccessScope) {
    this.query = {
      text,
      accessScope,
      limit: 10,
      minScore: 0.7,
      filters: {},
    };
  }

  withLimit(limit: number): this {
    this.query.limit = limit;
    return this;
  }

  withMinScore(score: number): this {
    this.query.minScore = score;
    return this;
  }

  withDepartments(departments: string[]): this {
    if (!this.query.filters) this.query.filters = {};
    this.query.filters.departments = departments;
    return this;
  }

  withTags(tags: string[]): this {
    if (!this.query.filters) this.query.filters = {};
    this.query.filters.tags = tags;
    return this;
  }

  withDocuments(documentIds: string[]): this {
    if (!this.query.filters) this.query.filters = {};
    this.query.filters.documentIds = documentIds;
    return this;
  }

  build(): RagQuery {
    return this.query as RagQuery;
  }

  /**
   * Cria uma query RAG baseada no contexto de autenticação
   */
  static fromAuthContext(text: string, ctx: AuthContext, customFilters?: Partial<RagFilters>): RagQuery {
    const accessScope: MessageAccessScope = {
      department: ctx.department,
      subdepartment: ctx.subdepartment,
      tags: ctx.tags,
      roles: ctx.roles,
    };

    const filters: RagFilters = {
      departments: ctx.department ? [ctx.department] : undefined,
      subdepartments: ctx.subdepartment ? [ctx.subdepartment] : undefined,
      tags: ctx.tags.length > 0 ? ctx.tags : undefined,
      ...customFilters,
    };

    return {
      text,
      limit: 10,
      minScore: 0.7,
      filters,
      accessScope,
    };
  }

  /**
   * Cria uma query RAG baseada no access scope de uma mensagem
   */
  static fromMessageScope(text: string, messageScope: MessageAccessScope, customFilters?: Partial<RagFilters>): RagQuery {
    const filters: RagFilters = {
      departments: messageScope.department ? [messageScope.department] : undefined,
      subdepartments: messageScope.subdepartment ? [messageScope.subdepartment] : undefined,
      tags: messageScope.tags && messageScope.tags.length > 0 ? messageScope.tags : undefined,
      ...customFilters,
    };

    return {
      text,
      limit: 10,
      minScore: 0.7,
      filters,
      accessScope: messageScope,
    };
  }
}
