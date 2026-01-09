# 🏢 Guia de Criação de Tenants e Usuários

Este guia explica como criar e configurar tenants, usuários e suas permissões.

## 🚀 Modo Rápido (Recomendado para Testes)

Cria uma configuração padrão com tenant, departamentos, usuários e políticas:

```bash
npm run create-tenant
# Escolha: 2 (Modo Rápido)
```

**O que é criado:**

### Tenant
- **Nome**: Demo Company
- **Slug**: demo

### Departamentos
- Engineering
- Sales

### Usuários
| Email | Senha | Roles | Department |
|-------|-------|-------|------------|
| admin@demo.com | admin123 | tenant_admin, dept_admin, user | - |
| dev@demo.com | dev123 | user | Engineering |
| sales@demo.com | sales123 | user | Sales |

### Políticas
- Admins: Acesso a todos os modelos (*)
- Users: Apenas modelos gratuitos (minimax, qwen3)

## 🎯 Modo Interativo (Personalizado)

Permite criar configuração customizada passo a passo:

```bash
npm run create-tenant
# Escolha: 1 (Modo Interativo)
```

### Passo 1: Informações do Tenant

```
Nome do tenant (ex: "Acme Corporation"): Minha Empresa
Slug do tenant (sugestão: "minha-empresa"): minha-empresa
Descrição (opcional): Empresa de tecnologia
```

### Passo 2: Criar Departamentos (Opcional)

```
Criar departamentos? (s/n): s

Nome do departamento: Engenharia
Descrição (opcional): Time de desenvolvimento

Adicionar outro departamento? (s/n): s

Nome do departamento: Vendas
Descrição (opcional): Time comercial

Adicionar outro departamento? (s/n): n
```

### Passo 3: Criar Usuários

```
Nome completo: João Silva
Email: joao@empresa.com
Senha: senha123
Roles (separadas por vírgula, ex: "user,manager"): tenant_admin,user
Tags (separadas por vírgula, opcional): admin,premium
Departamento (nome ou deixe vazio):
Subdepartamento (opcional):

Adicionar outro usuário? (s/n): s

Nome completo: Maria Santos
Email: maria@empresa.com
Senha: maria123
Roles (separadas por vírgula, ex: "user,manager"): user
Tags (separadas por vírgula, opcional): developer
Departamento (nome ou deixe vazio): Engenharia
Subdepartamento (opcional): Backend

Adicionar outro usuário? (s/n): n
```

### Passo 4: Configurar Políticas de Modelos (Opcional)

```
Criar políticas de modelos? (s/n): s

Nome da política: Acesso Admin
Descrição: Admins podem usar todos os modelos
Tipo de escopo (roles/departments/all): roles
Roles (separadas por vírgula): tenant_admin,dept_admin
Modelos permitidos (separados por vírgula, ou * para todos): *

Adicionar outra política? (s/n): s

Nome da política: Desenvolvedores Premium
Descrição: Devs premium podem usar modelos avançados
Tipo de escopo (roles/departments/all): roles
Roles (separadas por vírgula): user
Modelos permitidos (separados por vírgula, ou * para todos): opencode/qwen3-coder,opencode/claude-opus-4-1

Adicionar outra política? (s/n): n
```

## 📊 Roles Disponíveis

| Role | Descrição | Permissões |
|------|-----------|------------|
| `tenant_admin` | Administrador do tenant | Acesso total ao tenant |
| `dept_admin` | Administrador de departamento | Gerencia seu departamento |
| `manager` | Gerente | Gerencia equipe |
| `user` | Usuário padrão | Usa o sistema |
| `viewer` | Visualizador | Apenas leitura |

**Você pode criar roles customizadas!**

## 🏷️ Tags Sugeridas

| Tag | Uso |
|-----|-----|
| `admin` | Usuários administrativos |
| `premium` | Acesso premium |
| `vip` | Usuários VIP |
| `internal` | Funcionários internos |
| `external` | Usuários externos |
| `developer` | Desenvolvedores |
| `beta` | Testadores beta |

**Tags são totalmente customizáveis!**

## 🎯 Casos de Uso Comuns

### Startup/Pequena Empresa

```bash
# Modo rápido é perfeito!
npm run create-tenant
# Escolha: 2
```

### Empresa Média

**Estrutura recomendada:**

- **Departamentos**: Engineering, Sales, Marketing, HR
- **Roles**:
  - C-Level: tenant_admin
  - Diretores: dept_admin
  - Managers: manager
  - Time: user

**Usuários sugeridos:**
- CEO/CTO: tenant_admin
- Diretor de Eng: dept_admin + Engineering dept
- Tech Leads: manager + tags:senior
- Developers: user + tags:developer

### Enterprise

**Estrutura recomendada:**

- **Departamentos** com subdepartamentos:
  - Engineering → Frontend, Backend, DevOps, QA
  - Sales → Enterprise, SMB
  - Marketing → Digital, Content

- **Roles hierárquicas**:
  - tenant_admin: C-Level
  - dept_admin: VPs
  - manager: Directors, Managers
  - user: Individual Contributors
  - viewer: Contractors, Interns

