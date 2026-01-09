import { Chat, ChatMember } from '../../domain/chat/ChatPermissions.js';

export interface ChatRepoPort {
  /**
   * Cria um novo chat
   */
  createChat(chat: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat>;

  /**
   * Busca um chat por ID
   */
  findChatById(chatId: string): Promise<Chat | null>;

  /**
   * Lista chats de um tenant
   */
  listChatsByTenant(tenantId: string, limit?: number, offset?: number): Promise<Chat[]>;

  /**
   * Lista chats de um usuário
   */
  listChatsByUser(userId: string, limit?: number, offset?: number): Promise<Chat[]>;

  /**
   * Atualiza um chat
   */
  updateChat(chatId: string, updates: Partial<Chat>): Promise<Chat>;

  /**
   * Deleta um chat
   */
  deleteChat(chatId: string): Promise<void>;

  /**
   * Adiciona um membro ao chat
   */
  addMember(member: Omit<ChatMember, 'id' | 'joinedAt'>): Promise<ChatMember>;

  /**
   * Remove um membro do chat
   */
  removeMember(chatId: string, userId: string): Promise<void>;

  /**
   * Lista membros de um chat
   */
  listMembers(chatId: string): Promise<ChatMember[]>;

  /**
   * Busca um membro específico
   */
  findMember(chatId: string, userId: string): Promise<ChatMember | null>;

  /**
   * Atualiza permissões de um membro
   */
  updateMemberPermissions(chatId: string, userId: string, permissions: any): Promise<ChatMember>;
}
