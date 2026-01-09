# Multi-Tenant AI Chat Platform

A comprehensive, production-ready multi-tenant AI chat platform with advanced authentication, authorization, RAG (Retrieval-Augmented Generation), and plugin system.

## 🎯 Features

### Authentication & Authorization
- **Dual API Key System**: Tenant keys (server-to-server) + User keys (end-user)
- **JWT Tokens**: Access tokens (1 day) + Refresh tokens (30 days)
- **Role-Based Access Control (RBAC)**: Flexible policy engine
- **Department/Subdepartment Scoping**: Fine-grained access control
- **BYO Key Support**: Users can bring their own API keys (stored in vault)

### Multi-User Chat
- **Multi-tenant**: Complete tenant isolation
- **Multi-user Chats**: Mix users from different departments
- **Message Visibility**: Public and private messages within chats
- **Access Scope**: RAG and tools respect message author's permissions

### RAG (Retrieval-Augmented Generation)
- **Vector Database**: Qdrant for semantic search
- **ACL per Chunk**: Every chunk has its own access scope
- **Document Versioning**: Track document changes over time
- **Multiple Formats**: PDF, DOCX, TXT, MD, and more
- **Hybrid Chunking**: Intelligent text segmentation

### Tools & Plugins
- **MCP Support**: Both process-based and HTTP-based Model Context Protocol
- **High-Risk Tool Approval**: Configurable approval workflow
- **Plugin Registry**: Database + filesystem loader
- **Per-Tenant Toggle**: Enable/disable plugins by tenant, department, role, or user

### Model Routing
- **Autonomous Selection**: Agent chooses best model within allowed set
- **Policy-Based Constraints**: Allowlist, budget, compatibility checks
- **Automatic Fallback**: Graceful degradation to alternative models
- **Budget Management**: Token and cost tracking per tenant and user

### Audit & Compliance
- **Comprehensive Logging**: All actions tracked
- **Immutable Audit Trail**: PostgreSQL-based
- **Never Log Secrets**: API keys stored in vault, never logged

## 🏗️ Architecture

Clean Architecture with clear separation of concerns:

```
src/
├── domain/              # Business logic & entities
│   ├── auth/           # AuthContext, PolicyEngine
│   ├── chat/           # ChatPermissions, Visibility
│   ├── rag/            # RagQuery, RagResult
│   └── plugins/        # PluginManifest, ToolCall
├── application/         # Use cases & ports (interfaces)
│   ├── ports/          # Repository & service interfaces
│   └── usecases/       # Business operations
├── infrastructure/      # External adapters
│   ├── auth/           # JWT, API Keys
│   ├── postgres/       # Prisma repositories
│   ├── qdrant/         # Vector database
│   ├── filestore/      # Local/S3 storage
│   ├── plugins/        # MCP adapters
│   ├── models/         # Model routing
│   └── audit/          # Audit logging
└── interfaces/          # HTTP API
    └── http/
        ├── middleware/ # Auth, error handling
        └── routes/     # REST endpoints
```

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production) 🐳

**Prerequisites**: Docker 20.10+ and Docker Compose 2.0+

```bash
# 1. Clone repository
git clone <your-repo-url>
cd CHAT

# 2. Create .env file
cp .env.example .env
# Edit .env and set JWT secrets!

# 3. Start everything with one command
docker-compose up -d

# 4. Access the application
# Frontend: http://localhost
# Backend: http://localhost:3000
# Qdrant Dashboard: http://localhost:6334/dashboard
```

That's it! Everything is running. See [DOCKER.md](./DOCKER.md) for detailed documentation.

### Option 2: Local Development

**Prerequisites**: Node.js 18+, PostgreSQL 14+, Qdrant (optional)

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd CHAT
```

2. **Install all dependencies (backend + frontend)**
```bash
npm run install:all
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

5. **Start Qdrant (optional, for RAG)**
```bash
docker run -p 6333:6333 qdrant/qdrant
```

6. **Run the application**
```bash
# Development - both backend and frontend
npm run dev:all

# Or run separately:
# Backend only (port 3000)
npm run dev

# Frontend only (port 5173)
npm run dev:frontend

# Production build
npm run build:all
npm start
```

7. **Access the application**
- Frontend: http://localhost:5173 (dev) or http://localhost (prod)
- Backend API: http://localhost:3000
- API Health: http://localhost:3000/health

