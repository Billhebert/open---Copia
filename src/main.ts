import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Infrastructure
import { JwtAuth } from './infrastructure/auth/JwtAuth.js';
import { ChatRepository } from './infrastructure/postgres/repos/ChatRepository.js';
import { MessageRepository } from './infrastructure/postgres/repos/MessageRepository.js';
import { QdrantRagAdapter } from './infrastructure/qdrant/QdrantRagAdapter.js';
import { LocalFileStore } from './infrastructure/filestore/LocalFileStore.js';
import { ModelRouter } from './infrastructure/models/ModelRouter.js';
import { PostgresAudit } from './infrastructure/audit/PostgresAudit.js';
import { MockBudgetPort } from './infrastructure/budget/MockBudgetPort.js';
import { OpencodeAdapter } from './infrastructure/sdk/OpencodeAdapter.js';

// Domain
import { PolicyEngine } from './domain/auth/PolicyEngine.js';

// Application Use Cases
import { IssueToken } from './application/usecases/IssueToken.js';
import { CreateChat } from './application/usecases/CreateChat.js';
import { ListChats } from './application/usecases/ListChats.js';
import { GetChat } from './application/usecases/GetChat.js';
import { DeleteChat } from './application/usecases/DeleteChat.js';
import { AddMember } from './application/usecases/AddMember.js';
import { SendMessage } from './application/usecases/SendMessage.js';
import { SearchRag } from './application/usecases/SearchRag.js';
import { IngestDocument } from './application/usecases/IngestDocument.js';

// HTTP
import { authMiddleware } from './interfaces/http/middleware/auth.middleware.js';
import { errorMiddleware } from './interfaces/http/middleware/error.middleware.js';
import { createAuthRoutes } from './interfaces/http/routes/auth.routes.js';
import { createChatRoutes } from './interfaces/http/routes/chat.routes.js';
import { createRagRoutes } from './interfaces/http/routes/rag.routes.js';

dotenv.config();

async function bootstrap() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3001', 10);

  // Middleware global
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Prisma
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✅ Connected to PostgreSQL');

  // Infrastructure
  const jwtAuth = new JwtAuth(prisma);
  const chatRepo = new ChatRepository(prisma);
  const messageRepo = new MessageRepository(prisma);
  const ragPort = new QdrantRagAdapter();
  const fileStore = new LocalFileStore();
  const auditPort = new PostgresAudit(prisma);

  // ModelRouter
  const modelRouter = new ModelRouter(prisma, './models.json');
  await modelRouter.initialize();
  console.log('✅ Model catalog loaded');

  // PolicyEngine (carrega policies do banco)
  const policies = await prisma.policy.findMany({ where: { enabled: true } });
  const policyEngine = new PolicyEngine(policies as any);

  // OpenCode SDK Adapter
  let sdkPort = 8000;
  if (process.env.SDK_PORT) {
    sdkPort = parseInt(process.env.SDK_PORT, 10) || 8000;
  }
  console.log(`[DEBUG] Criando OpencodeAdapter com sdkPort: ${sdkPort}`);
  const opencodeAdapter = new OpencodeAdapter();
  await opencodeAdapter.initialize();

  // TODO: Criar ports adicionais (DocumentRepo, etc)
  const budgetPort = new MockBudgetPort();
  const documentRepo: any = null; // Placeholder

  // Use Cases
  const issueToken = new IssueToken(jwtAuth, auditPort);
  const createChat = new CreateChat(chatRepo, auditPort, policyEngine);
  const listChats = new ListChats(chatRepo, auditPort, policyEngine);
  const getChat = new GetChat(chatRepo, messageRepo, auditPort);
  const deleteChat = new DeleteChat(chatRepo, messageRepo, auditPort);
  const addMember = new AddMember(chatRepo, auditPort, policyEngine);
  const sendMessage = new SendMessage(
    chatRepo,
    messageRepo,
    ragPort,
    modelRouter,
    budgetPort,
    auditPort,
    policyEngine,
    opencodeAdapter
  );
  const searchRag = new SearchRag(ragPort, auditPort, policyEngine);
  const ingestDocument = new IngestDocument(fileStore, ragPort, auditPort, documentRepo);

  // Routes públicas
  app.use('/api/auth', createAuthRoutes(issueToken));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      sdkUrl: opencodeAdapter ? opencodeAdapter.getUrl() : null,
      timestamp: new Date().toISOString()
    });
  });

  // Routes protegidas
  app.use('/api/chats', authMiddleware(jwtAuth), createChatRoutes(createChat, listChats, addMember, sendMessage, getChat, deleteChat));
  app.use('/api/rag', authMiddleware(jwtAuth), createRagRoutes(searchRag, ingestDocument));

  // Error handling
  app.use(errorMiddleware);

  // Start server
  app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════╗`);
    console.log(`║     Multi-Tenant AI Chat Platform v1.0.0      ║`);
    console.log(`╚════════════════════════════════════════════════╝`);
    console.log(`\n🌐 API Server: http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/health`);
    if (opencodeAdapter) {
      console.log(`🔌 OpenCode SDK: ${opencodeAdapter.getUrl() || 'Não iniciado'}`);
    } else {
      console.log(`🔌 OpenCode SDK: Desativado`);
    }
    console.log(`\n📚 Features:`);
    console.log(`  ✅ Multi-tenant authentication (API Keys + JWT)`);
    console.log(`  ✅ Role-based access control (RBAC)`);
    console.log(`  ✅ Multi-user chats with visibility controls`);
    console.log(`  ✅ RAG with ACL per chunk`);
    console.log(`  ✅ Model routing with policies`);
    console.log(`  ✅ Comprehensive audit logging`);
    console.log(`\n`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    if (opencodeAdapter) {
      await opencodeAdapter.shutdown();
    }
    await prisma.$disconnect();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
