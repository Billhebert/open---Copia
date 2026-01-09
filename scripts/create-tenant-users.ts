import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

function generateApiKey(): string {
  return `sk_${randomBytes(32).toString('hex')}`;
}

interface TenantConfig {
  name: string;
  slug: string;
  description?: string;
}

interface DepartmentConfig {
  name: string;
  description?: string;
  parentId?: string;
}

interface UserConfig {
  email: string;
  name: string;
  password: string;
  roles: string[];
  tags: string[];
  department?: string;
  subdepartment?: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function createTenant(config: TenantConfig) {
  const tenant = await prisma.tenant.create({
    data: {
      name: config.name,
      slug: config.slug,
      apiKey: generateApiKey(),
      settings: {
        description: config.description,
        createdBy: 'admin-script',
        createdAt: new Date().toISOString(),
      },
    },
  });

  console.log(`\n✅ Tenant criado: ${tenant.name} (${tenant.slug})`);
  console.log(`   ID: ${tenant.id}`);
  console.log(`   API Key: ${tenant.apiKey}\n`);

  return tenant;
}

async function createDepartment(
  tenantId: string,
  config: DepartmentConfig,
  parentId?: string
) {
  const department = await prisma.department.create({
    data: {
      tenantId,
      name: config.name,
      description: config.description,
      parentId,
      settings: {},
    },
  });

  console.log(`   ✅ Departamento criado: ${department.name}`);
  return department;
}

async function createUser(tenantId: string, config: UserConfig, departmentId?: string) {
  const passwordHash = await bcrypt.hash(config.password, 10);

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: config.email,
      name: config.name,
      passwordHash,
      apiKey: generateApiKey(),
      roles: config.roles,
      tags: config.tags,
      departmentId,
      subdepartment: config.subdepartment,
      settings: {},
    },
  });

  console.log(`   ✅ Usuário criado: ${user.name} (${user.email})`);
  console.log(`      Roles: ${user.roles.join(', ')}`);
  console.log(`      Tags: ${user.tags.join(', ')}`);
  console.log(`      API Key: ${user.apiKey}`);

  return user;
}

