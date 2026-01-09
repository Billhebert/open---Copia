# 📚 RAG (Retrieval-Augmented Generation)

O sistema RAG permite que você dê conhecimento específico aos seus agentes através de documentos.

## 📖 Conceito

RAG funciona em 3 etapas:

1. **Ingestão**: Documentos são divididos em chunks e indexados
2. **Busca**: Quando o usuário faz uma pergunta, buscamos chunks relevantes
3. **Geração**: O AI usa os chunks como contexto para responder

## 🔒 Isolamento por Tenant

**O RAG é completamente isolado por tenant!**

Cada tenant tem:
- ✅ Sua própria collection no Qdrant (`tenant_<tenantId>`)
- ✅ Documentos isolados no storage (`./storage/<tenantId>/documents/`)
- ✅ Controle de acesso a nível de chunk (ACL)
- ✅ Embeddings independentes

**Exemplo de isolamento:**

```
Tenant A (tenant_abc123):
├── Qdrant Collection: tenant_abc123
├── Storage: ./storage/tenant_abc123/documents/
└── Documentos: doc1.pdf, doc2.txt

Tenant B (tenant_def456):
├── Qdrant Collection: tenant_def456
├── Storage: ./storage/tenant_def456/documents/
└── Documentos: doc3.pdf, doc4.txt
```

**Tenant A NUNCA vê documentos do Tenant B e vice-versa!**

## 📤 Upload de Documentos

### Via Frontend

1. Acesse a página RAG
2. Preencha o nome do documento
3. Selecione o arquivo
4. Clique em "Upload"

### Via API

```bash
curl -X POST http://localhost:3000/api/rag/documents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Company Policy",
    "content": "<base64_encoded_content>",
    "format": "pdf",
    "tags": ["policy", "hr"]
  }'
```

### Formatos Suportados

- ✅ PDF (`.pdf`)
- ✅ Word (`.docx`)
- ✅ Texto (`.txt`)
- ✅ Markdown (`.md`)

## 🔍 Busca em Documentos

### Via Frontend (Página RAG)

```typescript
import { ragApi } from './lib/api';

const results = await ragApi.search("pricing policy", {
  tags: ["pricing"],
  limit: 5,
});
```

### Via API

```bash
curl -X POST http://localhost:3000/api/rag/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the refund policy?",
    "limit": 5,
    "minScore": 0.6,
    "filters": {
      "tags": ["policy"],
      "departments": ["sales"]
    }
  }'
```

### Via Chat (Automático)

Quando `useRag` está ativado (padrão), o sistema automaticamente:
1. Busca documentos relevantes para a pergunta
2. Adiciona o contexto ao prompt do AI
3. O AI responde baseado nos documentos

## ⚙️ Configuração de Embeddings

### Opção 1: Ollama (Local - Grátis)

```env
EMBEDDING_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
```

**Vantagens:**
- ✅ Grátis
- ✅ Privado (dados não saem da sua máquina)
- ✅ Rápido (local)

**Desvantagens:**
- ❌ Requer instalação local
- ❌ Usa recursos da máquina

### Opção 2: MiniMax (Cloud)

```env
EMBEDDING_PROVIDER=minimax
MINIMAX_API_KEY=sk_...
MINIMAX_GROUP_ID=...
```

**Vantagens:**
- ✅ Sem instalação
- ✅ Escalável
- ✅ Sem uso de recursos locais

**Desvantagens:**
- ❌ Requer API key
- ❌ Custos (após limite gratuito)
- ❌ Dados enviad os para cloud

## 🎯 Chunking Strategy

Documentos são divididos em chunks para melhor precisão:

```typescript
chunkingConfig: {
  strategy: 'hybrid',
  chunkSize: 512,      // caracteres por chunk
  overlap: 50,          // overlap entre chunks
}
```

**Por que chunking?**
- ✅ Embeddings mais precisos
- ✅ Busca mais granular
- ✅ Contexto mais relevante
- ✅ Melhor performance

## 🔐 Access Control List (ACL)

Cada chunk tem ACL para controle de acesso:

```typescript
accessScope: {
  department: 'sales',
  subdepartment: 'enterprise',
  tags: ['confidential'],
  roles: ['manager', 'admin'],
}
```

Ao buscar, apenas chunks que o usuário tem permissão são retornados.

## 📊 Metadados

Cada documento/chunk tem metadados:

```typescript
{
  documentId: "doc-uuid",
  documentVersionId: "version-uuid",
  documentName: "Company Policy",
  position: 0,
  format: "pdf",
  uploadedBy: "user-id",
  uploadedAt: "2025-01-09T12:00:00Z"
}
```

## 🎓 Melhores Práticas

### 1. **Organize com Tags**

```typescript
{
  name: "Q4 Report",
  tags: ["financial", "2024", "internal"]
}
```

### 2. **Use Nomes Descritivos**

❌ Bad: "doc1.pdf"
✅ Good: "Employee Handbook 2024"

### 3. **Atualize Documentos Regularmente**

- Remova documentos obsoletos
- Faça re-upload de documentos atualizados
- Mantenha versões

### 4. **Controle de Acesso**

```typescript
{
  accessRoles: ['hr', 'manager'],
  accessScope: {
    department: 'human_resources',
    tags: ['confidential']
  }
}
```

### 5. **Otimize Queries**

```typescript
// ✅ Específico
{ query: "What is the refund policy for premium users?" }

// ❌ Genérico
{ query: "policy" }
```

### 6. **Ajuste minScore**

- `0.8+`: Muito específico (pode perder resultados)
- `0.6-0.8`: Balanceado (recomendado)
- `<0.6`: Mais resultados, menos precisão

## 🔧 Troubleshooting

### Nenhum resultado encontrado

1. Verifique se os documentos foram indexados:
   ```bash
   curl http://localhost:6333/collections/tenant_<tenantId>
   ```

2. Reduza o `minScore`:
   ```typescript
   { minScore: 0.4 }
   ```

3. Tente uma query mais simples

### Upload falha

1. Verifique o formato do arquivo
2. Confira o tamanho (limite: 10MB por padrão)
3. Veja os logs do backend para erro específico

### Resultados irrelevantes

1. Aumente o `minScore`
2. Use filtros (tags, department)
3. Seja mais específico na query

## 📈 Performance

### Otimizações Implementadas

- ✅ Chunking inteligente
- ✅ Índices Qdrant (department, tags, documentVersionId)
- ✅ Embeddings em batch
- ✅ Cache de consultas

### Limites Recomendados

- Chunks por documento: < 1000
- Tamanho do documento: < 10MB
- Limite de busca: 5-10 resultados

## 🔗 Integração com Agentes

Agentes podem usar RAG automaticamente:

```typescript
knowledge: {
  useRag: true,
  ragFilters: {
    tags: ['support', 'faq'],
    departments: ['customer_service'],
  },
}
```

O agente buscará automaticamente em documentos relevantes antes de responder.

## 📊 Monitoramento

Monitore:
- Taxa de upload
- Tempo de indexação
- Taxa de cache hit/miss
- Documentos por tenant
- Uso de storage

## 🔗 Ver também

- [Custom Tools](./CUSTOM_TOOLS.md)
- [Agentes](./AGENTS.md)
- [Skills](./SKILLS.md)
- [Setup](../SETUP.md)
