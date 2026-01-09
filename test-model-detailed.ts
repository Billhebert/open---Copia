import { PrismaClient } from '@prisma/client';
import { JwtAuth } from './src/infrastructure/auth/JwtAuth.js';
import { ModelRouter } from './src/infrastructure/models/ModelRouter.js';

const prisma = new PrismaClient();

async function testModelSelectionDetailed() {
  console.log('🔧 Testing model selection in detail...');

  const jwtAuth = new JwtAuth(prisma);
  const modelRouter = new ModelRouter(prisma, './models.json');
  await modelRouter.initialize();

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

  console.log('✅ Auth context created');

  // Get all allowed models
  const allowedModels = await modelRouter.listAllowedModels(authContext);
  console.log(`📋 Total allowed models: ${allowedModels.length}`);

  // Check which models have toolCall capability
  const modelsWithToolCall = allowedModels.filter(m => m.capabilities.toolCall);
  console.log(`📋 Models with toolCall: ${modelsWithToolCall.length}`);

  // Show some examples
  console.log('\n📋 Sample models with toolCall:');
  modelsWithToolCall.slice(0, 10).forEach(m => {
    console.log(`  - ${m.id} (free: ${m.cost.type === 'free'})`);
  });

  // Try to select a model
  console.log('\n📋 Testing selection with preferFree: true');
  const selected = await modelRouter.selectModel(authContext, {
    requiredCapabilities: { toolCall: true },
    preferFree: true,
  });
  console.log('✅ Selected model:', selected);

  // Try without toolCall requirement
  console.log('\n📋 Testing selection without required capabilities');
  const selectedAny = await modelRouter.selectModel(authContext, {
    preferFree: true,
  });
  console.log('✅ Selected model (any):', selectedAny);

  // Try with specific free model
  console.log('\n📋 Testing isModelAllowed for opencode-free/deepseek-r1-free');
  const isAllowed = await modelRouter.isModelAllowed(authContext, 'opencode-free/deepseek-r1-free');
  console.log('✅ Is allowed:', isAllowed);
}

testModelSelectionDetailed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
