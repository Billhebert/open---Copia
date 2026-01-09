# 🤖 Agentes Especializados

Agentes são assistentes de IA especializados em tarefas específicas, cada um com seu próprio conhecimento, personalidade e capacidades.

Baseado em: https://opencode.ai/docs/agents/

## 📖 Conceito

Agentes são como membros especializados de uma equipe:
- Cada agente tem uma **especialidade**
- Têm **personalidade** e estilo de comunicação próprios
- Podem usar **tools** específicas
- Acessam **RAG** com filtros personalizados
- Mantêm **contexto** da conversa

## 🎯 Agentes Disponíveis

### 1. **Support Agent** (`support_agent`)

Especializado em suporte ao cliente.

**Características:**
- 🎯 Tipo: `support`
- 🧠 Modelo: `minimax-m2.1-free`
- 🛠️ Tools: `search_documents`, `search_web`
- 📚 RAG: Filtrado por tags `[support, documentation, faq]`
- 🎭 Comportamento: Proativo, educado, eficiente

**Capacidades:**
- Responder perguntas sobre produtos/serviços
- Resolver problemas técnicos
- Buscar em documentação
- Criar tickets para humanos

**Exemplo de uso:**
```bash
Usuário: "Como eu configuro minha conta?"
Support Agent: *busca em documentos* "Para configurar sua conta..."
```

### 2. **Code Agent** (`code_agent`)

Especializado em programação e desenvolvimento.

**Características:**
- 🎯 Tipo: `code`
- 🧠 Modelo: `qwen3-coder`
- 🛠️ Tools: `search_web`, `search_documents`
- 📚 RAG: Filtrado por tags `[code, documentation, api]`
- 🎭 Comportamento: Técnico, preciso, verboso

**Capacidades:**
- Escrever código em múltiplas linguagens
- Revisar e melhorar código
- Debugar problemas
- Explicar conceitos técnicos
- Sugerir best practices

**Exemplo de uso:**
```bash
Usuário: "Como faço um POST request em JavaScript?"
Code Agent: "Aqui está um exemplo usando fetch()..."
```

## 🛠️ Criando um Agente Customizado

### Passo 1: Criar a classe do Agente

```typescript
// src/infrastructure/agents/SalesAgent.ts
import { Agent, AgentConfig, AgentContext, AgentResponse } from '../../domain/agents/Agent.js';
import { OpencodeAdapterPort } from '../../application/ports/OpencodeAdapterPort.js';

export class SalesAgent extends Agent {
  config: AgentConfig = {
    id: 'sales_agent',
    name: 'Sales Agent',
    description: 'AI agent specialized in sales and lead qualification',
    type: 'custom',
    systemPrompt: `You are a professional sales agent. Your goal is to:
- Understand customer needs
- Present relevant solutions
- Answer questions about products and pricing
- Qualify leads
- Be persuasive but not pushy`,
    model: 'opencode/minimax-m2.1-free',
    temperature: 0.8,
    maxTokens: 1024,
    tools: ['search_documents', 'calculate_price'],
    capabilities: [
      {
        name: 'lead_qualification',
        description: 'Can qualify leads based on criteria',
        enabled: true,
      },
      {
        name: 'product_recommendation',
        description: 'Can recommend products based on needs',
        enabled: true,
      },
    ],
    knowledge: {
      useRag: true,
      ragFilters: {
        tags: ['products', 'pricing', 'sales'],
      },
    },
    behavior: {
      proactive: true,
      verbose: false,
      requiresApproval: false,
    },
  };

  constructor(private opencodeAdapter: OpencodeAdapterPort) {
    super();
  }

  async processMessage(
    context: AgentContext,
    message: string
  ): Promise<AgentResponse> {
    // Sua lógica de processamento
    const systemPrompt = this.getSystemPrompt(context);

    const response = await this.opencodeAdapter.chat({
      model: this.config.model!,
      messages: [
        { role: 'system', content: systemPrompt },
        ...context.messageHistory || [],
        { role: 'user', content: message },
      ],
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    return {
      content: response.content,
      metadata: {
        agentId: this.config.id,
        model: this.config.model,
      },
    };
  }

  // Opcional: customizar quando o agente deve processar
  canProcess(message: string): boolean {
    const salesKeywords = ['buy', 'purchase', 'price', 'demo', 'trial'];
    return salesKeywords.some(k => message.toLowerCase().includes(k));
  }
}
```

