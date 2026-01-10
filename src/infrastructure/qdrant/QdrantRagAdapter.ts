import { QdrantClient } from '@qdrant/js-client-rest';
import { RagPort } from '../../application/ports/RagPort.js';
import { RagQuery, RagResult } from '../../domain/rag/RagQuery.js';

interface QdrantPointPayload {
  documentId: string;
  documentVersionId: string;
  text: string;
  metadata: Record<string, any>;
  accessScope: Record<string, any>;
}

export class QdrantRagAdapter implements RagPort {
  private client: QdrantClient;
  private ollamaUrl: string;
  private embeddingModel: string;
  private embeddingProvider: 'ollama' | 'minimax';
  private minimaxApiKey?: string;
  private minimaxGroupId?: string;
  private minimaxApiUrl: string = 'https://api.minimax.chat/v1/text/embeddings';

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.client = new QdrantClient({ url: qdrantUrl });
    this.ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    this.embeddingModel = process.env.EMBEDDING_MODEL || "nomic-embed-text";
    this.embeddingProvider = (process.env.EMBEDDING_PROVIDER as 'ollama' | 'minimax') || 'ollama';
    this.minimaxApiKey = process.env.MINIMAX_API_KEY;
    this.minimaxGroupId = process.env.MINIMAX_GROUP_ID;

