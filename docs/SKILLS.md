# 🎯 Skills

Skills são habilidades reutilizáveis que podem ser compostas para criar funcionalidades complexas.

Baseado em: https://opencode.ai/docs/skills/

## 📖 Conceito

Skills são como "building blocks" que:
- Executam **uma tarefa específica** muito bem
- São **reutilizáveis** em diferentes contextos
- Podem ser **compostas** para criar workflows complexos
- São **independentes** de agentes
- Têm **interface padronizada**

## 🎯 Skills Disponíveis

### 1. **Summarize** (`summarize`)

Resume textos longos em resumos concisos.

**Parâmetros:**
- `text` (string, obrigatório): Texto para resumir
- `length` (string, opcional): short | medium | long
- `style` (string, opcional): bullet_points | paragraph | key_points

**Exemplo:**
```typescript
{
  text: "Long article...",
  length: "short",
  style: "bullet_points"
}
```

**Resultado:**
```json
{
  "success": true,
  "data": {
    "summary": "• Point 1\n• Point 2\n• Point 3",
    "originalLength": 5000,
    "summaryLength": 150,
    "compressionRatio": "3.00%"
  }
}
```

### 2. **Translate** (`translate`)

Traduz textos entre idiomas.

**Parâmetros:**
- `text` (string, obrigatório): Texto para traduzir
- `target_language` (string, obrigatório): Idioma de destino
- `source_language` (string, opcional): Idioma de origem (auto-detect)
- `formal` (boolean, opcional): Usar linguagem formal

**Exemplo:**
```typescript
{
  text: "Hello, how are you?",
  target_language: "Portuguese",
  formal: true
}
```

**Resultado:**
```json
{
  "success": true,
  "data": {
    "translation": "Olá, como está?",
    "sourceLanguage": "English",
    "targetLanguage": "Portuguese"
  }
}
```

## 🛠️ Criando uma Custom Skill

### Passo 1: Criar a classe da Skill

```typescript
// src/infrastructure/skills/SentimentAnalysisSkill.ts
import { Skill, SkillConfig, SkillContext, SkillResult } from '../../domain/skills/Skill.js';
import { OpencodeAdapterPort } from '../../application/ports/OpencodeAdapterPort.js';

export class SentimentAnalysisSkill extends Skill {
  config: SkillConfig = {
    id: 'sentiment_analysis',
    name: 'Sentiment Analysis',
    description: 'Analyzes the sentiment of text (positive, negative, neutral)',
    category: 'text_processing',
    tags: ['nlp', 'sentiment', 'analysis'],
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'Text to analyze',
        required: true,
      },
      {
        name: 'detailed',
        type: 'boolean',
        description: 'Return detailed sentiment scores',
        required: false,
        default: false,
      },
    ],
    examples: [
      'Analyze the sentiment of this review',
      'Is this comment positive or negative?',
      'What\'s the tone of this message?',
    ],
    relatedSkills: ['summarize', 'extract_keywords'],
  };

  constructor(private opencodeAdapter: OpencodeAdapterPort) {
    super();
  }

  async execute(
    context: SkillContext,
    parameters: Record<string, any>
  ): Promise<SkillResult> {
    const validation = this.validateParameters(parameters);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    try {
      const text = parameters.text as string;
      const detailed = parameters.detailed as boolean || false;

      const prompt = detailed
        ? `Analyze the sentiment of the following text. Provide sentiment (positive/negative/neutral) and confidence scores for each.

Text: ${text}

Analysis:`
        : `What is the sentiment of this text? Answer with only: positive, negative, or neutral.

Text: ${text}

Sentiment:`;

      const response = await this.opencodeAdapter.chat({
        model: 'opencode/minimax-m2.1-free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 200,
      });

      return {
        success: true,
        data: {
          text,
          sentiment: response.content.trim().toLowerCase(),
          detailed: detailed ? response.content : undefined,
        },
        metadata: {
          model: 'opencode/minimax-m2.1-free',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
```

### Passo 2: Registrar a Skill

```typescript
// src/infrastructure/skills/SkillRegistry.ts
import { SentimentAnalysisSkill } from './SentimentAnalysisSkill.js';

private registerDefaultSkills() {
  // ... outras skills
  this.register(new SentimentAnalysisSkill(this.opencodeAdapter));
}
```

