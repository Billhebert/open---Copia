# Docker Deployment Guide

Complete Docker setup for the Multi-Tenant AI Chat Platform.

## 📦 What's Included

The Docker Compose stack includes:

- **PostgreSQL 16**: Main database
- **Qdrant**: Vector database for RAG
- **Backend API**: Node.js/Express application
- **Frontend**: React app served by Nginx

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### 1. Environment Setup

Create a `.env` file in the root directory:

```bash
# JWT Secrets (CHANGE THESE!)
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-min-32-chars

# Optional: Override other settings
# DATABASE_URL will be set by docker-compose
# QDRANT_URL will be set by docker-compose
```

### 2. Start All Services

```bash
# Build and start all services
docker-compose up -d

# Or with build flag
docker-compose up -d --build
```

### 3. Check Status

```bash
# View all services
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Qdrant Dashboard**: http://localhost:6334/dashboard

## 🛠️ Management Commands

### Start/Stop

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Rebuild

```bash
# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up -d --build
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f qdrant
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Execute Commands

```bash
# Open shell in backend container
docker-compose exec backend sh

# Run Prisma commands
docker-compose exec backend npx prisma studio
docker-compose exec backend npx prisma migrate dev

# Open PostgreSQL shell
docker-compose exec postgres psql -U chatuser -d chat_platform
```

## 🗄️ Database Management

### Migrations

Migrations run automatically on container start, but you can also run manually:

```bash
# Create new migration
docker-compose exec backend npx prisma migrate dev --name your_migration_name

# Apply migrations
docker-compose exec backend npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
docker-compose exec backend npx prisma migrate reset
```

### Prisma Studio

```bash
# Open Prisma Studio (GUI for database)
docker-compose exec backend npx prisma studio

# Then access at http://localhost:5555
```

### Backup & Restore

```bash
# Backup
docker-compose exec postgres pg_dump -U chatuser chat_platform > backup.sql

# Restore
docker-compose exec -T postgres psql -U chatuser chat_platform < backup.sql
```

## 📁 Docker Volumes

Persistent data is stored in Docker volumes:

- `postgres_data`: PostgreSQL database
- `qdrant_data`: Qdrant vector database
- `storage_data`: File uploads

### View Volumes

```bash
docker volume ls | grep chat
```

### Inspect Volume

```bash
docker volume inspect chat_postgres_data
```

### Backup Volume

```bash
# Backup storage volume
docker run --rm -v chat_storage_data:/data -v $(pwd):/backup alpine tar czf /backup/storage-backup.tar.gz -C /data .
```

## 🔧 Configuration

### Environment Variables

Override in `.env` file:

```bash
# Database (automatically set by docker-compose)
DATABASE_URL=postgresql://chatuser:chatpass123@postgres:5432/chat_platform?schema=public

# JWT Secrets (REQUIRED - change these!)
JWT_ACCESS_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Qdrant (automatically set)
QDRANT_URL=http://qdrant:6333

# File Storage
FILE_STORE_PATH=/app/storage
FILE_STORE_TYPE=local

# Server
PORT=3000
NODE_ENV=production
```

### Ports

Default ports (can be changed in docker-compose.yml):

- `80` → Frontend (Nginx)
- `3000` → Backend API
- `5432` → PostgreSQL
- `6333` → Qdrant HTTP API
- `6334` → Qdrant gRPC API & Dashboard

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ http://localhost
       ▼
┌─────────────────┐
│  Nginx (Port 80)│
│   Frontend      │
└────────┬────────┘
         │ /api → proxy
         ▼
┌─────────────────┐
│ Backend API     │
│  (Port 3000)    │
└────┬─────┬──────┘
     │     │
     │     └──────────────┐
     ▼                    ▼
┌──────────┐      ┌──────────────┐
│PostgreSQL│      │   Qdrant     │
│(Port 5432│      │ (Port 6333)  │
└──────────┘      └──────────────┘
```

## 🔐 Security

### Production Checklist

- [ ] Change JWT secrets in `.env`
- [ ] Change PostgreSQL password in `docker-compose.yml`
- [ ] Use HTTPS (add reverse proxy like Traefik/Caddy)
- [ ] Enable firewall rules
- [ ] Set proper CORS origins
- [ ] Enable rate limiting
- [ ] Use secrets management (Docker secrets, Vault)
- [ ] Regular backups
- [ ] Monitor logs

### HTTPS Setup (Traefik Example)

Add labels to frontend service:

```yaml
frontend:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.chat.rule=Host(`your-domain.com`)"
    - "traefik.http.routers.chat.entrypoints=websecure"
    - "traefik.http.routers.chat.tls.certresolver=letsencrypt"
```

## 🧪 Development

For development, use local setup instead:

```bash
# Backend
npm run dev

# Frontend
npm run dev:frontend

# Both
npm run dev:all
```

Docker is recommended for **production** or **staging** environments.

## 📊 Monitoring

### Health Checks

All services have health checks:

```bash
# Check all health statuses
docker-compose ps

# Check specific service
curl http://localhost:3000/health
curl http://localhost:6333/health
```

### Resource Usage

```bash
# View resource usage
docker stats

# View specific container
docker stats chat-backend
```

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database not ready → wait for health check
# - Migrations failed → check DATABASE_URL
# - Port conflict → change port in docker-compose.yml
```

### Frontend shows 502 Bad Gateway

```bash
# Check backend is running
docker-compose ps backend

# Check nginx config
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Restart frontend
docker-compose restart frontend
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U chatuser -d chat_platform -c "SELECT 1;"

# Check DATABASE_URL
docker-compose exec backend env | grep DATABASE_URL
```

### Qdrant errors

```bash
# Check Qdrant is running
docker-compose ps qdrant

# Check health
curl http://localhost:6333/health

# View dashboard
open http://localhost:6334/dashboard
```

## 🚀 Production Deployment

### AWS ECS / Azure Container Instances

1. Build and push images:

```bash
# Build
docker-compose build

# Tag
docker tag chat-backend:latest your-registry/chat-backend:latest
docker tag chat-frontend:latest your-registry/chat-frontend:latest

# Push
docker push your-registry/chat-backend:latest
docker push your-registry/chat-frontend:latest
```

2. Use managed PostgreSQL (RDS, Azure Database)
3. Use managed object storage (S3, Azure Blob)
4. Set environment variables
5. Deploy with load balancer

### Kubernetes

Convert docker-compose to k8s:

```bash
kompose convert
```

Or use Helm chart (create custom).

## 📝 Notes

- **First run**: Backend automatically runs migrations
- **Volumes**: Data persists across restarts
- **Networks**: All services on `chat-network` bridge
- **Logs**: Stored in Docker (use `docker logs`)
- **Scaling**: Use `docker-compose up -d --scale backend=3` (needs load balancer)

## 🆘 Support

For issues:
1. Check logs: `docker-compose logs`
2. Restart services: `docker-compose restart`
3. Full reset: `docker-compose down -v && docker-compose up -d --build`
