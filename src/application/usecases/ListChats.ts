import { AuthContext } from "../../domain/auth/AuthContext.js";
import { Chat } from "../../domain/chat/ChatPermissions.js";
import { PolicyEngine } from "../../domain/auth/PolicyEngine.js";
import { ChatRepoPort } from "../ports/ChatRepoPort.js";
import { AuditPort } from "../ports/AuditPort.js";

export interface ListChatsInput {
  limit?: number;
  offset?: number;
  userId?: string;
}

export interface ListChatsOutput {
  chats: Chat[];
  total: number;
  limit: number;
  offset: number;
}

export class ListChats {
  constructor(
    private chatRepo: ChatRepoPort,
    private auditPort: AuditPort,
    private policyEngine: PolicyEngine
  ) {}

  async execute(ctx: AuthContext, input: ListChatsInput): Promise<ListChatsOutput> {
    if (!ctx.tenantId) {
      throw new Error("User must be authenticated");
    }

    const canList = this.policyEngine.isAllowed(ctx, "chat", "list");
    if (!canList) {
      throw new Error("User does not have permission to list chats");
    }

    let chats: Chat[];
    if (ctx.userId && !input.userId) {
      chats = await this.chatRepo.listChatsByUser(ctx.userId, input.limit, input.offset);
    } else {
      chats = await this.chatRepo.listChatsByTenant(ctx.tenantId, input.limit, input.offset);
    }

    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "chat.list",
      resource: "list",
      resourceType: "chat",
      details: { count: chats.length, userId: input.userId },
    });

    return {
      chats,
      total: chats.length,
      limit: input.limit || 50,
      offset: input.offset || 0,
    };
  }
}
