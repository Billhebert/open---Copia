import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function generateApiKey(): string {
  return `sk_${randomBytes(32).toString('hex')}`;
}

async function main() {
  console.log('🚀 Iniciando setup do tenant e usuário...\n');

  // Dados do tenant
  const tenantData = {
    name: process.env.TENANT_NAME || 'Acme Corporation',
    slug: process.env.TENANT_SLUG || 'acme',
    apiKey: generateApiKey(),
  };

  // Dados do usuário
  const userData = {
    email: process.env.USER_EMAIL || 'admin@acme.com',
    name: process.env.USER_NAME || 'Admin User',
    password: process.env.USER_PASSWORD || 'admin123',
    roles: ['tenant_admin', 'dept_admin', 'user'],
    tags: ['admin', 'premium'],
    department: null,
    subdepartment: null,
  };

  try {
    // Verifica se tenant já existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: tenantData.slug },
    });

    let tenant;
    if (existingTenant) {
      console.log(`ℹ️  Tenant "${tenantData.name}" já existe`);
      tenant = existingTenant;
    } else {
      // Cria tenant
      tenant = await prisma.tenant.create({
        data: {
          name: tenantData.name,
          slug: tenantData.slug,
          apiKey: tenantData.apiKey,
          settings: {},
        },
      });
      console.log(`✅ Tenant "${tenant.name}" criado com sucesso!`);
    }

    // Verifica se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: userData.email,
        },
      },
    });

    let user;
    if (existingUser) {
      console.log(`ℹ️  Usuário "${userData.email}" já existe`);
      user = existingUser;
    } else {
      // Hash da senha
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Cria usuário
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: userData.email,
          name: userData.name,
          passwordHash,
          apiKey: generateApiKey(),
          roles: userData.roles,
          tags: userData.tags,
          departmentId: userData.department,
          subdepartment: userData.subdepartment,
          settings: {},
        },
      });
      console.log(`✅ Usuário "${user.name}" criado com sucesso!`);
    }

    // Exibe credenciais
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    CREDENCIAIS DE ACESSO                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('🏢 TENANT');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Nome:     ${tenant.name}`);
    console.log(`Slug:     ${tenant.slug}`);
    console.log(`API Key:  ${tenant.apiKey}`);
    console.log('');

    console.log('👤 USUÁRIO');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Nome:     ${user.name}`);
    console.log(`Email:    ${user.email}`);
    console.log(`Senha:    ${userData.password}`);
    console.log(`API Key:  ${user.apiKey}`);
    console.log(`Roles:    ${user.roles.join(', ')}`);
    console.log(`Tags:     ${user.tags.join(', ')}`);
    console.log('');

    console.log('🔑 COMO FAZER LOGIN');
    console.log('─────────────────────────────────────────────────────────');
    console.log('Opção 1: API Key do Tenant (server-to-server)');
    console.log(`  curl -X POST http://localhost:3000/api/auth/token \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{"grantType":"api_key","apiKey":"${tenant.apiKey}"}'`);
    console.log('');
    console.log('Opção 2: API Key do Usuário (end-user)');
    console.log(`  curl -X POST http://localhost:3000/api/auth/token \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{"grantType":"api_key","apiKey":"${user.apiKey}"}'`);
    console.log('');
    console.log('Opção 3: Frontend (http://localhost ou http://localhost:5173)');
    console.log(`  - Cole a API Key no campo de login:`);
    console.log(`    ${user.apiKey}`);
    console.log('');

    console.log('💡 DICA');
    console.log('─────────────────────────────────────────────────────────');
    console.log('Salve essas credenciais em um lugar seguro!');
    console.log('As API Keys não serão exibidas novamente.');
    console.log('');

    console.log('✅ Setup concluído com sucesso!\n');
  } catch (error) {
    console.error('❌ Erro ao criar tenant/usuário:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
