import { PrismaClient } from '@prisma/client';
import { ChatRepoPort } from '../../../application/ports/ChatRepoPort.js';
import { Chat, ChatMember } from '../../../domain/chat/ChatPermissions.js';

export class ChatRepository implements ChatRepoPort {
  constructor(private prisma: PrismaClient) {}

  async createChat(chat: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
    const created = await this.prisma.chat.create({
      data: {
        tenantId: chat.tenantId,
        ownerId: chat.ownerId,
        title: chat.title,
        systemPrompt: chat.systemPrompt || null,
        settings: chat.settings as any,
      },
    });

    return this.toDomain(created);
  }

  async findChatById(chatId: string): Promise<Chat | null> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    return chat ? this.toDomain(chat) : null;
  }

  async listChatsByTenant(tenantId: string, limit = 50, offset = 0): Promise<Chat[]> {
    const chats = await this.prisma.chat.findMany({
      where: { tenantId },
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' },
    });

    return chats.map(this.toDomain);
  }

  async listChatsByUser(userId: string, limit = 50, offset = 0): Promise<Chat[]> {
    const chats = await this.prisma.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' },
    });

    return chats.map(this.toDomain);
  }

  async updateChat(chatId: string, updates: Partial<Chat>): Promise<Chat> {
    const updated = await this.prisma.chat.update({
      where: { id: chatId },
      data: {
        title: updates.title,
        systemPrompt: updates.systemPrompt,
        settings: updates.settings as any,
      },
    });

    return this.toDomain(updated);
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.prisma.chat.delete({
      where: { id: chatId },
    });
  }

  async addMember(member: Omit<ChatMember, 'id' | 'joinedAt'>): Promise<ChatMember> {
    const created = await this.prisma.chatMember.create({
      data: {
        chatId: member.chatId,
        userId: member.userId,
        role: member.role,
        permissions: member.permissions as any,
      },
    });

    return this.toMemberDomain(created);
  }

  async removeMember(chatId: string, userId: string): Promise<void> {
    await this.prisma.chatMember.deleteMany({
      where: {
        chatId,
        userId,
      },
    });
  }

  async listMembers(chatId: string): Promise<ChatMember[]> {
    const members = await this.prisma.chatMember.findMany({
      where: { chatId },
    });

    return members.map(this.toMemberDomain);
  }

  async findMember(chatId: string, userId: string): Promise<ChatMember | null> {
    const member = await this.prisma.chatMember.findFirst({
      where: { chatId, userId },
    });

    return member ? this.toMemberDomain(member) : null;
  }

  async updateMemberPermissions(chatId: string, userId: string, permissions: any): Promise<ChatMember> {
    const updated = await this.prisma.chatMember.updateMany({
      where: { chatId, userId },
      data: { permissions: permissions as any },
    });

    const member = await this.findMember(chatId, userId);
    if (!member) {
      throw new Error('Member not found after update');
    }

    return member;
  }

  private toDomain(data: any): Chat {
    return {
      id: data.id,
      tenantId: data.tenantId,
      ownerId: data.ownerId,
      title: data.title,
      systemPrompt: data.systemPrompt || undefined,
      settings: data.settings,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private toMemberDomain(data: any): ChatMember {
    return {
      id: data.id,
      chatId: data.chatId,
      userId: data.userId,
      role: data.role,
      permissions: data.permissions,
      joinedAt: data.joinedAt,
    };
  }
}
