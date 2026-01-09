import { PrismaClient } from '@prisma/client';
import { JwtAuth } from './src/infrastructure/auth/JwtAuth.js';
import { ModelRouter } from './src/infrastructure/models/ModelRouter.js';

const prisma = new PrismaClient();

async function testModelSelection() {
  console.log('🔧 Initializing model selection test...');

  const jwtAuth = new JwtAuth(prisma);
  const modelRouter = new ModelRouter(prisma, './models.json');
  await modelRouter.initialize();

  console.log('✅ ModelRouter initialized');

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

  // Test model selection
  try {
    console.log('\n📋 Testing model selection...');
    
    const model = await modelRouter.selectModel(authContext, {
      requiredCapabilities: { toolCall: true },
      preferFree: true,
    });
    
    console.log('✅ Selected model:', model);
  } catch (error) {
    console.error('❌ Error selecting model:', error);
  }

  // List all available models
  console.log('\n📋 All available providers:');
  const providers = modelRouter.listProviders();
  console.log('Providers:', providers);

  // Check model policies
  console.log('\n📋 Checking model policies...');
  const policies = await prisma.modelPolicy.findMany({
    where: { tenantId: user.tenantId, enabled: true }
  });
  console.log('Model policies:', JSON.stringify(policies, null, 2));
}

testModelSelection()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
