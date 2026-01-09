import { AuthContext, ApiKeyInfo, TokenPayload } from '../../domain/auth/AuthContext.js';

export interface AuthPort {
  /**
   * Valida uma API key e retorna informações sobre ela
   */
  validateApiKey(apiKey: string): Promise<ApiKeyInfo | null>;

  /**
   * Gera um JWT access token
   */
  generateAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string>;

  /**
   * Gera um JWT refresh token
   */
  generateRefreshToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string>;

  /**
   * Valida um JWT token
   */
  validateToken(token: string): Promise<TokenPayload | null>;

  /**
   * Faz refresh de um token
   */
  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null>;

  /**
   * Revoga um refresh token
   */
  revokeRefreshToken(token: string): Promise<void>;

  /**
   * Hash de senha
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verifica senha
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Constrói um AuthContext a partir de informações do usuário
   */
  buildAuthContext(tenantId: string, userId?: string): Promise<AuthContext>;
}