    if (this.embeddingProvider === 'minimax') {
      console.log('[QdrantRagAdapter] Usando MiniMax para embeddings');
    } else {
      console.log(`[QdrantRagAdapter] Usando Ollama para embeddings (modelo: ${this.embeddingModel})`);
    }
  }

  private getCollectionName(tenantId: string): string {
    return `tenant_${tenantId}`;
  }

  async ensureCollection(tenantId: string): Promise<void> {
    const collectionName = this.getCollectionName(tenantId);

    try {
      await this.client.getCollection(collectionName);
    } catch (error) {
      console.log(`[Qdrant] Criando coleção: ${collectionName}`);
      try {
        await this.client.createCollection(collectionName, {
          vectors: {
            size: 768,
            distance: 'Cosine',
          },
        });

        await this.client.createPayloadIndex(collectionName, {
          field_name: 'accessScope.department',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(collectionName, {
          field_name: 'accessScope.tags',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(collectionName, {
          field_name: 'metadata.documentVersionId',
          field_schema: 'keyword',
        });
      } catch (createError) {
        console.warn(`[Qdrant] Não foi possível criar coleção: ${createError}`);
      }
    }
  }

  async search(tenantId: string, query: RagQuery): Promise<RagResult[]> {
    const collectionName = this.getCollectionName(tenantId);

    try {
      console.log(`[Qdrant] Iniciando busca para tenant ${tenantId}, query: "${query.text}"`);

      const queryVector = await this.generateEmbedding(query.text);
      console.log(`[Qdrant] Embedding gerado com sucesso (dimensões: ${queryVector.length})`);

      const filter: any = { must: [] };

      if (query.filters?.departments && query.filters.departments.length > 0) {
        filter.must.push({
          key: 'accessScope.department',
          match: { any: query.filters.departments },
        });
        console.log(`[Qdrant] Filtro de departamentos aplicado: ${query.filters.departments.join(', ')}`);
      }

      if (query.filters?.tags && query.filters.tags.length > 0) {
        filter.must.push({
          key: 'accessScope.tags',
          match: { any: query.filters.tags },
        });
        console.log(`[Qdrant] Filtro de tags aplicado: ${query.filters.tags.join(', ')}`);
      }

      if (query.filters?.documentVersionIds && query.filters.documentVersionIds.length > 0) {
        filter.must.push({
          key: 'metadata.documentVersionId',
          match: { any: query.filters.documentVersionIds },
        });
        console.log(`[Qdrant] Filtro de documentVersionIds aplicado: ${query.filters.documentVersionIds.join(', ')}`);
      }

      const searchParams = {
        vector: queryVector,
        filter: filter.must.length > 0 ? filter : undefined,
        limit: query.limit || 10,
        score_threshold: query.minScore || 0.5,
        with_payload: true,
      };

      console.log(`[Qdrant] Parâmetros de busca: limit=${searchParams.limit}, score_threshold=${searchParams.score_threshold}, filters=${filter.must.length > 0 ? 'sim' : 'não'}`);

      const searchResult = await this.client.search(collectionName, searchParams);

      console.log(`[Qdrant] Busca concluída: ${searchResult.length} resultados encontrados`);

      const results = searchResult.map((point: any) => {
        const payload = point.payload || {};
        return {
          documentId: payload.metadata?.documentId || "",
          documentVersionId: payload.metadata?.documentVersionId || "",
          chunkId: String(point.id),
          text: payload.text || "",
          score: point.score,
          metadata: payload.metadata || {},
          accessScope: payload.accessScope || {},
        };
      });

      if (results.length > 0) {
        console.log(`[Qdrant] Melhor score: ${results[0].score.toFixed(3)}, Pior score: ${results[results.length - 1].score.toFixed(3)}`);
      } else {
        // Se não encontrou resultados, tenta buscar sem threshold para diagnóstico
        console.log(`[Qdrant] ⚠️  Nenhum resultado encontrado com score_threshold=${searchParams.score_threshold}`);
        console.log(`[Qdrant] 🔍 Tentando busca sem threshold para diagnóstico...`);

        const diagnosticSearch = await this.client.search(collectionName, {
          vector: queryVector,
          filter: filter.must.length > 0 ? filter : undefined,
          limit: 3,
          with_payload: true,
          // Sem score_threshold
        });

        if (diagnosticSearch.length > 0) {
          const scores = diagnosticSearch.map((p: any) => p.score.toFixed(3)).join(', ');
          console.log(`[Qdrant] 💡 Existem ${diagnosticSearch.length} documentos, mas os scores são baixos: [${scores}]`);
          console.log(`[Qdrant] 💡 Sugestão: Reduza o minScore ou melhore a query de busca`);
        } else if (filter.must.length > 0) {
          console.log(`[Qdrant] 💡 Nenhum documento encontrado MESMO SEM threshold`);
          console.log(`[Qdrant] 💡 Problema provável: Filtros ACL muito restritivos`);
          console.log(`[Qdrant] 💡 Filtros aplicados: ${JSON.stringify(query.filters)}`);
        } else {
          console.log(`[Qdrant] 💡 Nenhum documento na coleção! Faça upload de documentos primeiro.`);
        }
      }

      return results;
    } catch (error: any) {
      console.error(`[Qdrant] Erro na busca:`, error);

      // Verifica se é erro de coleção não existente
      if (error.message?.includes('Not found') || error.status === 404) {
        throw new Error(`Coleção RAG não encontrada para o tenant. Por favor, faça upload de um documento primeiro.`);
      }

      throw new Error(`Erro ao buscar no RAG: ${error.message || error}`);
    }
  }

  async indexDocument(
    tenantId: string,
    documentVersionId: string,
    chunks: {
      chunkId: string;
      text: string;
      vector?: number[];
      metadata: Record<string, any>;
      accessScope: Record<string, any>;
    }[]
  ): Promise<void> {
    const collectionName = this.getCollectionName(tenantId);
    await this.ensureCollection(tenantId);

    try {
      console.log(`[Qdrant] Indexando ${chunks.length} chunks para documento ${documentVersionId}...`);

      const points = await Promise.all(
        chunks.map(async (chunk, index) => {
          const vector = chunk.vector || await this.generateEmbeddingInternal(chunk.text);
          return {
            id: typeof chunk.chunkId === 'string' ? parseInt(chunk.chunkId, 10) || (index + 1) : chunk.chunkId,
            vector,
            payload: {
              text: chunk.text,
              metadata: { ...chunk.metadata, documentVersionId },
              accessScope: chunk.accessScope,
            },
          };
        })
      );

      await this.client.upsert(collectionName, { points, wait: true });
      console.log(`[Qdrant] ✓ Indexados ${points.length} chunks para documento ${documentVersionId}`);
    } catch (error: any) {
      console.error(`[Qdrant] ERRO ao indexar documento:`, error);
      throw new Error(`Erro ao indexar documento no Qdrant: ${error.message || error}`);
    }
  }

  async removeDocument(tenantId: string, documentVersionId: string): Promise<void> {
    const collectionName = this.getCollectionName(tenantId);

    try {
      await this.client.delete(collectionName, {
        filter: {
          must: [
            {
              key: 'metadata.documentVersionId',
              match: { value: documentVersionId },
            },
          ],
        },
      });
    } catch (error) {
      console.warn(`[Qdrant] Remove failed: ${error}`);
    }
  }

  async updateChunkAccessScope(
    tenantId: string,
    documentVersionId: string,
    chunkId: string,
    accessScope: Record<string, any>
  ): Promise<void> {
    const collectionName = this.getCollectionName(tenantId);

    try {
      await this.client.setPayload(collectionName, {
        points: [chunkId],
        payload: { accessScope },
      });
    } catch (error) {
      console.warn(`[Qdrant] Update access scope failed: ${error}`);
    }
  }

  async deleteCollection(tenantId: string): Promise<void> {
    const collectionName = this.getCollectionName(tenantId);
    try {
      await this.client.deleteCollection(collectionName);
    } catch (error) {
      console.warn(`[Qdrant] Delete collection failed: ${error}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.generateEmbeddingInternal(text);
  }

  private async generateEmbeddingInternal(text: string): Promise<number[]> {
    if (this.embeddingProvider === 'minimax') {
      return this.generateMiniMaxEmbedding(text);
    }
    return this.generateOllamaEmbedding(text);
  }

  private async generateOllamaEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`[Ollama] Gerando embedding para texto de ${text.length} caracteres...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${this.ollamaUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama retornou status ${response.status}: ${errorText}`);
      }

      const data: any = await response.json();

      if (!data.embedding && !data.embeddings?.[0]) {
        throw new Error(`Resposta do Ollama não contém embedding. Resposta: ${JSON.stringify(data)}`);
      }

      const embedding = data.embedding || data.embeddings[0];
      console.log(`[Ollama] Embedding gerado com sucesso (${embedding.length} dimensões)`);

      return embedding;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`[Ollama] ERRO: Timeout ao gerar embedding (>60s). Verifique se o Ollama está rodando e o modelo está carregado.`);
        throw new Error(`Timeout ao conectar com Ollama. Verifique se o serviço está rodando em ${this.ollamaUrl}`);
      }

      if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        console.error(`[Ollama] ERRO: Não foi possível conectar ao Ollama em ${this.ollamaUrl}`);
        throw new Error(`Não foi possível conectar ao Ollama. Verifique se o Docker está rodando e o serviço Ollama está ativo.`);
      }

      console.error(`[Ollama] ERRO ao gerar embedding:`, error);
      throw new Error(`Erro ao gerar embedding: ${error.message || error}`);
    }
  }

  private async generateMiniMaxEmbedding(text: string): Promise<number[]> {
    if (!this.minimaxApiKey || !this.minimaxGroupId) {
      console.warn('[MiniMax] API key or Group ID not configured, using mock');
      return this.mockEmbedding(text);
    }

    try {
      // MiniMax usa o modelo embo-01 (1024 dimensões)
      const minimaxModel = this.embeddingProvider === 'minimax' ? 'embo-01' : this.embeddingModel;

      const response = await fetch(this.minimaxApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.minimaxApiKey}`,
          "X-GroupId": this.minimaxGroupId,
        },
        body: JSON.stringify({
          model: minimaxModel,
          input: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MiniMax error: ${response.status} - ${errorText}`);
      }

      const data: any = await response.json();

      if (data.embeddings && data.embeddings.length > 0) {
        return data.embeddings[0];
      }

      if (data.data && data.data.length > 0 && data.data[0].embedding) {
        return data.data[0].embedding;
      }

      console.warn('[MiniMax] No embeddings in response, using mock');
      return this.mockEmbedding(text);
    } catch (error) {
      console.warn(`[MiniMax] Embedding failed: ${error}, using mock`);
      return this.mockEmbedding(text);
    }
  }

  private mockEmbedding(text: string): number[] {
    const seed = text.length;
    return Array.from({ length: 768 }, (_, i) => 
      Math.sin(seed + i * 0.01) * 0.5 + Math.cos(seed * 0.02) * 0.3
    );
  }
}
