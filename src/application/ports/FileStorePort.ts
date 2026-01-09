export interface FileStorePort {
  /**
   * Salva um arquivo
   */
  save(key: string, data: Buffer | string, metadata?: Record<string, any>): Promise<string>;

  /**
   * Recupera um arquivo
   */
  get(key: string): Promise<Buffer | null>;

  /**
   * Deleta um arquivo
   */
  delete(key: string): Promise<void>;

  /**
   * Verifica se um arquivo existe
   */
  exists(key: string): Promise<boolean>;

  /**
   * Lista arquivos por prefixo
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Obtém metadados de um arquivo
   */
  getMetadata(key: string): Promise<Record<string, any> | null>;

  /**
   * Gera uma URL pública (se suportado, ex: S3)
   */
  getPublicUrl(key: string, expiresIn?: number): Promise<string | null>;
}