## 📋 API Endpoints

### Authentication

**POST /api/auth/token**
```json
{
  "grantType": "api_key",
  "apiKey": "your-api-key"
}
```

**POST /api/auth/refresh**
```json
{
  "refreshToken": "your-refresh-token"
}
```

### Chats

**POST /api/chats**
```json
{
  "title": "My Chat",
  "systemPrompt": "You are a helpful assistant",
  "settings": {
    "allowMultiUser": true,
    "allowPrivateMessages": true
  }
}
```

**POST /api/chats/:chatId/members**
```json
{
  "userId": "user-id",
  "role": "member"
}
```

**POST /api/chats/:chatId/messages**
```json
{
  "content": "Hello, world!",
  "visibility": "public",
  "useRag": true,
  "model": "opencode/big-pickle"
}
```

### RAG

**POST /api/rag/search**
```json
{
  "query": "What is the company policy?",
  "limit": 10,
  "filters": {
    "departments": ["engineering"],
    "tags": ["policy"]
  }
}
```

**POST /api/rag/documents**
```json
{
  "name": "Company Policy",
  "content": "base64-encoded-content",
  "format": "pdf",
  "tags": ["policy", "hr"],
  "department": "hr",
  "accessRoles": ["employee"]
}
```

## 🔒 Security Rules

### Hard Rules (Implemented)

1. **Chat Context Isolation**: Assistant can only access documents/tools that the message author can access
2. **Private Messages**: Only listed users/roles can see private messages
3. **BYO Keys**: Tenant and user keys stored in vault, audited but never logged
4. **High-Risk Tools**: Require approval from chat owner or higher role (dept_admin, tenant_admin)

### Policy Examples

```typescript
// Model Policy: Only allow free models for basic users
{
  type: 'model',
  scope: { roles: ['basic_user'] },
  rules: {
    allowedModels: ['opencode/minimax-m2.1-free']
  }
}

// Tool Policy: High-risk tools require approval
{
  type: 'tool',
  scope: { roles: ['*'] },
  rules: {
    requireApproval: true,
    approverRoles: ['chat_owner', 'dept_admin']
  }
}

// RAG Policy: Limit search results
{
  type: 'rag',
  scope: { departments: ['sales'] },
  rules: {
    maxResults: 5,
    allowedDepartments: ['sales', 'marketing']
  }
}
```

## 🗄️ Database Schema

See `prisma/schema.prisma` for the complete schema.

Key entities:
- **Tenant**: Multi-tenant isolation
- **User**: End users with roles, tags, department
- **Chat**: Multi-user chat rooms
- **Message**: Chat messages with visibility controls
- **Document**: RAG documents with versioning
- **Plugin**: Tool/plugin registry
- **Policy**: Access control policies
- **AuditLog**: Immutable audit trail

## 🐳 Docker Deployment

Complete Docker setup included! See [DOCKER.md](./DOCKER.md) for full documentation.

### Quick Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec backend npx prisma studio

# Backup database
docker-compose exec postgres pg_dump -U chatuser chat_platform > backup.sql
```

### Docker Stack Includes

- **PostgreSQL 16**: Production database
- **Qdrant**: Vector database for RAG
- **Backend API**: Node.js application
- **Frontend**: React app with Nginx

All services have health checks and auto-restart policies.

## 🔄 Migration Path

### Development (Local)
- ✅ Local Node.js
- ✅ Local PostgreSQL or Docker PostgreSQL
- ✅ Local file storage
- ✅ Hot reload for development

### Production (Docker)
- ✅ Fully Dockerized (PostgreSQL + Qdrant + Backend + Frontend)
- ✅ Nginx reverse proxy
- ✅ Persistent volumes
- ✅ Health checks
- 🔜 S3 file storage (update `FILE_STORE_TYPE=s3`)
- 🔜 Kubernetes manifests
- 🔜 Vault for secrets management

## 📊 Monitoring & Observability

- Audit logs: Query via `/api/audit` endpoints
- Budget tracking: Token and cost usage per tenant/user
- Health check: `GET /health`

## 🧪 Testing

```bash
npm test
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📞 Support

For issues and questions, please open a GitHub issue.

---

Built with ❤️ using TypeScript, Prisma, Qdrant, and Express.
#   A g e n t e 
 
 # Agente

