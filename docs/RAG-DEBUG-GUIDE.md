# Guia de Debugging RAG

## Problema Resolvido

O sistema de pesquisa RAG estava retornando resultados vazios mesmo após upload de documentos. As seguintes correções foram aplicadas:

### 1. Error Handling Melhorado

**Antes:**
- Erros eram silenciosamente ignorados
- Mock embeddings eram usados quando Ollama falhava
- Usuário não recebia feedback sobre falhas

**Depois:**
- Erros são propagados com mensagens claras
- Sistema falha explicitamente se Ollama não estiver disponível
- Frontend mostra mensagens de erro detalhadas

### 2. Logging Detalhado

Agora o sistema loga:
- Início e fim de cada busca
- Dimensões dos embeddings gerados
- Filtros aplicados
- Número de resultados e scores
- Erros detalhados com stack trace

### 3. Frontend Aprimorado

- Mensagens de erro são exibidas em caixa vermelha
- Console do navegador mostra logs detalhados
- Diferencia entre "nenhum resultado" e "erro na busca"

## Como Diagnosticar Problemas

### 1. Execute o Script de Diagnóstico

```bash
npm run test:rag
```

Este script verifica:
- ✅ Se Ollama está rodando
- ✅ Se os modelos estão instalados
- ✅ Se Qdrant está rodando
- ✅ Se há coleções criadas

### 2. Verifique os Logs do Backend

Ao fazer uma busca, você deve ver logs como:

```
[Qdrant] Iniciando busca para tenant abc123, query: "teste"
[Ollama] Gerando embedding para texto de 5 caracteres...
[Ollama] Embedding gerado com sucesso (768 dimensões)
[Qdrant] Parâmetros de busca: limit=10, score_threshold=0.5, filters=não
[Qdrant] Busca concluída: 3 resultados encontrados
[Qdrant] Melhor score: 0.856, Pior score: 0.712
```

### 3. Verifique o Console do Frontend

Ao clicar em "Pesquisar", você deve ver:

```
[Frontend] Iniciando busca: teste
[Frontend] Resposta recebida: { results: [...], query: {...} }
[Frontend] 3 resultados encontrados
```

## Problemas Comuns e Soluções

### ❌ "Não foi possível conectar ao Ollama"

**Causa:** Docker não está rodando ou Ollama não está ativo

**Solução:**
```bash
# Verificar status
docker ps | grep ollama

# Iniciar Ollama
docker-compose up -d ollama

# Verificar logs
docker logs <container-id>

# Baixar modelo (se necessário)
docker exec -it <container-id> ollama pull nomic-embed-text
```

### ❌ "Coleção RAG não encontrada"

**Causa:** Nenhum documento foi indexado ainda

**Solução:**
1. Faça upload de um documento pela interface
2. Verifique os logs do backend durante o upload
3. Confirme que a indexação foi concluída com sucesso

### ❌ "Nenhum resultado encontrado"

**Possíveis causas:**

1. **Score muito alto**: O threshold padrão é 0.5. Documentos com scores menores são ignorados.

   **Solução:** Envie uma busca com `minScore` menor:
   ```typescript
   ragApi.search(query, { minScore: 0.3 })
   ```

2. **Filtros muito restritivos**: ACL pode estar bloqueando resultados.

   **Solução:** Verifique os logs para ver que filtros estão sendo aplicados:
   ```
   [Qdrant] Filtro de departamentos aplicado: RH, TI
   ```

3. **Embeddings incompatíveis**: Se documentos foram indexados com mock embeddings e a busca usa embeddings reais (ou vice-versa), não haverá matches.

   **Solução:**
   - Delete a coleção no Qdrant
   - Reindexe todos os documentos
   ```bash
   curl -X DELETE http://localhost:6333/collections/tenant_<ID>
   ```

### ❌ "Timeout ao conectar com Ollama"

**Causa:** Modelo está sendo carregado na primeira execução (pode levar >60s)

