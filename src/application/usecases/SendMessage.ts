import { AuthContext } from '../../domain/auth/AuthContext.js';
import { Message, Visibility, MessageAccessScope } from '../../domain/chat/Visibility.js';
import { ChatPermissions } from '../../domain/chat/ChatPermissions.js';
import { PolicyEngine } from '../../domain/auth/PolicyEngine.js';
import { RagQueryBuilder } from '../../domain/rag/RagQuery.js';
import { ChatRepoPort } from '../ports/ChatRepoPort.js';
import { MessageRepoPort } from '../ports/MessageRepoPort.js';
import { RagPort } from '../ports/RagPort.js';
import { ModelRouterPort } from '../ports/ModelRouterPort.js';
import { AuditPort } from '../ports/AuditPort.js';
import { BudgetPort } from '../ports/BudgetPort.js';
import { OpencodeAdapterPort } from '../ports/OpencodeAdapterPort.js';

export interface SendMessageInput {
  chatId: string;
  content: string;
  visibility?: 'public' | 'private';
  visibleTo?: {
    users?: string[];
    roles?: string[];
  };
  parentId?: string;
  useRag?: boolean;
  model?: string;
}

export interface SendMessageOutput {
  userMessage: Message;
  assistantMessage?: Message;
  ragResults?: any[];
}

/**
 * SendMessage é o orquestrador principal do sistema.
 *
 * Responsabilidades:
 * 1. Validar permissões do usuário
 * 2. Criar a mensagem do usuário
 * 3. Buscar contexto RAG (se necessário)
 * 4. Selecionar modelo apropriado
 * 5. Verificar budget
 * 6. Gerar resposta do assistente
 * 7. Salvar mensagem do assistente
 * 8. Auditar tudo
 */
export class SendMessage {
  constructor(
    private chatRepo: ChatRepoPort,
    private messageRepo: MessageRepoPort,
    private ragPort: RagPort,
    private modelRouter: ModelRouterPort,
    private budgetPort: BudgetPort,
    private auditPort: AuditPort,
    private policyEngine: PolicyEngine,
    private opencodeAdapter: OpencodeAdapterPort
  ) {}

  async execute(ctx: AuthContext, input: SendMessageInput): Promise<SendMessageOutput> {
    // Determina o authorId
    // Se tem userId, usa ele; se não, usa o tenantId como author (para API keys de tenant)
    const authorId = ctx.userId || `tenant_${ctx.tenantId}`;

    if (!ctx.tenantId) {
      throw new Error('User must be authenticated');
    }

    // 1. Busca o chat e valida permissões
    const chat = await this.chatRepo.findChatById(input.chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    const members = await this.chatRepo.listMembers(input.chatId);

    // Cria um contexto modificado para verificação de permissões
    // Isso permite que tenants owners sejam reconhecidos como owners dos chats que criaram
    const permCtx = ctx.userId ? ctx : { ...ctx, userId: authorId };
    const canSend = ChatPermissions.canSendMessages(chat, members, permCtx);
    if (!canSend) {
      throw new Error('User does not have permission to send messages');
    }

    // Valida mensagem privada
    if (input.visibility === 'private') {
      const canSendPrivate = ChatPermissions.canSendPrivateMessages(chat, members, permCtx);
      if (!canSendPrivate) {
        throw new Error('User does not have permission to send private messages');
      }

      const allowed = this.policyEngine.isAllowed(ctx, 'chat', 'sendPrivateMessage');
      if (!allowed) {
        throw new Error('Private messages are not allowed by policy');
      }
    }

    // 2. Busca histórico de mensagens para contexto
    const previousMessages = await this.messageRepo.listMessagesByChat(input.chatId, 20, 0);
    
    // 3. Cria a mensagem do usuário
    const messageData = input.visibility === 'private'
      ? Visibility.createPrivateMessage(
          input.chatId,
          authorId,
          input.content,
          ctx,
          input.visibleTo || {},
          'user'
        )
      : Visibility.createPublicMessage(
          input.chatId,
          authorId,
          input.content,
          ctx,
          'user'
        );

    const userMessage = await this.messageRepo.createMessage({
      ...messageData,
      parentId: input.parentId,
    });

    // Auditoria da mensagem do usuário
    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: authorId,
      action: 'message.create',
      resource: userMessage.id,
      resourceType: 'message',
      details: {
        chatId: input.chatId,
        visibility: input.visibility || 'public',
        length: input.content.length,
      },
    });

