/**
 * Agent - Agente especializado
 *
 * Baseado em: https://opencode.ai/docs/agents/
 */

export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: 'chat' | 'task' | 'code' | 'research' | 'support' | 'custom';
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[]; // IDs das tools disponíveis
  capabilities?: AgentCapability[];
  knowledge?: {
    useRag?: boolean;
    ragFilters?: Record<string, any>;
    externalSources?: string[];
  };
  behavior?: {
    proactive?: boolean;
    verbose?: boolean;
    requiresApproval?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface AgentContext {
  tenantId: string;
  userId?: string;
  chatId?: string;
  messageHistory?: any[];
  variables?: Record<string, any>;
}

export interface AgentResponse {
  content: string;
  toolCalls?: any[];
  metadata?: Record<string, any>;
  confidence?: number;
}

export abstract class Agent {
  abstract config: AgentConfig;

  /**
   * Processa uma mensagem do usuário
   */
  abstract processMessage(
    context: AgentContext,
    message: string
  ): Promise<AgentResponse>;

  /**
   * Inicializa o agente (carregar recursos, etc.)
   */
  async initialize(): Promise<void> {
    // Override se necessário
  }

  /**
   * Cleanup do agente
   */
  async cleanup(): Promise<void> {
    // Override se necessário
  }

  /**
   * Valida se o agente pode processar a mensagem
   */
  canProcess(message: string): boolean {
    // Override para adicionar lógica customizada
    return true;
  }

  /**
   * Retorna o system prompt completo (com contexto)
   */
  getSystemPrompt(context: AgentContext): string {
    let prompt = this.config.systemPrompt;

    // Adiciona informações de contexto
    if (context.tenantId) {
      prompt += `\n\nTenant ID: ${context.tenantId}`;
    }

    if (context.userId) {
      prompt += `\nUser ID: ${context.userId}`;
    }

    // Adiciona variáveis de contexto
    if (context.variables && Object.keys(context.variables).length > 0) {
      prompt += '\n\nContext Variables:';
      for (const [key, value] of Object.entries(context.variables)) {
        prompt += `\n- ${key}: ${JSON.stringify(value)}`;
      }
    }

    return prompt;
  }
}