**Solução:**
1. Aguarde o modelo ser carregado
2. Execute um teste manual:
   ```bash
   curl http://localhost:11434/api/embed -d '{
     "model": "nomic-embed-text",
     "input": "teste"
   }'
   ```

## Verificações Manuais

### 1. Verificar Ollama

```bash
# Testar API
curl http://localhost:11434/api/tags

# Gerar embedding de teste
curl http://localhost:11434/api/embed -d '{
  "model": "nomic-embed-text",
  "input": "teste de embedding"
}'
```

### 2. Verificar Qdrant

```bash
# Listar coleções
curl http://localhost:6333/collections

# Ver detalhes de uma coleção
curl http://localhost:6333/collections/tenant_<TENANT_ID>

# Buscar diretamente no Qdrant
curl -X POST http://localhost:6333/collections/tenant_<ID>/points/search \
  -H 'Content-Type: application/json' \
  -d '{
    "vector": [0.1, 0.2, ...],
    "limit": 5,
    "with_payload": true
  }'
```

### 3. Verificar PostgreSQL

```sql
-- Ver documentos indexados
SELECT id, name, status, created_at
FROM document_versions
ORDER BY created_at DESC
LIMIT 10;

-- Ver chunks criados
SELECT dv.name, COUNT(c.id) as chunks_count
FROM document_versions dv
LEFT JOIN document_chunks c ON c.document_version_id = dv.id
GROUP BY dv.name;
```

## Variáveis de Ambiente Importantes

```env
# Qdrant
QDRANT_URL=http://qdrant:6333

# Ollama
OLLAMA_URL=http://ollama:11434
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_PROVIDER=ollama

# Opcional: MiniMax (cloud)
# EMBEDDING_PROVIDER=minimax
# MINIMAX_API_KEY=your_key
# MINIMAX_GROUP_ID=your_group
```

## Melhorias Aplicadas

### QdrantRagAdapter.ts

1. **Método `search()`:**
   - ✅ Logs detalhados em cada etapa
   - ✅ Throw de erros ao invés de retornar array vazio
   - ✅ Mensagens de erro específicas (coleção não encontrada, erro de conexão, etc.)

2. **Método `generateOllamaEmbedding()`:**
   - ✅ Logs de progresso
   - ✅ Throw de erros ao invés de mock silencioso
   - ✅ Mensagens específicas para timeout e connection refused
   - ✅ Validação de resposta do Ollama

3. **Método `indexDocument()`:**
   - ✅ Logs de progresso
   - ✅ Propagação de erros

### RagPage.tsx

1. **Estado:**
   - ✅ Adiciona `searchError` state
   - ✅ Limpa resultados anteriores ao fazer nova busca

2. **Error Handling:**
   - ✅ Captura erros da API
   - ✅ Extrai mensagem de erro do backend
   - ✅ Logs no console do navegador

3. **UI:**
   - ✅ Caixa de erro vermelha
   - ✅ Diferencia "sem resultados" de "erro"
   - ✅ Mensagens amigáveis ao usuário

## Testando as Correções

1. **Teste sem Ollama:**
   ```bash
   docker stop <ollama-container>
   # Tente fazer upload -> deve falhar com mensagem clara
   ```

2. **Teste sem Qdrant:**
   ```bash
   docker stop <qdrant-container>
   # Tente buscar -> deve falhar com mensagem clara
   ```

3. **Teste com tudo rodando:**
   ```bash
   npm run test:rag  # Deve passar todos os checks
   # Faça upload de um documento
   # Faça uma busca -> deve retornar resultados
   ```

## Próximos Passos

Se o problema persistir após estas correções:

1. Compartilhe os logs do backend
2. Compartilhe os logs do console do navegador
3. Execute `npm run test:rag` e compartilhe o resultado
4. Verifique se o Docker está com recursos suficientes (RAM, CPU)
