import { PrismaClient } from '@prisma/client';
import { AuditPort, AuditLog } from '../../application/ports/AuditPort.js';

export class PostgresAudit implements AuditPort {
  constructor(private prisma: PrismaClient) {}

  async log(event: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId || null,
        action: event.action,
        resource: event.resource || null,
        resourceType: event.resourceType || null,
        details: event.details as any,
        ipAddress: event.ipAddress || null,
        userAgent: event.userAgent || null,
      },
    });
  }

  async findByTenant(
    tenantId: string,
    filters?: {
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit = 100,
    offset = 0
  ): Promise<AuditLog[]> {
    const where: any = { tenantId };

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(this.toDomain);
  }

  async findByUser(userId: string, limit = 100, offset = 0): Promise<AuditLog[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(this.toDomain);
  }

  async findByResource(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        resourceType,
        resource: resourceId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(this.toDomain);
  }

  async count(tenantId: string, filters?: { action?: string; userId?: string }): Promise<number> {
    const where: any = { tenantId };

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    return this.prisma.auditLog.count({ where });
  }

  private toDomain(data: any): AuditLog {
    return {
      id: data.id,
      tenantId: data.tenantId,
      userId: data.userId || undefined,
      action: data.action,
      resource: data.resource || undefined,
      resourceType: data.resourceType || undefined,
      details: data.details,
      ipAddress: data.ipAddress || undefined,
      userAgent: data.userAgent || undefined,
      createdAt: data.createdAt,
    };
  }
}