### Passo 3: Usar a Skill

```typescript
const skill = skillRegistry.get('sentiment_analysis');
const result = await skill.execute(context, {
  text: "I love this product!",
  detailed: true,
});

console.log(result.data.sentiment); // "positive"
```

## 🔗 Composição de Skills

Skills podem ser compostas para criar workflows:

```typescript
// Workflow: Traduzir e resumir um documento
async function translateAndSummarize(text: string) {
  // 1. Traduzir
  const translateSkill = skillRegistry.get('translate');
  const translated = await translateSkill.execute(context, {
    text,
    target_language: 'English',
  });

  // 2. Resumir
  const summarizeSkill = skillRegistry.get('summarize');
  const summary = await summarizeSkill.execute(context, {
    text: translated.data.translation,
    length: 'short',
    style: 'bullet_points',
  });

  return summary.data.summary;
}
```

## 📝 Tipos de Skills

### Processamento de Texto
- `summarize`: Resumir textos
- `translate`: Traduzir idiomas
- `sentiment_analysis`: Análise de sentimento
- `extract_keywords`: Extrair palavras-chave
- `grammar_check`: Verificar gramática

### Análise de Dados
- `calculate`: Cálculos matemáticos
- `statistics`: Estatísticas de dados
- `chart_generation`: Gerar gráficos
- `data_validation`: Validar dados

### Comunicação
- `email_compose`: Compor emails
- `meeting_notes`: Notas de reunião
- `chat_response`: Respostas automáticas

### Conhecimento
- `fact_check`: Verificar fatos
- `research`: Pesquisar informações
- `citation`: Gerar citações

## 📊 Categorias Sugeridas

- `text_processing`: Processamento de texto
- `analysis`: Análise de dados
- `communication`: Comunicação
- `knowledge`: Conhecimento
- `automation`: Automação
- `integration`: Integrações

## 🎓 Melhores Práticas

1. **Uma responsabilidade**: Cada skill faz uma coisa bem
2. **Interface clara**: Parâmetros bem documentados
3. **Validação rigorosa**: Valide todos os inputs
4. **Erros claros**: Mensagens de erro descritivas
5. **Exemplos úteis**: Mostre casos de uso reais
6. **Relacionamentos**: Indique skills relacionadas
7. **Idempotente**: Mesmos inputs = mesmos outputs
8. **Rápido**: Skills devem ser eficientes

## 🔒 Isolamento por Tenant

Skills têm acesso ao contexto do tenant:

```typescript
async execute(context: SkillContext, parameters: Record<string, any>) {
  // Acessa dados do tenant
  const tenantData = await this.getTenantData(context.tenantId);

  // Usa variáveis de contexto
  const customSetting = context.variables?.customSetting;

  // ...
}
```

## 📈 Monitoramento

Recomenda-se monitorar:
- Taxa de sucesso/falha
- Tempo de execução
- Uso por tenant
- Parâmetros mais comuns

## 🔄 Skills vs Tools

| Aspecto | Skills | Tools |
|---------|--------|-------|
| **Uso** | Composição de workflows | Agentes chamam diretamente |
| **Complexidade** | Simples, focada | Pode ser complexa |
| **Contexto** | Sem contexto de conversa | Com contexto de mensagens |
| **Aprovação** | Não requer | Pode requerer |
| **Formato** | Estruturado | Flexível |

## 🎯 Quando usar Skills

Use skills quando:
- ✅ A tarefa é bem definida e específica
- ✅ Precisa ser reutilizada em múltiplos lugares
- ✅ Não depende do contexto da conversa
- ✅ Pode ser testada isoladamente
- ✅ Faz parte de um workflow maior

Use tools quando:
- ❌ Precisa do contexto completo da conversa
- ❌ É específica de um agente
- ❌ Requer aprovação do usuário
- ❌ Integra com sistemas externos complexos

## 🔗 Ver também

- [Custom Tools](./CUSTOM_TOOLS.md)
- [Agentes](./AGENTS.md)
- [RAG](./RAG.md)
