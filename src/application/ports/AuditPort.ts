export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resource?: string;
  resourceType?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuditPort {
  /**
   * Registra um evento de auditoria
   */
  log(event: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void>;

  /**
   * Busca logs por tenant
   */
  findByTenant(
    tenantId: string,
    filters?: {
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit?: number,
    offset?: number
  ): Promise<AuditLog[]>;

  /**
   * Busca logs por usuário
   */
  findByUser(userId: string, limit?: number, offset?: number): Promise<AuditLog[]>;

  /**
   * Busca logs por recurso
   */
  findByResource(resourceType: string, resourceId: string): Promise<AuditLog[]>;

  /**
   * Conta logs
   */
  count(tenantId: string, filters?: { action?: string; userId?: string }): Promise<number>;
}
