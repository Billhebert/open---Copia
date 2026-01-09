import { Message } from '../../domain/chat/Visibility.js';

export interface MessageRepoPort {
  /**
   * Cria uma nova mensagem
   */
  createMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message>;

  /**
   * Busca uma mensagem por ID
   */
  findMessageById(messageId: string): Promise<Message | null>;

  /**
   * Lista mensagens de um chat
   */
  listMessagesByChat(chatId: string, limit?: number, offset?: number): Promise<Message[]>;

  /**
   * Lista mensagens filhas de uma mensagem (thread)
   */
  listMessageChildren(parentId: string): Promise<Message[]>;

  /**
   * Atualiza uma mensagem
   */
  updateMessage(messageId: string, updates: Partial<Message>): Promise<Message>;

  /**
   * Deleta uma mensagem
   */
  deleteMessage(messageId: string): Promise<void>;

  /**
   * Deleta todas as mensagens de um chat
   */
  deleteMessagesByChat(chatId: string): Promise<void>;

  /**
   * Busca a última mensagem de um chat
   */
  findLastMessage(chatId: string): Promise<Message | null>;

  /**
   * Conta mensagens de um chat
   */
  countMessages(chatId: string): Promise<number>;
}
