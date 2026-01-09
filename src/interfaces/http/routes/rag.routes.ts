import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { SearchRag } from '../../../application/usecases/SearchRag.js';
import { IngestDocument } from '../../../application/usecases/IngestDocument.js';

export function createRagRoutes(
  searchRag: SearchRag,
  ingestDocument: IngestDocument
): Router {
  const router = Router();

  /**
   * POST /rag/search
   * Busca no RAG
   */
  router.post('/search', async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { query, limit, minScore, filters } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'query is required' });
      }

      const result = await searchRag.execute(req.authContext, {
        query,
        limit,
        minScore,
        filters,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /rag/documents
   * Indexa um documento
   */
  router.post('/documents', async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        name,
        description,
        content,
        format,
        tags,
        department,
        subdepartment,
        accessRoles,
        accessScope,
      } = req.body;

      if (!name || !content || !format) {
        return res.status(400).json({ error: 'name, content, and format are required' });
      }

      const result = await ingestDocument.execute(req.authContext, {
        name,
        description,
        content: Buffer.from(content, 'base64'),
        format,
        tags,
        department,
        subdepartment,
        accessRoles,
        accessScope,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
