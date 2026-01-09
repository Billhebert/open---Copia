import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { CreateChat } from '../../../application/usecases/CreateChat.js';
import { ListChats } from '../../../application/usecases/ListChats.js';
import { AddMember } from '../../../application/usecases/AddMember.js';
import { SendMessage } from '../../../application/usecases/SendMessage.js';
import { GetChat } from '../../../application/usecases/GetChat.js';
import { DeleteChat } from '../../../application/usecases/DeleteChat.js';

export function createChatRoutes(
  createChat: CreateChat,
  listChats: ListChats,
  addMember: AddMember,
  sendMessage: SendMessage,
  getChat: GetChat,
  deleteChat: DeleteChat
): Router {
  const router = Router();

  /**
   * GET /chats
   * Lista chats do usuário/tenant
   */
  router.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      const result = await listChats.execute(req.authContext, {
        limit,
        offset,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /chats/:chatId
   * Busca um chat específico com suas mensagens
   */
  router.get('/:chatId', async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { chatId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const result = await getChat.execute(req.authContext, {
        chatId,
        limit,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /chats
   * Cria um novo chat
   */
  router.post('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { title, systemPrompt, settings } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      const result = await createChat.execute(req.authContext, {
        title,
        systemPrompt,
        settings,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /chats/:chatId/members
   * Adiciona um membro ao chat
   */
  router.post('/:chatId/members', async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { chatId } = req.params;
      const { userId, role, permissions } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const result = await addMember.execute(req.authContext, {
        chatId,
        userId,
        role,
        permissions,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /chats/:chatId/messages
   * Envia uma mensagem
   */
  router.post('/:chatId/messages', async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { chatId } = req.params;
      const { content, visibility, visibleTo, parentId, useRag, model } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'content is required' });
      }

      const result = await sendMessage.execute(req.authContext, {
        chatId,
        content,
        visibility,
        visibleTo,
        parentId,
        useRag,
        model,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /chats/:chatId
   * Exclui um chat
   */
  router.delete('/:chatId', async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { chatId } = req.params;

      await deleteChat.execute(req.authContext, { chatId });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
