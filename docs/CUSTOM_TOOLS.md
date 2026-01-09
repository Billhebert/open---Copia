# 🔧 Custom Tools

Custom Tools permitem que você estenda as capacidades dos agentes de IA com funcionalidades específicas.

Baseado em: https://opencode.ai/docs/custom-tools

## 📖 Conceito

Tools são funções que os agentes podem chamar para executar ações específicas, como:
- Buscar informações em APIs externas
- Executar cálculos complexos
- Acessar bancos de dados
- Integrar com serviços externos
- Processar dados

## 🎯 Tools Disponíveis

### 1. **Search Web** (`search_web`)

Busca informações na web usando DuckDuckGo.

**Parâmetros:**
- `query` (string, obrigatório): Query de busca
- `max_results` (number, opcional): Máximo de resultados (padrão: 5)

**Exemplo de uso:**
```typescript
{
  query: "latest AI news",
  max_results: 5
}
```

### 2. **Search Documents** (`search_documents`)

Busca em documentos RAG do tenant.

**Parâmetros:**
- `query` (string, obrigatório): Query de busca
- `limit` (number, opcional): Máximo de resultados (padrão: 5)
- `min_score` (number, opcional): Score mínimo (padrão: 0.5)

**Exemplo de uso:**
```typescript
{
  query: "pricing policy",
  limit: 3,
  min_score: 0.7
}
```

## 🛠️ Criando uma Custom Tool

### Passo 1: Criar a classe da Tool

```typescript
// src/infrastructure/tools/MyCustomTool.ts
import { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../../domain/tools/Tool.js';

export class MyCustomTool extends Tool {
  definition: ToolDefinition = {
    id: 'my_custom_tool',
    name: 'My Custom Tool',
    description: 'Does something useful',
    parameters: [
      {
        name: 'param1',
        type: 'string',
        description: 'First parameter',
        required: true,
      },
    ],
    requiresApproval: false,
    category: 'utility',
    tags: ['custom'],
  };

  async execute(
    context: ToolExecutionContext,
    parameters: Record<string, any>
  ): Promise<ToolExecutionResult> {
    // Validação automática
    const validation = this.validateParameters(parameters);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    try {
      // Sua lógica aqui
      const result = await this.doSomething(parameters.param1);

      return {
        success: true,
        data: result,
        metadata: {
          executedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async doSomething(param: string): Promise<any> {
    // Implementação
    return { result: 'done' };
  }
}
```

### Passo 2: Registrar a Tool

```typescript
// src/infrastructure/tools/ToolRegistry.ts
import { MyCustomTool } from './MyCustomTool.js';

private registerDefaultTools() {
  // ... outras tools
  this.register(new MyCustomTool());
}
```

### Passo 3: Usar a Tool

A tool estará automaticamente disponível para todos os agentes que a incluírem em `config.tools`.

## 📝 Tipos de Parâmetros

```typescript
{
  name: 'string_param',
  type: 'string',
  description: 'A string parameter',
  required: true,
}

{
  name: 'number_param',
  type: 'number',
  description: 'A number parameter',
  required: false,
  default: 10,
}

{
  name: 'boolean_param',
  type: 'boolean',
  description: 'A boolean parameter',
}

{
  name: 'enum_param',
  type: 'string',
  description: 'Choose one option',
  enum: ['option1', 'option2', 'option3'],
}

{
  name: 'object_param',
  type: 'object',
  description: 'An object parameter',
  properties: {
    field1: { type: 'string', description: 'Field 1' },
    field2: { type: 'number', description: 'Field 2' },
  },
}

{
  name: 'array_param',
  type: 'array',
  description: 'An array parameter',
  items: { type: 'string', description: 'Array items' },
}
```

## 🔒 Isolamento por Tenant

Tools têm acesso ao `tenantId` e `userId` no contexto, permitindo:

- ✅ Filtrar dados por tenant
- ✅ Aplicar permissões específicas
- ✅ Registrar auditoria
- ✅ Isolar recursos

**Exemplo:**

```typescript
async execute(context: ToolExecutionContext, parameters: Record<string, any>) {
  // Sempre filtra por tenant
  const data = await this.database.find({
    tenantId: context.tenantId,
    ...parameters,
  });

  return { success: true, data };
}
```

## 🚦 Aprovação de Tools

Para tools que executam ações críticas, use `requiresApproval: true`:

```typescript
definition: ToolDefinition = {
  id: 'delete_data',
  name: 'Delete Data',
  description: 'Deletes data permanently',
  requiresApproval: true, // ⚠️ Requer aprovação do usuário
  // ...
};
```

## 📊 Categorias Sugeridas

- `web`: Acesso à internet
- `knowledge`: Busca em documentos/RAG
- `database`: Acesso a dados
- `api`: Integrações externas
- `utility`: Utilidades gerais
- `file`: Operações com arquivos
- `analytics`: Análise de dados

## 🎓 Melhores Práticas

1. **Sempre valide parâmetros** usando `validateParameters()`
2. **Trate erros** e retorne mensagens claras
3. **Documente bem** a descrição e parâmetros
4. **Use categorias** e tags para organização
5. **Considere segurança** e permissões
6. **Registre auditoria** para ações importantes
7. **Teste isoladamente** antes de registrar

## 🔗 Ver também

- [Agentes](./AGENTS.md)
- [Skills](./SKILLS.md)
- [RAG](./RAG.md)
