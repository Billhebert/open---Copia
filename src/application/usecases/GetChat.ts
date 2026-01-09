import { AuthContext } from "../../domain/auth/AuthContext.js";
import { Chat, ChatPermissions } from "../../domain/chat/ChatPermissions.js";
import { Message } from "../../domain/chat/Visibility.js";
import { ChatRepoPort } from "../ports/ChatRepoPort.js";
import { MessageRepoPort } from "../ports/MessageRepoPort.js";
import { AuditPort } from "../ports/AuditPort.js";

export interface GetChatInput {
  chatId: string;
  limit?: number;
  offset?: number;
}

export interface GetChatOutput {
  chat: Chat;
  messages: Message[];
}

export class GetChat {
  constructor(
    private chatRepo: ChatRepoPort,
    private messageRepo: MessageRepoPort,
    private auditPort: AuditPort
  ) {}

  async execute(ctx: AuthContext, input: GetChatInput): Promise<GetChatOutput> {
    if (!ctx.tenantId) {
      throw new Error("User must be authenticated");
    }

    const chat = await this.chatRepo.findChatById(input.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    const members = await this.chatRepo.listMembers(input.chatId);

    const permCtx = ctx.userId 
      ? ctx 
      : { ...ctx, userId: `tenant_${ctx.tenantId}` };

    if (!ChatPermissions.canViewChat(chat, members, permCtx)) {
      throw new Error("You do not have permission to view this chat");
    }

    const messages = await this.messageRepo.listMessagesByChat(
      input.chatId,
      input.limit,
      input.offset
    );

    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "chat.get",
      resource: input.chatId,
      resourceType: "chat",
      details: { messageCount: messages.length },
    });

    return {
      chat,
      messages,
    };
  }
}