### Passo 2: Registrar o Agente

```typescript
// src/infrastructure/agents/AgentRegistry.ts
import { SalesAgent } from './SalesAgent.js';

private registerDefaultAgents() {
  // ... outros agentes
  this.register(new SalesAgent(this.opencodeAdapter));
}
```

### Passo 3: Usar o Agente

```typescript
// O sistema automaticamente selecionará o agente baseado em canProcess()
const agent = agentRegistry.selectAgentForMessage("I want to buy the premium plan");
const response = await agent.processMessage(context, message);
```

## ⚙️ Configuração do Agente

### System Prompt

O prompt define a personalidade e comportamento do agente:

```typescript
systemPrompt: `You are a helpful assistant specialized in X.

Your personality:
- Professional and friendly
- Patient and clear
- Detail-oriented

Your goals:
- Goal 1
- Goal 2

Guidelines:
- Always do X
- Never do Y
- When Z happens, do W`
```

### Modelo

Escolha o modelo baseado na tarefa:

- **minimax-m2.1-free**: Geral, conversação
- **qwen3-coder**: Código, técnico
- **claude-opus-4-1**: Raciocínio complexo
- **gpt-5**: Multimodal

### Temperature

- **0.0-0.3**: Preciso, determinístico (código, fatos)
- **0.4-0.7**: Balanceado (geral)
- **0.8-1.0**: Criativo, variado (brainstorming, marketing)

### Tools

Liste as tools que o agente pode usar:

```typescript
tools: ['search_documents', 'search_web', 'custom_tool']
```

### Conhecimento (RAG)

Configure o acesso a documentos:

```typescript
knowledge: {
  useRag: true,
  ragFilters: {
    tags: ['relevant', 'tags'],
    departments: ['sales'],
    documentIds: ['specific-doc-id'],
  },
}
```

## 🎭 Tipos de Agentes

| Tipo | Descrição | Exemplos |
|------|-----------|----------|
| `chat` | Conversação geral | Assistente pessoal |
| `task` | Executa tarefas específicas | Agendador, automação |
| `code` | Programação | Code review, debug |
| `research` | Pesquisa e análise | Pesquisa de mercado |
| `support` | Suporte ao cliente | FAQ, troubleshooting |
| `custom` | Personalizado | Qualquer outro |

## 🔄 Seleção Automática de Agentes

O `AgentRegistry` pode selecionar o melhor agente automaticamente:

```typescript
// Baseado em canProcess()
const agent = agentRegistry.selectAgentForMessage("Help me with Python");
// Retorna: CodeAgent (detecta linguagem de programação)

const agent = agentRegistry.selectAgentForMessage("I need help with billing");
// Retorna: SupportAgent (detecta keywords de suporte)
```

## 📊 Comportamentos

### Proativo
```typescript
behavior: { proactive: true }
```
- Faz perguntas de esclarecimento
- Oferece ajuda adicional
- Sugere próximos passos

### Verbose
```typescript
behavior: { verbose: true }
```
- Explicações detalhadas
- Mostra pensamento
- Contexto adicional

### Requires Approval
```typescript
behavior: { requiresApproval: true }
```
- Pede confirmação antes de ações importantes
- Mostra preview de mudanças
- Segurança extra

## 🔒 Isolamento por Tenant

Agentes respeitam o isolamento de tenant:
- Acesso apenas a documentos do tenant
- Tools filtradas por tenant
- Variáveis de contexto isoladas

## 🎓 Melhores Práticas

1. **System Prompt claro**: Seja específico sobre o comportamento esperado
2. **Escolha o modelo certo**: Cada modelo tem pontos fortes
3. **Use RAG**: Mantenha conhecimento atualizado sem retreinar
4. **Teste canProcess()**: Garanta seleção correta do agente
5. **Monitore temperatura**: Ajuste para a tarefa
6. **Limite maxTokens**: Evite respostas muito longas
7. **Adicione capabilities**: Documente o que o agente pode fazer

## 🔗 Ver também

- [Custom Tools](./CUSTOM_TOOLS.md)
- [Skills](./SKILLS.md)
- [RAG](./RAG.md)
