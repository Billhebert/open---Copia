import { AuthContext } from '../../domain/auth/AuthContext.js';
import { FileStorePort } from '../ports/FileStorePort.js';
import { RagPort } from '../ports/RagPort.js';
import { AuditPort } from '../ports/AuditPort.js';
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
    private documentRepo: any // TODO: criar DocumentRepoPort
  ) {}

  async execute(ctx: AuthContext, input: IngestDocumentInput): Promise<IngestDocumentOutput> {
    if (!ctx.userId) {
      throw new Error('User must be authenticated');
    }

    // 1. Salva o arquivo no FileStore
    const storageKey = `${ctx.tenantId}/documents/${uuidv4()}.${input.format}`;
    await this.fileStore.save(storageKey, input.content, {
      name: input.name,
      format: input.format,
      uploadedBy: ctx.userId,
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
        chunkSize: 512,
        overlap: 50,
      },
      status: 'processing',
    });

    // 4. Processa e chunka o documento (simplificado - apenas texto)
    const chunks = await this.chunkDocument(
      contentBuffer.toString('utf-8'),
      version.chunkingConfig
    );

    // 5. Gera embeddings e indexa no Qdrant (simplificado)
    const chunksWithEmbeddings = chunks.map((chunk, index) => ({
      chunkId: `${version.id}-chunk-${index}`,
      text: chunk,
      metadata: {
        documentId: document.id,
        documentVersionId: version.id,
        documentName: document.name,
        position: index,
        format: input.format,
      },
      accessScope: document.accessScope,
    }));

    // Garante que a collection existe
    await this.ragPort.ensureCollection(ctx.tenantId);

    // Indexa no Qdrant
    await this.ragPort.indexDocument(ctx.tenantId, version.id, chunksWithEmbeddings);

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
      userId: ctx.userId,
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