async function interactiveMode() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         CRIAÇÃO DE TENANT, USUÁRIOS E PERMISSÕES          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Criar Tenant
  console.log('📋 PASSO 1: Informações do Tenant\n');

  const tenantName = await question('Nome do tenant (ex: "Acme Corporation"): ');
  const tenantSlug = slugify(await question(`Slug do tenant (sugestão: "${slugify(tenantName)}"): `) || tenantName);
  const tenantDescription = await question('Descrição (opcional): ');

  const tenant = await createTenant({
    name: tenantName,
    slug: tenantSlug,
    description: tenantDescription || undefined,
  });

  // 2. Criar Departamentos
  console.log('\n📋 PASSO 2: Criar Departamentos (opcional)\n');
  console.log('Exemplos: Engineering, Sales, Marketing, HR, Finance\n');

  const createDepts = await question('Criar departamentos? (s/n): ');
  const departments: Map<string, any> = new Map();

  if (createDepts.toLowerCase() === 's') {
    let moreDepts = true;
    while (moreDepts) {
      const deptName = await question('\nNome do departamento: ');
      const deptDescription = await question('Descrição (opcional): ');

      const dept = await createDepartment(tenant.id, {
        name: deptName,
        description: deptDescription || undefined,
      });

      departments.set(deptName.toLowerCase(), dept);

      const addMore = await question('\nAdicionar outro departamento? (s/n): ');
      moreDepts = addMore.toLowerCase() === 's';
    }
  }

  // 3. Criar Usuários
  console.log('\n📋 PASSO 3: Criar Usuários\n');
  console.log('Roles comuns: tenant_admin, dept_admin, manager, user, viewer');
  console.log('Tags comuns: admin, premium, vip, internal, external\n');

  const users: any[] = [];
  let moreUsers = true;

  while (moreUsers) {
    console.log('\n--- Novo Usuário ---\n');

    const userName = await question('Nome completo: ');
    const userEmail = await question('Email: ');
    const userPassword = await question('Senha: ');

    const rolesInput = await question('Roles (separadas por vírgula, ex: "user,manager"): ');
    const roles = rolesInput.split(',').map(r => r.trim()).filter(r => r);

    const tagsInput = await question('Tags (separadas por vírgula, opcional): ');
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    let departmentId: string | undefined;
    if (departments.size > 0) {
      const deptNames = Array.from(departments.keys());
      console.log(`\nDepartamentos disponíveis: ${deptNames.join(', ')}`);
      const deptChoice = await question('Departamento (nome ou deixe vazio): ');

      if (deptChoice) {
        const dept = departments.get(deptChoice.toLowerCase());
        departmentId = dept?.id;
      }
    }

    const subdepartment = await question('Subdepartamento (opcional): ');

    const user = await createUser(tenant.id, {
      email: userEmail,
      name: userName,
      password: userPassword,
      roles,
      tags,
      subdepartment: subdepartment || undefined,
    }, departmentId);

    users.push(user);

    const addMore = await question('\nAdicionar outro usuário? (s/n): ');
    moreUsers = addMore.toLowerCase() === 's';
  }

  // 4. Criar Políticas de Modelo (opcional)
  console.log('\n📋 PASSO 4: Configurar Políticas de Modelos (opcional)\n');
  console.log('Permite controlar quais modelos cada role/departamento pode usar.\n');

  const createPolicies = await question('Criar políticas de modelos? (s/n): ');

  if (createPolicies.toLowerCase() === 's') {
    console.log('\nExemplos de configuração:');
    console.log('- Admins podem usar todos os modelos');
    console.log('- Usuários normais apenas modelos gratuitos');
    console.log('- Departamento específico tem acesso a modelos premium\n');

    let morePolicies = true;
    while (morePolicies) {
      const policyName = await question('Nome da política: ');
      const policyDescription = await question('Descrição: ');

      const scopeType = await question('Tipo de escopo (roles/departments/all): ');

      let scope: any = {};
      if (scopeType === 'roles') {
        const rolesInput = await question('Roles (separadas por vírgula): ');
        scope.roles = rolesInput.split(',').map(r => r.trim());
      } else if (scopeType === 'departments') {
        const deptsInput = await question('Departamentos (separados por vírgula): ');
        scope.departments = deptsInput.split(',').map(d => d.trim());
      }

      const modelsInput = await question('Modelos permitidos (separados por vírgula, ou * para todos): ');
      const allowedModels = modelsInput.split(',').map(m => m.trim());

      await prisma.modelPolicy.create({
        data: {
          tenantId: tenant.id,
          name: policyName,
          description: policyDescription,
          scope,
          allowedModels,
          enabled: true,
          priority: 100,
        },
      });

      console.log(`   ✅ Política criada: ${policyName}`);

      const addMore = await question('\nAdicionar outra política? (s/n): ');
      morePolicies = addMore.toLowerCase() === 's';
    }
  }

  // 5. Resumo Final
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMO DA CONFIGURAÇÃO                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`🏢 TENANT: ${tenant.name}`);
  console.log(`   Slug: ${tenant.slug}`);
  console.log(`   ID: ${tenant.id}`);
  console.log(`   API Key: ${tenant.apiKey}\n`);

  if (departments.size > 0) {
    console.log('🏛️  DEPARTAMENTOS:');
    for (const [name, dept] of departments) {
      console.log(`   - ${dept.name} (ID: ${dept.id})`);
    }
    console.log('');
  }

  console.log('👥 USUÁRIOS:');
  for (const user of users) {
    console.log(`\n   📧 ${user.email}`);
    console.log(`      Nome: ${user.name}`);
    console.log(`      ID: ${user.id}`);
    console.log(`      API Key: ${user.apiKey}`);
    console.log(`      Roles: ${user.roles.join(', ')}`);
    if (user.tags.length > 0) {
      console.log(`      Tags: ${user.tags.join(', ')}`);
    }
  }

  console.log('\n\n🔑 COMO FAZER LOGIN:\n');
  console.log('1. Via API (usando API Key do usuário):');
  console.log(`   curl -X POST http://localhost:3000/api/auth/token \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"grantType":"api_key","apiKey":"${users[0]?.apiKey}"}'`);
  console.log('\n2. Via Frontend:');
  console.log(`   Cole a API Key: ${users[0]?.apiKey}`);

  console.log('\n\n💡 DICAS:\n');
  console.log('- Guarde essas credenciais em local seguro');
  console.log('- As API Keys não serão exibidas novamente');
  console.log('- Use API Keys de usuário para operações normais');
  console.log('- Use API Key de tenant para integrações server-to-server');
  console.log('- Configure políticas de modelos para controlar custos\n');

  console.log('✅ Configuração concluída com sucesso!\n');
}

