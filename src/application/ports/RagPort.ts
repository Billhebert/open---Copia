import { RagQuery, RagResult } from '../../domain/rag/RagQuery.js';

export interface RagPort {
  /**
   * Faz uma busca semântica no RAG
   */
  search(tenantId: string, query: RagQuery): Promise<RagResult[]>;

  /**
   * Adiciona um documento ao RAG (indexação)
   */
  indexDocument(
    tenantId: string,
    documentVersionId: string,
    chunks: {
      chunkId: string;
      text: string;
      metadata: Record<string, any>;
      accessScope: Record<string, any>;
    }[]
  ): Promise<void>;

  /**
   * Remove um documento do RAG
   */
  removeDocument(tenantId: string, documentVersionId: string): Promise<void>;

  /**
   * Atualiza o access scope de um chunk
   */
  updateChunkAccessScope(
    tenantId: string,
    documentVersionId: string,
    chunkId: string,
    accessScope: Record<string, any>
  ): Promise<void>;

  /**
   * Verifica se a collection do tenant existe
   */
  ensureCollection(tenantId: string): Promise<void>;

  /**
   * Deleta a collection de um tenant
   */
  deleteCollection(tenantId: string): Promise<void>;
}
