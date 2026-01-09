import { Agent, AgentConfig, AgentContext, AgentResponse } from '../../domain/agents/Agent.js';
import { OpencodeAdapterPort } from '../../application/ports/OpencodeAdapterPort.js';
import { RagPort } from '../../application/ports/RagPort.js';

/**
 * SupportAgent - Agente de suporte ao cliente
 */
export class SupportAgent extends Agent {
  config: AgentConfig = {
    id: 'support_agent',
    name: 'Support Agent',
    description: 'AI agent specialized in customer support. Can answer questions, resolve issues, and escalate to human support when needed.',
    type: 'support',
    systemPrompt: `You are a helpful customer support agent. Your goal is to assist users with their questions and problems in a friendly and efficient manner.

Guidelines:
- Always be polite and professional
- Ask clarifying questions if needed
- Search the knowledge base before answering
- If you cannot help, offer to escalate to a human agent
- Provide step-by-step instructions when solving problems
- Follow up to ensure the issue is resolved`,
    model: 'opencode/minimax-m2.1-free',
    temperature: 0.7,
    maxTokens: 1024,
    tools: ['search_documents', 'search_web'],
    capabilities: [
      {
        name: 'knowledge_base_search',
        description: 'Can search through company documentation and FAQs',
        enabled: true,
      },
      {
        name: 'ticket_creation',
        description: 'Can create support tickets for human agents',
        enabled: true,
      },
    ],
    knowledge: {
      useRag: true,
      ragFilters: {
        tags: ['support', 'documentation', 'faq'],
      },
    },
    behavior: {
      proactive: true,
      verbose: false,
      requiresApproval: false,
    },
  };

  constructor(
    private opencodeAdapter: OpencodeAdapterPort,
    private ragPort: RagPort
  ) {
    super();
  }

  async processMessage(
    context: AgentContext,
    message: string
  ): Promise<AgentResponse> {
    try {
      // 1. Busca no RAG se habilitado
      let ragContext = '';
      if (this.config.knowledge?.useRag) {
        const ragResults = await this.ragPort.search(context.tenantId, {
          text: message,
          limit: 3,
          minScore: 0.6,
          filters: this.config.knowledge.ragFilters,
          accessScope: {
            department: context.variables?.department as string | undefined,
            subdepartment: context.variables?.subdepartment as string | undefined,
            tags: (context.variables?.tags as string[]) || [],
            roles: (context.variables?.roles as string[]) || [],
          },
        });

        if (ragResults.length > 0) {
          ragContext = '\n\nRelevant documentation:\n';
          ragContext += ragResults.map((r, i) => `${i + 1}. ${r.text}`).join('\n');
        }
      }

      // 2. Monta o prompt completo
      const systemPrompt = this.getSystemPrompt(context);
      const fullMessage = message + ragContext;

      // 3. Chama o modelo AI
      const response = await this.opencodeAdapter.generateResponse({
        modelId: this.config.model,
        systemPrompt,
        prompt: fullMessage,
        chatId: context.chatId,
      });

      return {
        content: response.content,
        metadata: {
          model: this.config.model,
          ragResultsCount: ragContext ? 3 : 0,
          agentId: this.config.id,
        },
      };
    } catch (error) {
      return {
        content: 'I apologize, but I encountered an error processing your request. Please try again or contact a human support agent.',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
