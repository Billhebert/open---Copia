import { AuthContext } from '../auth/AuthContext.js';

export type MessageVisibility = 'public' | 'private';

export interface Message {
  id: string;
  chatId: string;
  authorId: string;
  parentId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  visibility: MessageVisibility;
  visibilityRoles: string[];
  visibilityUsers: string[];
  accessScope: MessageAccessScope;
  modelUsed?: string;
  reasoning?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface MessageAccessScope {
  department?: string;
  subdepartment?: string;
  tags?: string[];
  roles?: string[];
}

export class Visibility {
  /**
   * Verifica se o usuário pode ver a mensagem
   */
  static canViewMessage(message: Message, ctx: AuthContext): boolean {
    // Mensagens públicas: todos os membros do chat podem ver
    if (message.visibility === 'public') {
      return true;
    }

    // Mensagens privadas: apenas os listados podem ver
    if (message.visibility === 'private') {
      // Autor sempre pode ver
      if (ctx.userId === message.authorId) {
        return true;
      }

      // Usuários listados explicitamente
      if (ctx.userId && message.visibilityUsers.includes(ctx.userId)) {
        return true;
      }

      // Usuários com roles listadas
      if (message.visibilityRoles.some(role => ctx.roles.includes(role))) {
        return true;
      }

      return false;
    }

    return false;
  }

  /**
   * Filtra mensagens que o usuário pode ver
   */
  static filterVisibleMessages(messages: Message[], ctx: AuthContext): Message[] {
    return messages.filter(m => this.canViewMessage(m, ctx));
  }

  /**
   * Calcula o access scope de uma mensagem baseado no autor
   */
  static calculateAccessScope(authorContext: AuthContext): MessageAccessScope {
    return {
      department: authorContext.department,
      subdepartment: authorContext.subdepartment,
      tags: authorContext.tags,
      roles: authorContext.roles,
    };
  }

  /**
   * Verifica se o access scope da mensagem permite acesso a um recurso
   * (usado para filtrar RAG e tools)
   */
  static allowsResourceAccess(
    messageScope: MessageAccessScope,
    resourceScope: {
      department?: string;
      subdepartment?: string;
      tags?: string[];
      roles?: string[];
    }
  ): boolean {
    // Se o recurso requer um departamento específico
    if (resourceScope.department) {
      if (messageScope.department !== resourceScope.department) {
        return false;
      }
    }

    // Se o recurso requer um subdepartment específico
    if (resourceScope.subdepartment) {
      if (messageScope.subdepartment !== resourceScope.subdepartment) {
        return false;
      }
    }

    // Se o recurso requer tags
    if (resourceScope.tags && resourceScope.tags.length > 0) {
      if (!messageScope.tags || !resourceScope.tags.some(tag => messageScope.tags!.includes(tag))) {
        return false;
      }
    }

    // Se o recurso requer roles
    if (resourceScope.roles && resourceScope.roles.length > 0) {
      if (!messageScope.roles || !resourceScope.roles.some(role => messageScope.roles!.includes(role))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cria uma mensagem pública
   */
  static createPublicMessage(
    chatId: string,
    authorId: string,
    content: string,
    authorContext: AuthContext,
    role: 'user' | 'assistant' | 'system' = 'user'
  ): Omit<Message, 'id' | 'createdAt'> {
    return {
      chatId,
      authorId,
      role,
      content,
      visibility: 'public',
      visibilityRoles: [],
      visibilityUsers: [],
      accessScope: this.calculateAccessScope(authorContext),
      metadata: {},
    };
  }

  /**
   * Cria uma mensagem privada
   */
  static createPrivateMessage(
    chatId: string,
    authorId: string,
    content: string,
    authorContext: AuthContext,
    visibleTo: { users?: string[]; roles?: string[] },
    role: 'user' | 'assistant' | 'system' = 'user'
  ): Omit<Message, 'id' | 'createdAt'> {
    return {
      chatId,
      authorId,
      role,
      content,
      visibility: 'private',
      visibilityRoles: visibleTo.roles || [],
      visibilityUsers: visibleTo.users || [],
      accessScope: this.calculateAccessScope(authorContext),
      metadata: {},
    };
  }
}