    // 3. Buscar contexto RAG (se necessário)
    let ragResults: any[] = [];
    if (input.useRag) {
      const ragQuery = RagQueryBuilder.fromMessageScope(
        input.content,
        userMessage.accessScope
      );

      // Aplica políticas de RAG
      const ragAllowed = this.policyEngine.isAllowed(ctx, 'rag', 'search');
      if (ragAllowed) {
        ragResults = await this.ragPort.search(ctx.tenantId, ragQuery);
      }
    }

    // 4. Selecionar modelo
    let modelId = input.model;
    if (!modelId) {
      const model = await this.modelRouter.selectModel(ctx, {
        requiredCapabilities: { toolCall: true },
        preferFree: true,
      });
      modelId = model?.id;
    } else {
      // Verifica se o modelo é permitido
      const allowed = await this.modelRouter.isModelAllowed(ctx, modelId);
      if (!allowed) {
        throw new Error(`Model ${modelId} is not allowed by policy`);
      }
    }

    if (!modelId) {
      throw new Error('No suitable model found');
    }

    // 5. Verificar budget
    const tenantBudget = await this.budgetPort.findTenantBudget(ctx.tenantId, 'token');
    if (tenantBudget) {
      const exceeded = await this.budgetPort.isExceeded(tenantBudget.id);
      if (exceeded) {
        throw new Error('Tenant token budget exceeded');
      }
    }

    const userBudget = ctx.userId ? await this.budgetPort.findUserBudget(ctx.userId, 'token') : null;
    if (userBudget) {
      const exceeded = await this.budgetPort.isExceeded(userBudget.id);
      if (exceeded) {
        throw new Error('User token budget exceeded');
      }
    }

    // 6. Gerar resposta do assistente
    let assistantContent: string;
    let reasoning: string | undefined;
    
    // Constrói o system prompt com histórico da conversa
    let systemPrompt = chat.systemPrompt || '';
    
    if (previousMessages.length > 0) {
      const historyText = previousMessages
        .slice(-10)
        .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
        .join('\n');
      
      systemPrompt = `Você é um assistente de IA prestativo e friendly.

Histórico da conversa:
${historyText}

${systemPrompt}`;
    }
    
    try {
      const response = await this.opencodeAdapter.generateResponse({
        modelId: modelId,
        prompt: input.content,
        systemPrompt: systemPrompt,
        chatId: input.chatId,
        useRag: input.useRag && ragResults.length > 0,
      });
      
      assistantContent = response.content;
      reasoning = response.reasoning;
    } catch (error: any) {
      console.error(`Erro ao gerar resposta: ${error.message}`);
      // Fallback para resposta local se SDK falhar
      assistantContent = `Desculpe, não foi possível gerar uma resposta no momento. Tente novamente mais tarde.`;
    }

    const assistantMessageData = Visibility.createPublicMessage(
      input.chatId,
      'assistant',
      assistantContent,
      ctx,
      'assistant'
    );

    const assistantMessage = await this.messageRepo.createMessage({
      ...assistantMessageData,
      authorId: 'assistant',
      parentId: userMessage.id,
      modelUsed: modelId,
      reasoning: reasoning,
    });

    // 7. Atualizar budget
    if (tenantBudget) {
      await this.budgetPort.incrementUsage(tenantBudget.id, 100);
    }
    if (userBudget) {
      await this.budgetPort.incrementUsage(userBudget.id, 100);
    }

    // 8. Auditoria
    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: authorId,
      action: 'message.assistant_response',
      resource: assistantMessage.id,
      resourceType: 'message',
      details: {
        chatId: input.chatId,
        userMessageId: userMessage.id,
        modelUsed: modelId,
        ragUsed: input.useRag,
        ragResultsCount: ragResults.length,
      },
    });

    return {
      userMessage,
      assistantMessage,
      ragResults,
    };
  }
}