# Multi-Tenant AI Chat Platform

A comprehensive, production-ready multi-tenant AI chat platform with advanced authentication, authorization, RAG (Retrieval-Augmented Generation), and plugin system.

## 🎯 Features

### Authentication & Authorization
- **Dual API Key System**: Tenant keys (server-to-server) + User keys (end-user)
- **JWT Tokens**: Access tokens (1 day) + Refresh tokens (30 days)
- **Role-Based Access Control (RBAC)**: Flexible policy engine
- **Department/Subdepartment Scoping**: Fine-grained access control
- **BYO Key Support**: Users can bring their own API keys (stored in vault)

### Multi-User Chat
- **Multi-tenant**: Complete tenant isolation
- **Multi-user Chats**: Mix users from different departments
- **Message Visibility**: Public and private messages within chats
- **Access Scope**: RAG and tools respect message author's permissions

### RAG (Retrieval-Augmented Generation)
- **Vector Database**: Qdrant for semantic search
- **ACL per Chunk**: Every chunk has its own access scope
- **Document Versioning**: Track document changes over time
- **Multiple Formats**: PDF, DOCX, TXT, MD, and more
- **Hybrid Chunking**: Intelligent text segmentation

### Tools & Plugins
- **MCP Support**: Both process-based and HTTP-based Model Context Protocol
- **High-Risk Tool Approval**: Configurable approval workflow
- **Plugin Registry**: Database + filesystem loader
- **Per-Tenant Toggle**: Enable/disable plugins by tenant, department, role, or user

### Model Routing
- **Autonomous Selection**: Agent chooses best model within allowed set
- **Policy-Based Constraints**: Allowlist, budget, compatibility checks
- **Automatic Fallback**: Graceful degradation to alternative models
- **Budget Management**: Token and cost tracking per tenant and user

### Audit & Compliance
- **Comprehensive Logging**: All actions tracked
- **Immutable Audit Trail**: PostgreSQL-based
- **Never Log Secrets**: API keys stored in vault, never logged

## 🏗️ Architecture

Clean Architecture with clear separation of concerns:

```
src/
├── domain/              # Business logic & entities
│   ├── auth/           # AuthContext, PolicyEngine
│   ├── chat/           # ChatPermissions, Visibility
│   ├── rag/            # RagQuery, RagResult
│   └── plugins/        # PluginManifest, ToolCall
├── application/         # Use cases & ports (interfaces)
│   ├── ports/          # Repository & service interfaces
│   └── usecases/       # Business operations
├── infrastructure/      # External adapters
│   ├── auth/           # JWT, API Keys
│   ├── postgres/       # Prisma repositories
│   ├── qdrant/         # Vector database
│   ├── filestore/      # Local/S3 storage
│   ├── plugins/        # MCP adapters
│   ├── models/         # Model routing
│   └── audit/          # Audit logging
└── interfaces/          # HTTP API
    └── http/
        ├── middleware/ # Auth, error handling
        └── routes/     # REST endpoints
```

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production) 🐳

**Prerequisites**: Docker 20.10+ and Docker Compose 2.0+

```bash
# 1. Clone repository
git clone <your-repo-url>
cd CHAT

# 2. Create .env file
cp .env.example .env
# Edit .env and set JWT secrets!

# 3. Start everything with one command
docker-compose up -d

# 4. Access the application
# Frontend: http://localhost
# Backend: http://localhost:3000
# Qdrant Dashboard: http://localhost:6334/dashboard
```

That's it! Everything is running. See [DOCKER.md](./DOCKER.md) for detailed documentation.

### Option 2: Local Development

**Prerequisites**: Node.js 18+, PostgreSQL 14+, Qdrant (optional)

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd CHAT
```

2. **Install all dependencies (backend + frontend)**
```bash
npm run install:all
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

5. **Start Qdrant (optional, for RAG)**
```bash
docker run -p 6333:6333 qdrant/qdrant
```

6. **Run the application**
```bash
# Development - both backend and frontend
npm run dev:all

# Or run separately:
# Backend only (port 3000)
npm run dev

# Frontend only (port 5173)
npm run dev:frontend

# Production build
npm run build:all
npm start
```

7. **Access the application**
- Frontend: http://localhost:5173 (dev) or http://localhost (prod)
- Backend API: http://localhost:3000
- API Health: http://localhost:3000/health

