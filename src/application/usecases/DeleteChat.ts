import { AuthContext } from "../../domain/auth/AuthContext.js";
import { Chat, ChatPermissions } from "../../domain/chat/ChatPermissions.js";
import { ChatRepoPort } from "../ports/ChatRepoPort.js";
import { MessageRepoPort } from "../ports/MessageRepoPort.js";
import { AuditPort } from "../ports/AuditPort.js";

export interface DeleteChatInput {
  chatId: string;
}

export class DeleteChat {
  constructor(
    private chatRepo: ChatRepoPort,
    private messageRepo: MessageRepoPort,
    private auditPort: AuditPort
  ) {}

  async execute(ctx: AuthContext, input: DeleteChatInput): Promise<void> {
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

    if (!ChatPermissions.canDeleteChat(chat, members, permCtx)) {
      throw new Error("You do not have permission to delete this chat");
    }

    await this.messageRepo.deleteMessagesByChat(input.chatId);
    await this.chatRepo.deleteChat(input.chatId);

    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "chat.delete",
      resource: input.chatId,
      resourceType: "chat",
      details: { deletedAt: new Date().toISOString() },
    });
  }
}
