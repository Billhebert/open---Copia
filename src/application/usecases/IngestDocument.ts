import { AuthContext } from '../../domain/auth/AuthContext.js';
import { FileStorePort } from '../ports/FileStorePort.js';
import { RagPort } from '../ports/RagPort.js';
import { AuditPort } from '../ports/AuditPort.js';
import { DocumentRepoPort } from '../ports/DocumentRepoPort.js';
import { v4 as uuidv4 } from 'uuid';

export interface IngestDocumentInput {
  name: string;
  description?: string;
  content: Buffer | string;
  format: string; // "pdf" | "docx" | "txt" | "md" | etc
  tags?: string[];
  department?: string;
  subdepartment?: string;
  accessRoles?: string[];
  accessScope?: Record<string, any>;
}

export interface IngestDocumentOutput {
  documentId: string;
  versionId: string;
  chunksCount: number;
}

/**
 * IngestDocument é responsável por:
 * 1. Salvar o arquivo no FileStore
 * 2. Criar registro no banco (document + version)
 * 3. Processar e chunkar o documento
 * 4. Gerar embeddings
 * 5. Indexar no Qdrant com ACL por chunk
 */
export class IngestDocument {
  constructor(
    private fileStore: FileStorePort,
    private ragPort: RagPort,
    private auditPort: AuditPort,
    private documentRepo: DocumentRepoPort
  ) {}

  async execute(ctx: AuthContext, input: IngestDocumentInput): Promise<IngestDocumentOutput> {
    // Permite tanto user-level quanto tenant-level authentication
    const uploadedBy = ctx.userId || 'system';

    // 1. Salva o arquivo no FileStore
    const storageKey = `${ctx.tenantId}/documents/${uuidv4()}.${input.format}`;
    await this.fileStore.save(storageKey, input.content, {
      name: input.name,
      format: input.format,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
    });

    // 2. Cria o documento
    const document = await this.documentRepo.create({
      tenantId: ctx.tenantId,
      name: input.name,
      description: input.description,
      tags: input.tags || [],
      department: input.department || ctx.department,
      subdepartment: input.subdepartment || ctx.subdepartment,
      accessRoles: input.accessRoles || ctx.roles,
      accessScope: input.accessScope || {
        department: ctx.department,
        subdepartment: ctx.subdepartment,
        tags: ctx.tags,
        roles: ctx.roles,
      },
    });

    // 3. Cria a versão do documento
    const contentBuffer = Buffer.isBuffer(input.content) ? input.content : Buffer.from(input.content);
    const version = await this.documentRepo.createVersion({
      documentId: document.id,
      tenantId: ctx.tenantId,
      version: 1,
      storageKey,
      storageType: 'local',
      format: input.format,
      size: contentBuffer.length,
      checksum: this.calculateChecksum(contentBuffer),
      metadata: {},
      chunkingConfig: {
        strategy: 'hybrid',
        chunkSize: 4096,
        overlap: 200,
      },
      status: 'processing',
    });

    // 4. Processa e chunka o documento (simplificado - apenas texto)
    const chunks = await this.chunkDocument(
      contentBuffer.toString('utf-8'),
      version.chunkingConfig
    );

    // 5. Gera embeddings e indexa no Qdrant (simplificado)
    console.log(`[IngestDocument] Processando ${chunks.length} chunks em batches...`);
    
    const BATCH_SIZE = 5;
    const chunksWithEmbeddings = [];
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      console.log(`[IngestDocument] Processando batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
      
      const batchResults = await Promise.all(
        batch.map(async (chunk, batchIndex) => {
          const globalIndex = i + batchIndex;
          const cleanText = chunk.replace(/\0/g, '');
          const vector = await this.ragPort.generateEmbedding(cleanText);
          
          return {
            chunkId: `${version.id}-chunk-${globalIndex}`,
            text: cleanText,
            vector,
            metadata: {
              documentId: document.id,
              documentVersionId: version.id,
              documentName: document.name,
              position: globalIndex,
              format: input.format,
            },
            accessScope: document.accessScope,
          };
        })
      );
      
      chunksWithEmbeddings.push(...batchResults);
    }

    console.log(`[IngestDocument] Embeddings gerados, indexando no Qdrant...`);

    // Garante que a collection existe
    await this.ragPort.ensureCollection(ctx.tenantId);

    // Indexa no Qdrant
    await this.ragPort.indexDocument(ctx.tenantId, version.id, chunksWithEmbeddings);
    console.log(`[IngestDocument] Documento indexado com sucesso!`);

    // Salva chunks no banco
    for (const chunk of chunksWithEmbeddings) {
      await this.documentRepo.createChunk({
        documentVersionId: version.id,
        chunkId: chunk.chunkId,
        text: chunk.text,
        metadata: chunk.metadata,
        accessScope: chunk.accessScope,
        position: chunk.metadata.position,
      });
    }

    // Atualiza status da versão
    await this.documentRepo.updateVersionStatus(version.id, 'completed');

    // Auditoria
    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId || undefined,
      action: 'document.ingest',
      resource: document.id,
      resourceType: 'document',
      details: {
        name: document.name,
        format: input.format,
        size: contentBuffer.length,
        chunksCount: chunks.length,
      },
    });

    return {
      documentId: document.id,
      versionId: version.id,
      chunksCount: chunks.length,
    };
  }

  private async chunkDocument(text: string, config: any): Promise<string[]> {
    // Implementação simplificada - chunkar por tamanho fixo com overlap
    const { chunkSize, overlap } = config;
    const chunks: string[] = [];
    let position = 0;

    while (position < text.length) {
      const end = Math.min(position + chunkSize, text.length);
      chunks.push(text.substring(position, end));
      position += chunkSize - overlap;
    }

    return chunks;
  }

  private calculateChecksum(buffer: Buffer): string {
    // Implementação simplificada - usar crypto.createHash('sha256') em produção
    return buffer.toString('base64').substring(0, 32);
  }
}
