export interface CreateDocumentInput {
  tenantId: string;
  name: string;
  description?: string;
  tags: string[];
  department?: string;
  subdepartment?: string;
  accessRoles: string[];
  accessScope: Record<string, any>;
}

export interface DocumentOutput {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  tags: string[];
  department?: string;
  subdepartment?: string;
  accessRoles: string[];
  accessScope: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVersionInput {
  documentId: string;
  tenantId: string;
  version: number;
  storageKey: string;
  storageType: string;
  format: string;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
  chunkingConfig: {
    strategy: string;
    chunkSize: number;
    overlap: number;
  };
  status: string;
}

export interface DocumentVersionOutput {
  id: string;
  documentId: string;
  tenantId: string;
  version: number;
  storageKey: string;
  storageType: string;
  format: string;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
  chunkingConfig: {
    strategy: string;
    chunkSize: number;
    overlap: number;
  };
  status: string;
  createdAt: Date;
}

export interface CreateChunkInput {
  documentVersionId: string;
  chunkId: string;
  text: string;
  metadata: Record<string, any>;
  accessScope: Record<string, any>;
  position: number;
}

export interface DocumentChunkOutput {
  id: string;
  documentVersionId: string;
  chunkId: string;
  text: string;
  metadata: Record<string, any>;
  accessScope: Record<string, any>;
  position: number;
  createdAt: Date;
}

export interface DocumentRepoPort {
  create(input: CreateDocumentInput): Promise<DocumentOutput>;
  createVersion(input: CreateVersionInput): Promise<DocumentVersionOutput>;
  createChunk(input: CreateChunkInput): Promise<DocumentChunkOutput>;
  updateVersionStatus(versionId: string, status: string): Promise<void>;
}
