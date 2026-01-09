import { OpencodeAdapterPort } from "../../application/ports/OpencodeAdapterPort.js";

const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "anthropic/claude-3.5-haiku:free",
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistral/mistral-small-3.1-24b:free",
];

function getMockResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes("oi") || lowerPrompt.includes("olá") || lowerPrompt.includes("hello")) {
    return "Olá! Como posso ajudar você hoje?";
  }
  if (lowerPrompt.includes("tchau") || lowerPrompt.includes("bye")) {
    return "Até mais! Foi um prazer ajudar.";
  }
  if (lowerPrompt.includes("obrigado") || lowerPrompt.includes("thanks")) {
    return "De nada! Estou aqui para ajudar.";
  }
  if (lowerPrompt.includes("como você está") || lowerPrompt.includes("como voce esta")) {
    return "Estou funcionando bem! E você, como posso ajudar?";
  }
  if (lowerPrompt.includes("nome")) {
    return "Sou um assistente de IA. Posso responder perguntas, ajudar com código, explicar conceitos, e muito mais!";
  }
  if (lowerPrompt.includes("?")) {
    return "Ótima pergunta! Posso ajudar. O que você gostaria de saber exatamente?";
  }
  
  const responses = [
    "Entendi! Como posso ajudar com isso?",
    "Interessante! Pode me contar mais?",
    "Claro, vou ajudar você com isso.",
    "Recebi sua mensagem. Em que posso ser útil?",
    "Ok! Vamos trabalhar nisso.",
    "Perfeito! Qual é o próximo passo?",
    "Certo! Posso ajudar de várias formas.",
    "Ótimo! Me diga mais sobre o que precisa.",
  ];
  
  return responses[prompt.length % responses.length];
}

export class OpenRouterAdapter implements OpencodeAdapterPort {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";
  private defaultModel = "meta-llama/llama-3.3-70b-instruct:free";
  private fallbackModels = FREE_MODELS;
  private currentModelIndex = 0;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || "";
    if (this.apiKey) {
      console.log("[OpenRouter] ✅ API key encontrada");
    } else {
      console.log("[OpenRouter] ⚠️ Sem API key, usando respostas simuladas");
    }
  }

  async generateResponse(params: {
    modelId?: string;
    prompt: string;
    systemPrompt?: string;
    sessionId?: string;
    chatId?: string;
    useRag?: boolean;
  }): Promise<{
    content: string;
    reasoning?: string;
    modelId: string;
    providerId: string;
    tokens: number;
    cost: number;
  }> {
    let modelId = params.modelId || this.defaultModel;
    
    if (!this.apiKey) {
      return {
        content: getMockResponse(params.prompt),
        reasoning: undefined,
        modelId: "mock",
        providerId: "mock",
        tokens: 10,
        cost: 0,
      };
    }

    const modelsToTry = [modelId, ...this.fallbackModels];
    
    for (const tryModel of modelsToTry) {
      try {
        const result = await this.callModel(tryModel, params);
        if (result) return result;
      } catch (error) {
        console.warn(`[OpenRouter] Modelo ${tryModel} falhou, tentando próximo...`);
        continue;
      }
    }

    return {
      content: getMockResponse(params.prompt),
      reasoning: undefined,
      modelId: "fallback",
      providerId: "mock",
      tokens: 10,
      cost: 0,
    };
  }

  private async callModel(modelId: string, params: any): Promise<{
    content: string;
    reasoning?: string;
    modelId: string;
    providerId: string;
    tokens: number;
    cost: number;
  } | null> {
    const messages: any[] = [];

    if (params.systemPrompt) {
      messages.push({ role: "system", content: params.systemPrompt });
    }
    
    messages.push({ role: "user", content: params.prompt });

    try {
      console.log(`[OpenRouter] Tentando modelo: ${modelId}`);

      const response = await fetch(this.baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "OpenCode Chat Platform",
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[OpenRouter] Erro ${response.status}: ${errorText.substring(0, 100)}`);
        return null;
      }

      const data: any = await response.json();
      const message = data.choices?.[0]?.message;
      
      if (!message?.content) {
        console.warn(`[OpenRouter] Resposta vazia do modelo ${modelId}`);
        return null;
      }

      console.log(`[OpenRouter] ✅ Sucesso com ${modelId} (${data.usage?.total_tokens || 0} tokens)`);

      return {
        content: message.content,
        reasoning: message.reasoning_content,
        modelId,
        providerId: modelId.split("/")[0],
        tokens: data.usage?.total_tokens || message.content.length,
        cost: 0,
      };
    } catch (error) {
      console.warn(`[OpenRouter] Falha em ${modelId}: ${error}`);
      return null;
    }
  }

  getUrl(): string | null {
    return this.apiKey ? this.baseUrl : null;
  }

  isReady(): boolean {
    return !!this.apiKey;
  }

  async shutdown(): Promise<void> {}
}

export class OpencodeAdapter implements OpencodeAdapterPort {
  private openRouterAdapter: OpenRouterAdapter;
  private ollamaEmbeddingUrl: string;
  private initialized: boolean = false;

  constructor() {
    this.openRouterAdapter = new OpenRouterAdapter();
    this.ollamaEmbeddingUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    console.log(`🔄 Inicializando OpenCode Adapter...`);
    console.log(`   OpenRouter: ✅ Ativado`);
    console.log(`   Ollama (embeddings): ${this.ollamaEmbeddingUrl}`);
    
    this.initialized = true;
    return true;
  }

  async generateResponse(params: {
    modelId?: string;
    prompt: string;
    systemPrompt?: string;
    sessionId?: string;
    chatId?: string;
    useRag?: boolean;
  }): Promise<{
    content: string;
    reasoning?: string;
    modelId: string;
    providerId: string;
    tokens: number;
    cost: number;
  }> {
    return this.openRouterAdapter.generateResponse(params);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.ollamaEmbeddingUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "nomic-embed-text",
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding error: ${response.status}`);
      }

      const data: any = await response.json();
      return data.embedding || data.embeddings?.[0] || [];
    } catch (error) {
      console.warn(`[Ollama] Embedding failed: ${error}, using mock`);
      return Array(768).fill(0).map((_, i) => Math.sin(i + text.length) * 0.5);
    }
  }

  getUrl(): string | null {
    return this.openRouterAdapter.getUrl();
  }

  isReady(): boolean {
    return this.initialized;
  }

  async shutdown(): Promise<void> {
    await this.openRouterAdapter.shutdown();
  }
}
