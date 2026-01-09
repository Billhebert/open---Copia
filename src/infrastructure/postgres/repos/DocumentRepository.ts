import { PrismaClient } from '@prisma/client';
import {
  DocumentRepoPort,
  CreateDocumentInput,
  DocumentOutput,
  CreateVersionInput,
  DocumentVersionOutput,
  CreateChunkInput,
  DocumentChunkOutput,
} from '../../../application/ports/DocumentRepoPort.js';

export class DocumentRepository implements DocumentRepoPort {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateDocumentInput): Promise<DocumentOutput> {
    const created = await this.prisma.document.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        description: input.description || null,
        tags: input.tags,
        department: input.department || null,
        subdepartment: input.subdepartment || null,
        accessRoles: input.accessRoles,
        accessScope: input.accessScope as any,
      },
    });

    return this.toDocumentOutput(created);
  }

  async createVersion(input: CreateVersionInput): Promise<DocumentVersionOutput> {
    const created = await this.prisma.documentVersion.create({
      data: {
        documentId: input.documentId,
        tenantId: input.tenantId,
        version: input.version,
        storageKey: input.storageKey,
        storageType: input.storageType,
        format: input.format,
        size: input.size,
        checksum: input.checksum,
        metadata: input.metadata as any,
        chunkingConfig: input.chunkingConfig as any,
        status: input.status,
      },
    });

    return this.toVersionOutput(created);
  }

  async createChunk(input: CreateChunkInput): Promise<DocumentChunkOutput> {
    const created = await this.prisma.documentChunk.create({
      data: {
        documentVersionId: input.documentVersionId,
        chunkId: input.chunkId,
        text: input.text,
        metadata: input.metadata as any,
        accessScope: input.accessScope as any,
        position: input.position,
      },
    });

    return this.toChunkOutput(created);
  }

  async updateVersionStatus(versionId: string, status: string): Promise<void> {
    await this.prisma.documentVersion.update({
      where: { id: versionId },
      data: { status },
    });
  }

  private toDocumentOutput(data: any): DocumentOutput {
    return {
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description || undefined,
      tags: data.tags,
      department: data.department || undefined,
      subdepartment: data.subdepartment || undefined,
      accessRoles: data.accessRoles,
      accessScope: data.accessScope,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private toVersionOutput(data: any): DocumentVersionOutput {
    return {
      id: data.id,
      documentId: data.documentId,
      tenantId: data.tenantId,
      version: data.version,
      storageKey: data.storageKey,
      storageType: data.storageType,
      format: data.format,
      size: data.size,
      checksum: data.checksum,
      metadata: data.metadata,
      chunkingConfig: data.chunkingConfig,
      status: data.status,
      createdAt: data.createdAt,
    };
  }

  private toChunkOutput(data: any): DocumentChunkOutput {
    return {
      id: data.id,
      documentVersionId: data.documentVersionId,
      chunkId: data.chunkId,
      text: data.text,
      metadata: data.metadata,
      accessScope: data.accessScope,
      position: data.position,
      createdAt: data.createdAt,
    };
  }
}
