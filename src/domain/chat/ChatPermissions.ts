import { AuthContext } from '../auth/AuthContext.js';

export interface Chat {
  id: string;
  tenantId: string;
  ownerId: string;
  title: string;
  systemPrompt?: string;
  settings: ChatSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSettings {
  allowMultiUser?: boolean;
  maxMembers?: number;
  allowPrivateMessages?: boolean;
  defaultVisibility?: 'public' | 'private';
  [key: string]: any;
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: ChatMemberRole;
  permissions: ChatMemberPermissions;
  joinedAt: Date;
}

export type ChatMemberRole = 'owner' | 'member' | 'viewer';

export interface ChatMemberPermissions {
  canSendMessages?: boolean;
  canSendPrivateMessages?: boolean;
  canInviteMembers?: boolean;
  canRemoveMembers?: boolean;
  canChangeSettings?: boolean;
  canApprovTools?: boolean;
  canDeleteMessages?: boolean;
  [key: string]: any;
}

export class ChatPermissions {
  /**
   * Verifica se o ID é de um tenant owner (tenant_<tenantId>)
   */
  static isTenantOwner(userId: string | undefined, tenantId: string): boolean {
    return !!userId && userId === `tenant_${tenantId}`;
  }

  /**
   * Verifica se o usuário é membro do chat
   */
  static isMember(members: ChatMember[], userId: string): boolean {
    return members.some(m => m.userId === userId);
  }

  /**
   * Verifica se o usuário é owner do chat
   */
  static isOwner(chat: Chat, userId: string): boolean {
    return chat.ownerId === userId;
  }

  /**
   * Verifica se o usuário pode enviar mensagens
   */
  static canSendMessages(chat: Chat, members: ChatMember[], ctx: AuthContext): boolean {
    const effectiveUserId = ctx.userId || `tenant_${ctx.tenantId}`;
    if (this.isTenantOwner(ctx.userId, ctx.tenantId) && this.isOwner(chat, effectiveUserId)) {
      return true;
    }

    if (!ctx.userId) return false;

    const member = members.find(m => m.userId === ctx.userId);
    if (!member) return false;

    return member.permissions.canSendMessages ?? true;
  }

  /**
   * Verifica se o usuário pode enviar mensagens privadas
   */
  static canSendPrivateMessages(chat: Chat, members: ChatMember[], ctx: AuthContext): boolean {
    const effectiveUserId = ctx.userId || `tenant_${ctx.tenantId}`;
    if (this.isTenantOwner(ctx.userId, ctx.tenantId) && this.isOwner(chat, effectiveUserId)) {
      return true;
    }

    if (!ctx.userId) return false;
    if (!chat.settings.allowPrivateMessages) return false;

    const member = members.find(m => m.userId === ctx.userId);
    if (!member) return false;

    return member.permissions.canSendPrivateMessages ?? true;
  }

  /**
   * Verifica se o usuário pode convidar membros
   */
  static canInviteMembers(chat: Chat, members: ChatMember[], ctx: AuthContext): boolean {
    const effectiveUserId = ctx.userId || `tenant_${ctx.tenantId}`;
    if (this.isTenantOwner(ctx.userId, ctx.tenantId) && this.isOwner(chat, effectiveUserId)) {
      return true;
    }

    if (!ctx.userId) return false;

    const member = members.find(m => m.userId === ctx.userId);
    if (!member) return false;

    if (member.role === 'owner') return true;

    return member.permissions.canInviteMembers ?? false;
  }

  /**
   * Verifica se o usuário pode aprovar tools
   */
  static canApproveTools(chat: Chat, members: ChatMember[], ctx: AuthContext): boolean {
    const effectiveUserId = ctx.userId || `tenant_${ctx.tenantId}`;
    if (this.isTenantOwner(ctx.userId, ctx.tenantId) && this.isOwner(chat, effectiveUserId)) {
      return true;
    }

    if (!ctx.userId) return false;

    const member = members.find(m => m.userId === ctx.userId);
    if (!member) return false;

    if (member.role === 'owner') return true;

    return member.permissions.canApprovTools ?? false;
  }

  /**
   * Verifica se o usuário pode ver o chat
   */
  static canViewChat(chat: Chat, members: ChatMember[], ctx: AuthContext): boolean {
    const effectiveUserId = ctx.userId || `tenant_${ctx.tenantId}`;
    if (this.isTenantOwner(ctx.userId, ctx.tenantId) && this.isOwner(chat, effectiveUserId)) {
      return true;
    }

    if (!ctx.userId) return false;

    return this.isMember(members, ctx.userId);
  }

  /**
   * Verifica se o usuário pode excluir o chat
   */
  static canDeleteChat(chat: Chat, members: ChatMember[], ctx: AuthContext): boolean {
    const effectiveUserId = ctx.userId || `tenant_${ctx.tenantId}`;
    if (this.isTenantOwner(ctx.userId, ctx.tenantId) && this.isOwner(chat, effectiveUserId)) {
      return true;
    }

    if (!ctx.userId) return false;

    const member = members.find(m => m.userId === ctx.userId);
    if (!member) return false;

    if (member.role === 'owner') return true;

    return member.permissions.canRemoveMembers ?? false;
  }

  /**
   * Retorna as permissões padrão por role
   */
  static getDefaultPermissions(role: ChatMemberRole): ChatMemberPermissions {
    switch (role) {
      case 'owner':
        return {
          canSendMessages: true,
          canSendPrivateMessages: true,
          canInviteMembers: true,
          canRemoveMembers: true,
          canChangeSettings: true,
          canApprovTools: true,
          canDeleteMessages: true,
        };
      case 'member':
        return {
          canSendMessages: true,
          canSendPrivateMessages: true,
          canInviteMembers: false,
          canRemoveMembers: false,
          canChangeSettings: false,
          canApprovTools: false,
          canDeleteMessages: false,
        };
      case 'viewer':
        return {
          canSendMessages: false,
          canSendPrivateMessages: false,
          canInviteMembers: false,
          canRemoveMembers: false,
          canChangeSettings: false,
          canApprovTools: false,
          canDeleteMessages: false,
        };
      default:
        return {};
    }
  }
}
