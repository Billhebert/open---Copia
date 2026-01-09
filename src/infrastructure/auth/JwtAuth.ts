import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AuthPort } from '../../application/ports/AuthPort.js';
import { AuthContext, ApiKeyInfo, TokenPayload, createAuthContext } from '../../domain/auth/AuthContext.js';

export class JwtAuth implements AuthPort {
  private readonly ACCESS_TOKEN_SECRET: string;
  private readonly REFRESH_TOKEN_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRES_IN = '1d'; // 1 dia
  private readonly REFRESH_TOKEN_EXPIRES_IN = '30d'; // 30 dias

  constructor(private prisma: PrismaClient) {
    this.ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'change-me-access-secret';
    this.REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret';
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyInfo | null> {
    // Tenta primeiro como tenant key
    const tenant = await this.prisma.tenant.findUnique({
      where: { apiKey },
    });

    if (tenant) {
      return {
        type: 'tenant',
        tenantId: tenant.id,
        vaultKeyId: tenant.vaultKeyId || undefined,
      };
    }

    // Tenta como user key
    const user = await this.prisma.user.findUnique({
      where: { apiKey },
      include: { tenant: true },
    });

    if (user) {
      return {
        type: 'user',
        tenantId: user.tenantId,
        userId: user.id,
        vaultKeyId: user.vaultKeyId || undefined,
      };
    }

    return null;
  }

  async generateAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
    return jwt.sign(
      { ...payload, type: 'access' },
      this.ACCESS_TOKEN_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRES_IN }
    );
  }

  async generateRefreshToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
    const token = jwt.sign(
      { ...payload, type: 'refresh' },
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN }
    );

    // Salva refresh token no banco
    if (payload.userId) {
      await this.prisma.refreshToken.create({
        data: {
          userId: payload.userId,
          token,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        },
      });
    }

    return token;
  }

  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET) as TokenPayload;
      return payload;
    } catch (error) {
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      // Valida o refresh token
      const payload = jwt.verify(refreshToken, this.REFRESH_TOKEN_SECRET) as TokenPayload;

      if (payload.type !== 'refresh') {
        return null;
      }

      // Verifica se o token existe no banco e não foi revogado
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return null;
      }

      // Gera novos tokens
      const newAccessToken = await this.generateAccessToken({
        tenantId: payload.tenantId,
        userId: payload.userId,
      });

      const newRefreshToken = await this.generateRefreshToken({
        tenantId: payload.tenantId,
        userId: payload.userId,
      });

      // Remove o refresh token antigo
      await this.prisma.refreshToken.delete({
        where: { token: refreshToken },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      return null;
    }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async buildAuthContext(tenantId: string, userId?: string): Promise<AuthContext> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (!userId) {
      // Apenas tenant context (server-to-server)
      return createAuthContext(tenantId, tenant.slug);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return createAuthContext(
      tenantId,
      tenant.slug,
      user.id,
      user.email,
      user.name,
      user.roles,
      user.tags,
      user.departmentId || undefined,
      user.department?.name,
      user.subdepartment || undefined,
      !!user.vaultKeyId // useUserKey se tem BYO key
    );
  }
}
