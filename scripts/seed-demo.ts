import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function generateApiKey(): string {
  return `sk_${randomBytes(32).toString('hex')}`;
}

interface TenantInput {
  name: string;
  slug: string;
  apiKey?: string;
}

interface UserInput {
  email: string;
  name: string;
  password: string;
  roles?: string[];
  tags?: string[];
  department?: string;
  subdepartment?: string;
}

async function createTenant(data: TenantInput) {
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: data.slug },
  });

  if (existingTenant) {
    console.log(`ℹ️  Tenant "${data.name}" já existe`);
    return existingTenant;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      apiKey: data.apiKey || generateApiKey(),
      settings: {},
    },
  });

  console.log(`✅ Tenant "${tenant.name}" criado!`);
  return tenant;
}

async function createUser(tenantId: string, data: UserInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId,
        email: data.email,
      },
    },
  });

  if (existingUser) {
    console.log(`ℹ️  Usuário "${data.email}" já existe`);
    return existingUser;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: data.email,
      name: data.name,
      passwordHash,
      apiKey: generateApiKey(),
      roles: data.roles || ['user'],
      tags: data.tags || [],
      departmentId: null,
      subdepartment: data.subdepartment || null,
      settings: {},
    },
  });

  console.log(`✅ Usuário "${user.name}" criado!`);
  return user;
}

async function createDemoData() {
  console.log('🎭 Criando dados de demonstração...\n');

  // Tenant 1: Acme Corporation
  const acmeTenant = await createTenant({
    name: 'Acme Corporation',
    slug: 'acme',
  });

  const acmeAdmin = await createUser(acmeTenant.id, {
    email: 'admin@acme.com',
    name: 'Admin Acme',
    password: 'admin123',
    roles: ['tenant_admin', 'dept_admin', 'user'],
    tags: ['admin', 'premium'],
  });

  const acmeUser = await createUser(acmeTenant.id, {
    email: 'user@acme.com',
    name: 'John Doe',
    password: 'user123',
    roles: ['user'],
    tags: ['basic'],
  });

  // Tenant 2: TechStart Inc
  const techstartTenant = await createTenant({
    name: 'TechStart Inc',
    slug: 'techstart',
  });

  const techstartAdmin = await createUser(techstartTenant.id, {
    email: 'admin@techstart.io',
    name: 'Admin TechStart',
    password: 'admin123',
    roles: ['tenant_admin', 'user'],
    tags: ['admin'],
  });

  // Exibir credenciais
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              CREDENCIAIS DE DEMONSTRAÇÃO                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('🏢 TENANT 1: ACME CORPORATION');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Tenant API Key: ${acmeTenant.apiKey}`);
  console.log('');
  console.log('Admin:');
  console.log(`  Email:    ${acmeAdmin.email}`);
  console.log(`  Senha:    admin123`);
  console.log(`  API Key:  ${acmeAdmin.apiKey}`);
  console.log('');
  console.log('Usuário Regular:');
  console.log(`  Email:    ${acmeUser.email}`);
  console.log(`  Senha:    user123`);
  console.log(`  API Key:  ${acmeUser.apiKey}`);
  console.log('');

  console.log('🏢 TENANT 2: TECHSTART INC');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Tenant API Key: ${techstartTenant.apiKey}`);
  console.log('');
  console.log('Admin:');
  console.log(`  Email:    ${techstartAdmin.email}`);
  console.log(`  Senha:    admin123`);
  console.log(`  API Key:  ${techstartAdmin.apiKey}`);
  console.log('');

  console.log('✅ Dados de demonstração criados!\n');
}

async function main() {
  try {
    await createDemoData();
  } catch (error) {
    console.error('❌ Erro:', error);
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
