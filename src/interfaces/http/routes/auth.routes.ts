import { Router } from 'express';
import { IssueToken } from '../../../application/usecases/IssueToken.js';

export function createAuthRoutes(issueToken: IssueToken): Router {
  const router = Router();

  /**
   * POST /auth/token
   * Gera token de acesso
   */
  router.post('/token', async (req, res, next) => {
    try {
      const { apiKey, email, password, grantType, refreshToken } = req.body;

      if (!grantType) {
        return res.status(400).json({ error: 'grantType is required' });
      }

      const result = await issueToken.execute({
        apiKey,
        email,
        password,
        grantType,
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /auth/refresh
   * Refresh token
   */
  router.post('/refresh', async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken is required' });
      }

      const result = await issueToken.execute({
        grantType: 'refresh_token',
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