## 📋 API Endpoints

### Authentication

**POST /api/auth/token**
```json
{
  "grantType": "api_key",
  "apiKey": "your-api-key"
}
```

**POST /api/auth/refresh**
```json
{
  "refreshToken": "your-refresh-token"
}
```

### Chats

**POST /api/chats**
```json
{
  "title": "My Chat",
  "systemPrompt": "You are a helpful assistant",
  "settings": {
    "allowMultiUser": true,
    "allowPrivateMessages": true
  }
}
```

**POST /api/chats/:chatId/members**
```json
{
  "userId": "user-id",
  "role": "member"
}
```

**POST /api/chats/:chatId/messages**
```json
{
  "content": "Hello, world!",
  "visibility": "public",
  "useRag": true,
  "model": "opencode/big-pickle"
}
```

### RAG

**POST /api/rag/search**
```json
{
  "query": "What is the company policy?",
  "limit": 10,
  "filters": {
    "departments": ["engineering"],
    "tags": ["policy"]
  }
}
```

**POST /api/rag/documents**
```json
{
  "name": "Company Policy",
  "content": "base64-encoded-content",
  "format": "pdf",
  "tags": ["policy", "hr"],
  "department": "hr",
  "accessRoles": ["employee"]
}
```

## 🔒 Security Rules

### Hard Rules (Implemented)

1. **Chat Context Isolation**: Assistant can only access documents/tools that the message author can access
2. **Private Messages**: Only listed users/roles can see private messages
3. **BYO Keys**: Tenant and user keys stored in vault, audited but never logged
4. **High-Risk Tools**: Require approval from chat owner or higher role (dept_admin, tenant_admin)

### Policy Examples

```typescript
// Model Policy: Only allow free models for basic users
{
  type: 'model',
  scope: { roles: ['basic_user'] },
  rules: {
    allowedModels: ['opencode/minimax-m2.1-free']
  }
}

// Tool Policy: High-risk tools require approval
{
  type: 'tool',
  scope: { roles: ['*'] },
  rules: {
    requireApproval: true,
    approverRoles: ['chat_owner', 'dept_admin']
  }
}

// RAG Policy: Limit search results
{
  type: 'rag',
  scope: { departments: ['sales'] },
  rules: {
    maxResults: 5,
    allowedDepartments: ['sales', 'marketing']
  }
}
```

## 🗄️ Database Schema

See `prisma/schema.prisma` for the complete schema.

Key entities:
- **Tenant**: Multi-tenant isolation
- **User**: End users with roles, tags, department
- **Chat**: Multi-user chat rooms
- **Message**: Chat messages with visibility controls
- **Document**: RAG documents with versioning
- **Plugin**: Tool/plugin registry
- **Policy**: Access control policies
- **AuditLog**: Immutable audit trail

## 🐳 Docker Deployment

Complete Docker setup included! See [DOCKER.md](./DOCKER.md) for full documentation.

### Quick Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec backend npx prisma studio

# Backup database
docker-compose exec postgres pg_dump -U chatuser chat_platform > backup.sql
```

### Docker Stack Includes

- **PostgreSQL 16**: Production database
- **Qdrant**: Vector database for RAG
- **Backend API**: Node.js application
- **Frontend**: React app with Nginx

All services have health checks and auto-restart policies.

## 🔄 Migration Path

### Development (Local)
- ✅ Local Node.js
- ✅ Local PostgreSQL or Docker PostgreSQL
- ✅ Local file storage
- ✅ Hot reload for development

### Production (Docker)
- ✅ Fully Dockerized (PostgreSQL + Qdrant + Backend + Frontend)
- ✅ Nginx reverse proxy
- ✅ Persistent volumes
- ✅ Health checks
- 🔜 S3 file storage (update `FILE_STORE_TYPE=s3`)
- 🔜 Kubernetes manifests
- 🔜 Vault for secrets management

## 📊 Monitoring & Observability

- Audit logs: Query via `/api/audit` endpoints
- Budget tracking: Token and cost usage per tenant/user
- Health check: `GET /health`

## 🧪 Testing

```bash
npm test
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📞 Support

For issues and questions, please open a GitHub issue.

---

Built with ❤️ using TypeScript, Prisma, Qdrant, and Express.
#   A g e n t e 
 
 