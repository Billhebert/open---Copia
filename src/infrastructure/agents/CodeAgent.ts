import { Agent, AgentConfig, AgentContext, AgentResponse } from '../../domain/agents/Agent.js';
import { OpencodeAdapterPort } from '../../application/ports/OpencodeAdapterPort.js';

/**
 * CodeAgent - Agente especializado em código
 */
export class CodeAgent extends Agent {
  config: AgentConfig = {
    id: 'code_agent',
    name: 'Code Agent',
    description: 'AI agent specialized in programming and software development. Can write code, debug issues, explain concepts, and provide best practices.',
    type: 'code',
    systemPrompt: `You are an expert software engineer and programming assistant. Your goal is to help developers write better code and solve technical problems.

Guidelines:
- Write clean, efficient, and well-documented code
- Follow best practices and design patterns
- Explain complex concepts in simple terms
- Provide multiple solutions when applicable
- Consider edge cases and error handling
- Suggest optimizations and improvements
- Use appropriate code formatting and syntax highlighting`,
    model: 'opencode/qwen3-coder',
    temperature: 0.3, // Mais baixo para código mais preciso
    maxTokens: 2048,
    tools: ['search_web', 'search_documents'],
    capabilities: [
      {
        name: 'code_generation',
        description: 'Can generate code in multiple programming languages',
        enabled: true,
      },
      {
        name: 'code_review',
        description: 'Can review and suggest improvements to existing code',
        enabled: true,
      },
      {
        name: 'debugging',
        description: 'Can help identify and fix bugs',
        enabled: true,
      },
      {
        name: 'explanation',
        description: 'Can explain code and technical concepts',
        enabled: true,
      },
    ],
    knowledge: {
      useRag: true,
      ragFilters: {
        tags: ['code', 'documentation', 'api'],
      },
    },
    behavior: {
      proactive: false,
      verbose: true,
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
    try {
      const systemPrompt = this.getSystemPrompt(context);

      // Adiciona instruções específicas para código
      const enhancedPrompt = systemPrompt + '\n\nImportant: Always wrap code in markdown code blocks with appropriate language tags.';

      const response = await this.opencodeAdapter.generateResponse({
        modelId: this.config.model,
        systemPrompt: enhancedPrompt,
        prompt: message,
        chatId: context.chatId,
      });

      return {
        content: response.content,
        metadata: {
          model: this.config.model,
          agentId: this.config.id,
          language: this.detectLanguage(message),
        },
      };
    } catch (error) {
      return {
        content: 'I apologize, but I encountered an error processing your code request. Please check your input and try again.',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private detectLanguage(message: string): string | undefined {
    const languages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'];
    for (const lang of languages) {
      if (message.toLowerCase().includes(lang)) {
        return lang;
      }
    }
    return undefined;
  }

  canProcess(message: string): boolean {
    // Detecta se a mensagem é relacionada a código
    const codeKeywords = ['code', 'function', 'class', 'method', 'bug', 'error', 'debug', 'implement', 'algorithm'];
    const messageLower = message.toLowerCase();
    return codeKeywords.some(keyword => messageLower.includes(keyword));
  }
}
