import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { Chat, ChatDocument } from '../chats/chat.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
  ) {}

  async findById(id: string) {
    return this.userModel.findById(id).select('-password');
  }

  async searchByUsername(query: string, currentUserId: string) {
    return this.userModel.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: currentUserId },
    }).select('-password').limit(20);
  }

  async addContact(userId: string, contactId: string) {
    await this.userModel.findByIdAndUpdate(userId, { $addToSet: { contacts: contactId } });
    await this.userModel.findByIdAndUpdate(contactId, { $addToSet: { contacts: userId } });
    return { success: true };
  }

  async removeContact(userId: string, contactId: string) {
    await this.userModel.findByIdAndUpdate(userId, { $pull: { contacts: contactId } });
    return { success: true };
  }

  async getContacts(userId: string) {
    const user = await this.userModel.findById(userId).populate({
      path: 'contacts',
      model: 'User',
      select: '-password',
    });
    return user?.contacts || [];
  }

  async updateAvatar(userId: string, avatarPath: string) {
    return this.userModel.findByIdAndUpdate(userId, { avatar: avatarPath }, { new: true }).select('-password');
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
    return this.userModel.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: isOnline ? undefined : new Date(),
    });
  }

  async updateUsername(userId: string, username: string) {
    return this.userModel.findByIdAndUpdate(userId, { username }, { new: true }).select('-password');
  }

  async getUserChats(userId: string) {
    return this.chatModel.find({ members: userId }).select('_id members');
  }
}