async function quickMode() {
  console.log('\n🚀 MODO RÁPIDO: Criando configuração padrão...\n');

  // Tenant padrão
  const tenant = await createTenant({
    name: 'Demo Company',
    slug: 'demo',
    description: 'Tenant de demonstração',
  });

  // Departamentos padrão
  console.log('\n🏛️  Criando departamentos...\n');
  const engineering = await createDepartment(tenant.id, {
    name: 'Engineering',
    description: 'Engineering team',
  });

  const sales = await createDepartment(tenant.id, {
    name: 'Sales',
    description: 'Sales team',
  });

  // Usuários padrão
  console.log('\n👥 Criando usuários...\n');

  const admin = await createUser(tenant.id, {
    email: 'admin@demo.com',
    name: 'Admin User',
    password: 'admin123',
    roles: ['tenant_admin', 'dept_admin', 'user'],
    tags: ['admin', 'internal'],
  });

  const engineer = await createUser(tenant.id, {
    email: 'dev@demo.com',
    name: 'Developer User',
    password: 'dev123',
    roles: ['user'],
    tags: ['developer', 'internal'],
  }, engineering.id);

  const sales_user = await createUser(tenant.id, {
    email: 'sales@demo.com',
    name: 'Sales User',
    password: 'sales123',
    roles: ['user'],
    tags: ['sales', 'external'],
  }, sales.id);

  // Política padrão
  console.log('\n📋 Criando políticas...\n');
  await prisma.modelPolicy.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin Full Access',
      description: 'Admins can use all models',
      scope: { roles: ['tenant_admin', 'dept_admin'] },
      allowedModels: ['*'],
      enabled: true,
      priority: 100,
    },
  });

  await prisma.modelPolicy.create({
    data: {
      tenantId: tenant.id,
      name: 'Free Models Only',
      description: 'Regular users can only use free models',
      scope: { roles: ['user'] },
      allowedModels: ['opencode/minimax-m2.1-free', 'opencode/qwen3-coder'],
      enabled: true,
      priority: 50,
    },
  });

  console.log('   ✅ Políticas criadas\n');

  // Resumo
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              CONFIGURAÇÃO PADRÃO CRIADA                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`🏢 TENANT: ${tenant.name}`);
  console.log(`   API Key: ${tenant.apiKey}\n`);

  console.log('👥 USUÁRIOS:\n');
  console.log(`   📧 admin@demo.com / admin123`);
  console.log(`      API Key: ${admin.apiKey}\n`);
  console.log(`   📧 dev@demo.com / dev123`);
  console.log(`      API Key: ${engineer.apiKey}\n`);
  console.log(`   📧 sales@demo.com / sales123`);
  console.log(`      API Key: ${sales_user.apiKey}\n`);

  console.log('✅ Pronto para usar!\n');
}

async function main() {
  try {
    console.log('\nEscolha o modo de criação:\n');
    console.log('1. Modo Interativo (você escolhe tudo)');
    console.log('2. Modo Rápido (configuração padrão)\n');

    const mode = await question('Escolha (1 ou 2): ');

    if (mode === '2') {
      await quickMode();
    } else {
      await interactiveMode();
    }
  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
