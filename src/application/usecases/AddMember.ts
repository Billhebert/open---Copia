import { AuthContext } from '../../domain/auth/AuthContext.js';
import { ChatPermissions, ChatMember, ChatMemberRole } from '../../domain/chat/ChatPermissions.js';
import { PolicyEngine } from '../../domain/auth/PolicyEngine.js';
import { ChatRepoPort } from '../ports/ChatRepoPort.js';
import { AuditPort } from '../ports/AuditPort.js';

export interface AddMemberInput {
  chatId: string;
  userId: string;
  role?: ChatMemberRole;
  permissions?: Record<string, any>;
}

export interface AddMemberOutput {
  member: ChatMember;
}

export class AddMember {
  constructor(
    private chatRepo: ChatRepoPort,
    private auditPort: AuditPort,
    private policyEngine: PolicyEngine
  ) {}

  async execute(ctx: AuthContext, input: AddMemberInput): Promise<AddMemberOutput> {
    if (!ctx.userId) {
      throw new Error('User must be authenticated');
    }

    // Busca o chat
    const chat = await this.chatRepo.findChatById(input.chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Verifica permissões
    const members = await this.chatRepo.listMembers(input.chatId);
    const canInvite = ChatPermissions.canInviteMembers(chat, members, ctx);
    if (!canInvite) {
      throw new Error('User does not have permission to invite members');
    }

    // Verifica se já é membro
    const existingMember = members.find(m => m.userId === input.userId);
    if (existingMember) {
      throw new Error('User is already a member of this chat');
    }

    // Verifica política de max members
    const memberCount = members.length;
    const canAdd = this.policyEngine.isAllowed(ctx, 'chat', 'addMember', { memberCount });
    if (!canAdd) {
      throw new Error('Cannot add more members to this chat (limit reached)');
    }

    // Adiciona membro
    const role = input.role || 'member';
    const permissions = input.permissions || ChatPermissions.getDefaultPermissions(role);

    const member = await this.chatRepo.addMember({
      chatId: input.chatId,
      userId: input.userId,
      role,
      permissions,
    });

    // Auditoria
    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'chat.add_member',
      resource: input.chatId,
      resourceType: 'chat',
      details: {
        addedUserId: input.userId,
        role,
      },
    });

    return { member };
  }
}
