import { promises as fs } from 'fs';
import path from 'path';
import { FileStorePort } from '../../application/ports/FileStorePort.js';

export class LocalFileStore implements FileStorePort {
  private readonly basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || process.env.FILE_STORE_PATH || './storage';
  }

  async save(key: string, data: Buffer | string, metadata?: Record<string, any>): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    const dir = path.dirname(fullPath);

    // Cria diretório se não existir
    await fs.mkdir(dir, { recursive: true });

    // Salva o arquivo
    await fs.writeFile(fullPath, data);

    // Salva metadata se fornecido
    if (metadata) {
      const metadataPath = `${fullPath}.meta.json`;
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    return key;
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const fullPath = path.join(this.basePath, key);
      return await fs.readFile(fullPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    const metadataPath = `${fullPath}.meta.json`;

    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    try {
      await fs.unlink(metadataPath);
    } catch (error: any) {
      // Ignora se metadata não existe
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, key);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const fullPath = path.join(this.basePath, prefix);
    const dir = path.dirname(fullPath);

    try {
      const files = await fs.readdir(dir, { recursive: true });
      return files
        .filter((file: any) => !file.endsWith('.meta.json'))
        .map((file: any) => path.join(path.relative(this.basePath, dir), file));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async getMetadata(key: string): Promise<Record<string, any> | null> {
    try {
      const fullPath = path.join(this.basePath, key);
      const metadataPath = `${fullPath}.meta.json`;
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getPublicUrl(key: string, expiresIn?: number): Promise<string | null> {
    // Local file store não suporta URLs públicas
    // Retornar null ou implementar servidor de arquivos estáticos
    return null;
  }
}
