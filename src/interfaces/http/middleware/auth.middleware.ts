import { Request, Response, NextFunction } from "express";

import { AuthPort } from "../../../application/ports/AuthPort.js";

import { AuthContext } from "../../../domain/auth/AuthContext.js";

export interface AuthenticatedRequest extends Request {
  authContext?: AuthContext;
}

export function authMiddleware(authPort: AuthPort) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Extrai credenciais

      const apiKey = req.headers["x-api-key"] as string;

      const authHeader = req.headers.authorization;

      console.log("[AUTH] Request to:", req.method, req.path);

      console.log("[AUTH] Has API Key:", !!apiKey);

      console.log("[AUTH] Has Auth Header:", !!authHeader);

      let tenantId: string | undefined;

      let userId: string | undefined;

      // Autentica com API Key

      if (apiKey) {
        console.log("[AUTH] Validating API Key...");

        const apiKeyInfo = await authPort.validateApiKey(apiKey);

        if (!apiKeyInfo) {
          console.log("[AUTH] Invalid API key");

          return res.status(401).json({ error: "Invalid API key" });
        }

        tenantId = apiKeyInfo.tenantId;

        userId = apiKeyInfo.userId;

        console.log("[AUTH] API Key validated:", {
          type: apiKeyInfo.type,
          tenantId,
          userId,
        });
      }

      // Autentica com JWT
      else if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        console.log("[AUTH] Validating JWT token...");

        const payload = await authPort.validateToken(token);

        if (!payload) {
          console.log("[AUTH] Invalid or expired token");

          return res.status(401).json({ error: "Invalid or expired token" });
        }

        tenantId = payload.tenantId;

        userId = payload.userId;

        console.log("[AUTH] JWT validated:", { tenantId, userId });
      }

      // Sem autenticação
      else {
        console.log("[AUTH] No authentication provided");

        return res.status(401).json({ error: "Authentication required" });
      }

      // Verifica se tem tenantId

      if (!tenantId) {
        console.log("[AUTH] No tenantId found");

        return res.status(401).json({ error: "Invalid authentication" });
      }

      // Constrói AuthContext

      console.log("[AUTH] Building AuthContext for:", { tenantId, userId });

      const authContext = await authPort.buildAuthContext(tenantId, userId);

      req.authContext = authContext;

      console.log("[AUTH] AuthContext created:", {
        tenantId: authContext.tenantId,

        userId: authContext.userId,

        roles: authContext.roles,
      });

      next();
    } catch (error: any) {
      console.error("[AUTH] Middleware error:", error);

      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  };
}

export function optionalAuthMiddleware(authPort: AuthPort) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;

      const authHeader = req.headers.authorization;

      if (!apiKey && !authHeader) {
        return next();
      }

      let tenantId: string | undefined;

      let userId: string | undefined;

      if (apiKey) {
        const apiKeyInfo = await authPort.validateApiKey(apiKey);

        if (apiKeyInfo) {
          tenantId = apiKeyInfo.tenantId;

          userId = apiKeyInfo.userId;
        }
      } else if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        const payload = await authPort.validateToken(token);

        if (payload) {
          tenantId = payload.tenantId;

          userId = payload.userId;
        }
      }

      if (tenantId) {
        const authContext = await authPort.buildAuthContext(tenantId, userId);

        req.authContext = authContext;
      }

      next();
    } catch (error: any) {
      console.error("Optional auth middleware error:", error);

      next();
    }
  };
}
