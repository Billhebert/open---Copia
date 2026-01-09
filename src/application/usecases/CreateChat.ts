import { AuthContext } from "../../domain/auth/AuthContext.js";
import {
  Chat,
  ChatPermissions,
  ChatMemberRole,
} from "../../domain/chat/ChatPermissions.js";
import { PolicyEngine } from "../../domain/auth/PolicyEngine.js";
import { ChatRepoPort } from "../ports/ChatRepoPort.js";
import { AuditPort } from "../ports/AuditPort.js";

export interface CreateChatInput {
  title: string;
  systemPrompt?: string;
  settings?: Record<string, any>;
}

export interface CreateChatOutput {
  chat: Chat;
  membershipId: string;
}

export class CreateChat {
  constructor(
    private chatRepo: ChatRepoPort,
    private auditPort: AuditPort,
    private policyEngine: PolicyEngine
  ) {}

  async execute(
    ctx: AuthContext,
    input: CreateChatInput
  ): Promise<CreateChatOutput> {
    // Determina o owner do chat
    // Se tem userId, usa ele; se não, usa o tenantId como owner (para API keys de tenant)
    const ownerId = ctx.userId || `tenant_${ctx.tenantId}`;

    // Se não tem tenantId, não pode criar chat
    if (!ctx.tenantId) {
      throw new Error(
        "User must be authenticated to create a chat. " +
          "You are using a TENANT API key which does not have user context. " +
          "Please use a USER API key instead."
      );
    }

    // Verifica política de criação de chat
    const canCreate = this.policyEngine.isAllowed(ctx, "chat", "create");
    if (!canCreate) {
      throw new Error("User does not have permission to create chats");
    }

    // Cria o chat
    const chat = await this.chatRepo.createChat({
      tenantId: ctx.tenantId,
      ownerId: ownerId,
      title: input.title,
      systemPrompt: input.systemPrompt,
      settings: {
        allowMultiUser: true,
        allowPrivateMessages: true,
        defaultVisibility: "public",
        ...input.settings,
      },
    });

    // Adiciona o owner como membro
    const member = await this.chatRepo.addMember({
      chatId: chat.id,
      userId: ownerId,
      role: "owner",
      permissions: ChatPermissions.getDefaultPermissions("owner"),
    });

    // Auditoria
    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: ownerId,
      action: "chat.create",
      resource: chat.id,
      resourceType: "chat",
      details: { title: chat.title, createdBy: ctx.userId || "tenant_api" },
    });

    return {
      chat,
      membershipId: member.id,
    };
  }
}
