import { promises as fs } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testModelLoading() {
  console.log('🔧 Testing model loading...');

  const modelsFilePath = './models.json';
  
  try {
    const content = await fs.readFile(modelsFilePath, 'utf-8');
    const modelsData = JSON.parse(content);
    
    console.log('✅ Models file loaded successfully');
    console.log('📋 Providers found:', Object.keys(modelsData));
    
    // Count models
    let totalModels = 0;
    for (const [providerId, providerData] of Object.entries<any>(modelsData)) {
      const models = providerData.models || {};
      const modelCount = Object.keys(models).length;
      console.log(`  - ${providerId}: ${modelCount} models`);
      totalModels += modelCount;
    }
    console.log(`📊 Total models: ${totalModels}`);

    // Check for free models
    console.log('\n📋 Free models:');
    for (const [providerId, providerData] of Object.entries<any>(modelsData)) {
      const models = providerData.models || {};
      for (const [modelId, model] of Object.entries<any>(models)) {
        const isFree = modelId.toLowerCase().includes('free') || 
                       (model.cost && model.cost.input === 0 && model.cost.output === 0);
        if (isFree) {
          console.log(`  - ${providerId}/${modelId}`);
        }
      }
    }

    // Check model policies
    console.log('\n📋 Model policies in database:');
    const policies = await prisma.modelPolicy.findMany({
      where: { enabled: true }
    });
    console.log(`Found ${policies.length} policies`);
    for (const policy of policies) {
      console.log(`  - ${policy.id}: allowedModels =`, policy.allowedModels);
    }

  } catch (error) {
    console.error('❌ Error loading models:', error);
  }
}

testModelLoading()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
