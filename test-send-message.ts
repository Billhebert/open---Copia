import { PrismaClient } from '@prisma/client';
import { JwtAuth } from './src/infrastructure/auth/JwtAuth.js';
import { ChatRepository } from './src/infrastructure/postgres/repos/ChatRepository.js';
import { MessageRepository } from './src/infrastructure/postgres/repos/MessageRepository.js';
import { QdrantRagAdapter } from './src/infrastructure/qdrant/QdrantRagAdapter.js';
import { ModelRouter } from './src/infrastructure/models/ModelRouter.js';
import { PostgresAudit } from './src/infrastructure/audit/PostgresAudit.js';
import { MockBudgetPort } from './src/infrastructure/budget/MockBudgetPort.js';
import { PolicyEngine } from './src/domain/auth/PolicyEngine.js';
import { SendMessage } from './src/application/usecases/SendMessage.js';

const prisma = new PrismaClient();

async function testSendMessage() {
  console.log('🔧 Initializing test...');

  const jwtAuth = new JwtAuth(prisma);
  const chatRepo = new ChatRepository(prisma);
  const messageRepo = new MessageRepository(prisma);
  const ragPort = new QdrantRagAdapter();
  const modelRouter = new ModelRouter(prisma, './models.json');
  await modelRouter.initialize();
  const auditPort = new PostgresAudit(prisma);

  const policies = await prisma.policy.findMany({ where: { enabled: true } });
  const policyEngine = new PolicyEngine(policies as any);

  const budgetPort = new MockBudgetPort();

  const sendMessage = new SendMessage(
    chatRepo,
    messageRepo,
    ragPort,
    modelRouter,
    budgetPort,
    auditPort,
    policyEngine,
    null
  );

  // Get user and build auth context
  const user = await prisma.user.findUnique({
    where: { id: 'test-user-001' }
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  const authContext = await jwtAuth.buildAuthContext(
    user.tenantId,
    user.id
  );

  console.log('✅ Auth context created:', {
    tenantId: authContext.tenantId,
    userId: authContext.userId
  });

  // Get chat
  const chat = await chatRepo.findChatById('f8711070-a077-4ba5-b8f0-b60f37d33e7c');
  if (!chat) {
    console.error('Chat not found');
    return;
  }

  console.log('✅ Chat found:', chat.id);

  // Try to send message
  try {
    const result = await sendMessage.execute(authContext, {
      chatId: chat.id,
      content: 'Test message from direct call'
    });
    console.log('✅ Message sent successfully!');
    console.log('User message:', result.userMessage.id);
  } catch (error) {
    console.error('❌ Error sending message:', error);
  }
}

testSendMessage()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
