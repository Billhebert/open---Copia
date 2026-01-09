import { PrismaClient } from '@prisma/client';
import { MessageRepoPort } from '../../../application/ports/MessageRepoPort.js';
import { Message } from '../../../domain/chat/Visibility.js';

export class MessageRepository implements MessageRepoPort {
  constructor(private prisma: PrismaClient) {}

  async createMessage(msg: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const created = await this.prisma.message.create({
      data: {
        chatId: msg.chatId,
        authorId: msg.authorId,
        parentId: msg.parentId || null,
        role: msg.role,
        content: msg.content,
        visibility: msg.visibility,
        visibilityRoles: msg.visibilityRoles,
        visibilityUsers: msg.visibilityUsers,
        accessScope: msg.accessScope as any,
        modelUsed: msg.modelUsed || null,
        reasoning: msg.reasoning || null,
        metadata: msg.metadata as any,
      },
    });

    return this.toDomain(created);
  }

  async findMessagesByChat(chatId: string, limit = 50, offset = 0): Promise<Message[]> {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'asc' },
    });

    return messages.map(this.toDomain);
  }

  async listMessagesByChat(chatId: string, limit?: number, offset?: number): Promise<Message[]> {
    return this.findMessagesByChat(chatId, limit, offset);
  }

  async listMessageChildren(parentId: string): Promise<Message[]> {
    const messages = await this.prisma.message.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map(this.toDomain);
  }

  async updateMessage(messageId: string, updates: Partial<Message>): Promise<Message> {
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: updates.content,
        metadata: updates.metadata as any,
      },
    });

    return this.toDomain(updated);
  }

  async findMessageById(messageId: string): Promise<Message | null> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    return message ? this.toDomain(message) : null;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  async deleteMessagesByChat(chatId: string): Promise<void> {
    await this.prisma.message.deleteMany({
      where: { chatId },
    });
  }

  async findLastMessage(chatId: string): Promise<Message | null> {
    const message = await this.prisma.message.findFirst({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
    });

    return message ? this.toDomain(message) : null;
  }

  async countMessages(chatId: string): Promise<number> {
    return this.prisma.message.count({
      where: { chatId },
    });
  }

  private toDomain(data: any): Message {
    return {
      id: data.id,
      chatId: data.chatId,
      authorId: data.authorId,
      parentId: data.parentId || undefined,
      role: data.role,
      content: data.content,
      visibility: data.visibility,
      visibilityRoles: data.visibilityRoles,
      visibilityUsers: data.visibilityUsers,
      accessScope: data.accessScope,
      modelUsed: data.modelUsed || undefined,
      reasoning: data.reasoning || undefined,
      metadata: data.metadata,
      createdAt: data.createdAt,
    };
  }
}
