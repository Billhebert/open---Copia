import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'f9d563d1-a50e-46f7-867b-582eb7ce0321' },
    update: {},
    create: {
      id: 'f9d563d1-a50e-46f7-867b-582eb7ce0321',
      name: 'Test Tenant',
      slug: 'test-tenant',
      apiKey: 'test-tenant-api-key-001',
      settings: {},
    },
  });
  console.log('✅ Tenant created:', tenant.id);

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { id: 'test-user-001' },
    update: {},
    create: {
      id: 'test-user-001',
      tenantId: tenant.id,
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      apiKey: 'test-user-api-key-001',
      roles: ['user'],
      tags: [],
      settings: {},
    },
  });
  console.log('✅ User created:', user.id);

  // Create default policies
  await prisma.policy.upsert({
    where: { id: 'default-chat-policy' },
    update: {},
    create: {
      id: 'default-chat-policy',
      tenantId: tenant.id,
      name: 'Default Chat Policy',
      description: 'Default policy for chat operations',
      type: 'chat',
      scope: {},
      rules: {
        create: true,
        list: true,
        get: true,
        sendMessage: true,
        addMember: true,
      },
      priority: 0,
      enabled: true,
    },
  });
  console.log('✅ Default policies created');

  // Create model policy allowing all models
  await prisma.modelPolicy.upsert({
    where: { id: 'default-model-policy' },
    update: {},
    create: {
      id: 'default-model-policy',
      tenantId: tenant.id,
      scope: {},
      allowedModels: ['*'],
      priority: 0,
      enabled: true,
    },
  });
  console.log('✅ Default model policy created');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📝 Test credentials:');
  console.log('   Tenant API Key: test-tenant-api-key-001');
  console.log('   User API Key: test-user-api-key-001');
  console.log('   Email: test@example.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
