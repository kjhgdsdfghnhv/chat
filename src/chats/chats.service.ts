import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat, ChatDocument } from './chat.schema';
import { Message, MessageDocument } from '../messages/message.schema';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async getUserChats(userId: string) {
    return this.chatModel.find({ members: userId }).sort({ updatedAt: -1 });
  }

  async createPrivateChat(userId: string, targetUserId: string) {
    const existing = await this.chatModel.findOne({
      type: 'private',
      members: { $all: [userId, targetUserId], $size: 2 },
    });
    if (existing) return existing;
    return this.chatModel.create({
      type: 'private',
      members: [userId, targetUserId],
    });
  }

  async createGroupChat(adminId: string, name: string, memberIds: string[]) {
    const members = [...new Set([adminId, ...memberIds])];
    return this.chatModel.create({
      type: 'group',
      name,
      members,
      adminId,
    });
  }

  async getChatMessages(chatId: string, userId: string, page: number = 1, limit: number = 50) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat || !chat.members.includes(userId)) throw new ForbiddenException();
    const skip = (page - 1) * limit;
    const total = await this.messageModel.countDocuments({ chatId });
    const messages = await this.messageModel
      .find({ chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    return {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.messageModel.findById(messageId);
    if (!msg) throw new ForbiddenException('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenException('Not your message');
    msg.isDeleted = true;
    msg.text = 'Повідомлення видалено';
    await msg.save();
    return msg;
  }

  async addMembersToGroup(chatId: string, adminId: string, newMemberIds: string[]) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat || chat.adminId !== adminId) throw new ForbiddenException('Not admin');
    const updated = await this.chatModel.findByIdAndUpdate(
      chatId,
      { $addToSet: { members: { $each: newMemberIds } } },
      { new: true },
    );
    return updated;
  }

  async deleteChat(chatId: string, userId: string) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat || !chat.members.includes(userId)) throw new ForbiddenException('Not member of this chat');
    
    await this.messageModel.deleteMany({ chatId });
    await this.chatModel.findByIdAndDelete(chatId);
    return { success: true };
  }

  // Метод для оновлення назви групи
  async updateGroupName(chatId: string, userId: string, newName: string) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.type !== 'group') throw new BadRequestException('Not a group chat');
    if (!chat.members.includes(userId)) throw new ForbiddenException('Not a member');
    
    return this.chatModel.findByIdAndUpdate(chatId, { name: newName }, { new: true });
  }
}