- **Políticas**:
  - Admins: Todos os modelos
  - Managers: Modelos premium
  - Users: Modelos standard
  - Viewers: Apenas leitura

## 🔐 Políticas de Modelos

### Por Roles

```
Nome da política: Developer Access
Tipo de escopo: roles
Roles: user,developer
Modelos: opencode/qwen3-coder,opencode/minimax-m2.1-free
```

### Por Departamento

```
Nome da política: Sales Premium
Tipo de escopo: departments
Departamentos: Sales,Marketing
Modelos: opencode/claude-opus-4-1,opencode/gpt-5
```

### Global

```
Nome da política: Free Models
Tipo de escopo: all
Modelos: opencode/minimax-m2.1-free
```

### Prioridade

Políticas têm prioridade (100 = mais alta):

1. Política específica de role/dept (prioridade: 100)
2. Política global (prioridade: 50)

## 🔄 Fluxo de Trabalho Recomendado

### Setup Inicial

1. Crie o tenant
2. Crie departamentos principais
3. Crie usuário admin
4. Configure políticas básicas

### Onboarding de Equipe

1. Crie usuários com roles apropriadas
2. Associe a departamentos
3. Adicione tags para segmentação
4. Teste permissões

### Crescimento

1. Adicione novos departamentos
2. Refine políticas de modelos
3. Ajuste roles conforme necessário
4. Monitore uso

## 📝 Exemplos Práticos

### Exemplo 1: Agência Digital

```bash
npm run create-tenant

# Modo interativo
Tenant: Creative Agency
Slug: creative-agency

Departamentos:
- Design
- Development
- Marketing
- Operations

Usuários:
- CEO (tenant_admin)
- Design Lead (dept_admin, Design)
- Developers (user, Development, tags:developer)
- Marketing Team (user, Marketing, tags:marketing)
- Freelancers (viewer, tags:external,freelance)

Políticas:
- Admins: Todos os modelos
- Design/Marketing: Modelos visuais
- Development: Modelos de código
- Freelancers: Apenas modelos gratuitos
```

### Exemplo 2: Startup SaaS

```bash
npm run create-tenant

# Modo interativo
Tenant: MyStartup
Slug: mystartup

Departamentos:
- Engineering
- Product
- Growth

Usuários:
- Founders (tenant_admin, tags:founder)
- Engineers (user, Engineering, tags:developer)
- Product Managers (manager, Product)
- Growth Team (user, Growth, tags:marketing)

Políticas:
- Founders: Todos os modelos
- Todos: Modelos gratuitos + 1 premium
```

### Exemplo 3: Consultoria

```bash
npm run create-tenant

# Modo interativo
Tenant: Consulting Firm
Slug: consulting-firm

Departamentos:
- Strategy
- Technology
- Finance

Usuários:
- Partners (tenant_admin)
- Senior Consultants (manager, tags:senior)
- Consultants (user, tags:consultant)
- Analysts (user, tags:junior)
- Clients (viewer, tags:external,client)

Políticas:
- Partners/Seniors: Todos os modelos
- Consultants: Modelos standard
- Analysts/Clients: Apenas leitura
```

## 🔒 Segurança e Melhores Práticas

### Senhas

- ❌ **NÃO use senhas fracas** (admin123, password, etc.)
- ✅ **USE senhas fortes** (mínimo 12 caracteres, mix de letras/números/símbolos)
- ✅ **Considere gerenciador de senhas** para API Keys

### Roles

- ❌ **NÃO dê tenant_admin para todos**
- ✅ **USE princípio do menor privilégio**
- ✅ **Revise roles regularmente**

### API Keys

- ❌ **NÃO compartilhe API Keys**
- ❌ **NÃO commite API Keys no git**
- ✅ **USE variáveis de ambiente**
- ✅ **ROTACIONE API Keys periodicamente**

### Políticas

- ❌ **NÃO permita todos os modelos para todos**
- ✅ **RESTRINJA modelos caros**
- ✅ **MONITORE uso de tokens**
- ✅ **CONFIGURE budgets**

## 🆘 Troubleshooting

### "Tenant já existe"

```bash
# O script detecta tenants existentes
# Use um slug diferente ou delete o tenant existente
```

### "Não consigo criar usuário"

```bash
# Verifique se o email já existe
# Cada email deve ser único por tenant
```

### "Política não funciona"

```bash
# Verifique a prioridade
# Políticas mais específicas devem ter prioridade maior
# Teste com: npm run prisma:studio
```

### "Erro de conexão com banco"

```bash
# Verifique DATABASE_URL no .env
# Execute: npm run prisma:migrate
# Teste conexão: npm run prisma:studio
```

## 📊 Visualizar Dados

Use o Prisma Studio para visualizar e editar:

```bash
npm run prisma:studio
```

Acesse: http://localhost:5555

## 🔗 Ver também

- [Setup Guide](../SETUP.md)
- [RAG](./RAG.md)
- [Agents](./AGENTS.md)
- [Custom Tools](./CUSTOM_TOOLS.md)
