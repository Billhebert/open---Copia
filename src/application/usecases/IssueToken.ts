import { AuthPort } from "../ports/AuthPort.js";
import { AuditPort } from "../ports/AuditPort.js";

export interface IssueTokenInput {
  apiKey?: string;
  email?: string;
  password?: string;
  grantType: "api_key" | "password" | "refresh_token";
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IssueTokenOutput {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export class IssueToken {
  constructor(private authPort: AuthPort, private auditPort: AuditPort) {}

  async execute(input: IssueTokenInput): Promise<IssueTokenOutput> {
    let tenantId: string;
    let userId: string | undefined;

    // Grant type: API Key
    if (input.grantType === "api_key") {
      if (!input.apiKey) {
        throw new Error("API key is required");
      }

      const apiKeyInfo = await this.authPort.validateApiKey(input.apiKey);
      if (!apiKeyInfo) {
        throw new Error("Invalid API key");
      }

      tenantId = apiKeyInfo.tenantId;
      userId = apiKeyInfo.userId;
      console.log("[IssueToken] API Key validated:", {
        type: apiKeyInfo.type,
        tenantId,
        userId: userId || "(none - tenant key)",
      });
      await this.auditPort.log({
        tenantId,
        userId,
        action: "auth.login.api_key",
        details: { type: apiKeyInfo.type },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
    }
    // Grant type: Password
    else if (input.grantType === "password") {
      if (!input.email || !input.password) {
        throw new Error("Email and password are required");
      }

      // TODO: Implementar autenticação por email/senha
      throw new Error("Password grant type not implemented yet");
    }
    // Grant type: Refresh Token
    else if (input.grantType === "refresh_token") {
      if (!input.refreshToken) {
        throw new Error("Refresh token is required");
      }

      const refreshed = await this.authPort.refreshToken(input.refreshToken);
      if (!refreshed) {
        throw new Error("Invalid refresh token");
      }

      await this.auditPort.log({
        tenantId: "", // TODO: extrair do token
        action: "auth.refresh_token",
        details: {},
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      return {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresIn: 86400, // 1 day
        tokenType: "Bearer",
      };
    } else {
      throw new Error("Invalid grant type");
    }

    // Gera tokens
    const accessToken = await this.authPort.generateAccessToken({
      tenantId,
      userId,
    });
    const refreshToken = await this.authPort.generateRefreshToken({
      tenantId,
      userId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400, // 1 day
      tokenType: "Bearer",
    };
  }
}
