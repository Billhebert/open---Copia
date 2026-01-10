import { createOpencode } from "@opencode-ai/sdk";
import { OpencodeAdapterPort } from "../../application/ports/OpencodeAdapterPort.js";

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

export class OpencodeAdapter implements OpencodeAdapterPort {
  private opencode: any = null;
  private client: any = null;
  private sessionId: string | null = null;
  private initialized: boolean = false;
  private sdkPort: number;

  constructor() {
    this.sdkPort = parseInt(process.env.SDK_PORT || "4096", 10);
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    console.log(`🔄 Inicializando OpenCode SDK...`);
    console.log(`   Porta local: ${this.sdkPort}`);

    try {
      this.opencode = await createOpencode({
        hostname: "127.0.0.1",
        port: this.sdkPort,
        config: {
          model: "opencode/minimax-m2.1-free" as any,
        },
      });

      this.client = this.opencode.client;
      
      console.log(`✅ OpenCode SDK iniciado: ${this.opencode.server.url}`);

      const sessionRes = await this.client.session.create({
        body: { title: "Chat Session" }
      });
      this.sessionId = sessionRes?.data?.id ?? sessionRes?.id;
      
      if (this.sessionId) {
        console.log(`🧩 Session criada: ${this.sessionId}`);
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.warn(`⚠️ OpenCode SDK falhou: ${error}`);
      console.log(`   Usando modo simulado`);
      this.initialized = true;
      return true;
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
    if (!this.client || !this.sessionId) {
      return {
        content: getMockResponse(params.prompt),
        reasoning: undefined,
        modelId: "mock",
        providerId: "mock",
        tokens: 10,
        cost: 0,
      };
    }

    if (params.systemPrompt) {
      console.log(`[OpenCode] System prompt: ${params.systemPrompt.substring(0, 50)}...`);
    }

    console.log(`[OpenCode] Gerando resposta para: "${params.prompt.substring(0, 50)}..."`);

    // Lista de modelos para tentar em ordem
    const modelsToTry = [
      { providerID: "opencode", modelID: "minimax-m2.1-free", displayName: "MiniMax M2.1 Free" },
      { providerID: "openai", modelID: "gpt-5-nano", displayName: "GPT-5 Nano" },
    ];

    // Tenta cada modelo em sequência
    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const isLastModel = i === modelsToTry.length - 1;

      try {
        console.log(`[OpenCode] Tentando modelo: ${model.displayName}...`);

        // Adiciona timeout de 30 segundos usando Promise.race
        const promptPromise = this.client.session.prompt({
          path: { id: this.sessionId! },
          body: {
            parts: [{ type: "text", text: params.prompt }],
            model: {
              providerID: model.providerID,
              modelID: model.modelID
            },
          }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 30000)
        );

        const response = await Promise.race([promptPromise, timeoutPromise]);

        const content = response?.data?.parts?.find((p: any) => p.type === "text")?.text
          ?? response?.data?.text
          ?? JSON.stringify(response?.data ?? response, null, 2);

        console.log(`[OpenCode] ✅ Resposta gerada com ${model.displayName} (${content.length} chars)`);

        return {
          content,
          reasoning: response?.data?.reasoning,
          modelId: `${model.providerID}/${model.modelID}`,
          providerId: model.providerID,
          tokens: content.length,
          cost: 0,
        };
      } catch (error: any) {
        console.warn(`[OpenCode] ❌ Falha com ${model.displayName}: ${error.message || error}`);

        // Se não for o último modelo, tenta o próximo
        if (!isLastModel) {
          console.log(`[OpenCode] 🔄 Tentando próximo modelo...`);
          continue;
        }

        // Se for o último modelo, tenta Ollama como último recurso
        console.warn(`[OpenCode] ⚠️  Todos os modelos falharam, tentando Ollama...`);
        try {
          const ollamaResponse = await this.generateResponseWithOllama(params.prompt, params.systemPrompt);
          return ollamaResponse;
        } catch (ollamaError) {
          console.error(`[OpenCode] ❌ Ollama também falhou: ${ollamaError}`);
          throw new Error('Todos os modelos falharam, incluindo Ollama');
        }
      }
    }

    // Fallback caso o loop não retorne (não deveria acontecer)
    console.warn(`[OpenCode] ⚠️  Tentando Ollama como último recurso...`);
    try {
      return await this.generateResponseWithOllama(params.prompt, params.systemPrompt);
    } catch (error) {
      console.error(`[OpenCode] ❌ Ollama falhou: ${error}`);
      throw new Error('Todos os modelos falharam, incluindo Ollama');
    }
  }

  private async generateResponseWithOllama(
    prompt: string,
    systemPrompt?: string
  ): Promise<{
    content: string;
    reasoning?: string;
    modelId: string;
    providerId: string;
    tokens: number;
    cost: number;
  }> {
    const isWindows = process.platform === "win32";
    const ollamaUrl = process.env.OLLAMA_URL || (isWindows ? "http://host.docker.internal:11434" : "http://localhost:11434");
    const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";

    console.log(`[Ollama] Gerando resposta com modelo ${ollamaModel}...`);

    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:` : prompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000), // 60 segundos para geração de texto
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error ${response.status}: ${errorText}`);
      }

      const data: any = await response.json();
      const content = data.response || "";

      if (!content) {
        throw new Error("Ollama retornou resposta vazia");
      }

      console.log(`[Ollama] ✅ Resposta gerada (${content.length} chars)`);

      return {
        content,
        reasoning: undefined,
        modelId: `ollama/${ollamaModel}`,
        providerId: "ollama",
        tokens: content.length,
        cost: 0,
      };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error(`Timeout ao gerar resposta com Ollama (>60s)`);
      }

      if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        throw new Error(`Não foi possível conectar ao Ollama em ${ollamaUrl}`);
      }

      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const isWindows = process.platform === "win32";
    const ollamaUrl = process.env.OLLAMA_URL || (isWindows ? "http://host.docker.internal:11434" : "http://localhost:11434");
    
    try {
      const response = await fetch(`${ollamaUrl}/api/embed`, {
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
    return this.opencode?.server?.url || null;
  }

  isReady(): boolean {
    return this.initialized;
  }

  async shutdown(): Promise<void> {
    if (this.opencode) {
      try {
        await this.opencode.server.close();
        console.log(`🛑 OpenCode SDK encerrado`);
      } catch (error) {
        console.warn(`Erro ao encerrar OpenCode SDK: ${error}`);
      }
    }
  }
}
