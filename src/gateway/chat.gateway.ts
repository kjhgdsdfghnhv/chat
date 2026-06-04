import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { Message, MessageDocument } from '../messages/message.schema';
import { Chat, ChatDocument } from '../chats/chat.schema';
import { User, UserDocument } from '../users/user.schema';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSockets = new Map<string, string>();
  private logger = new Logger('ChatGateway');

  constructor(
    private jwtService: JwtService,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);
      await this.userModel.findByIdAndUpdate(payload.sub, { isOnline: true });
      this.server.emit('user:online', { userId: payload.sub, isOnline: true });
      const chats = await this.chatModel.find({ members: payload.sub });
      chats.forEach(chat => client.join(chat._id.toString()));
      this.logger.debug(`User ${payload.sub} connected. Total clients: ${this.server.engine.clientsCount}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = client.data.userId;
      if (userId) {
        this.userSockets.delete(userId);
        await this.userModel.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        this.server.emit('user:online', { userId, isOnline: false, lastSeen: new Date() });
        this.logger.debug(`User ${userId} disconnected`);
      }
    } catch (error) {
      this.logger.error('Disconnect error:', error);
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(@MessageBody() data: { chatId: string; text?: string; fileUrl?: string; fileType?: string; fileName?: string }, @ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.userId;
      const chat = await this.chatModel.findById(data.chatId);
      if (!chat || !chat.members.includes(userId)) {
        return { error: 'Not a member of this chat' };
      }
      
      let messageText = data.text || '';
      if (data.fileUrl) {
        if (data.fileType?.startsWith('image/')) messageText = `📷 ${data.fileName || 'Зображення'}`;
        else if (data.fileType?.startsWith('video/')) messageText = `🎥 ${data.fileName || 'Відео'}`;
        else messageText = `📎 ${data.fileName || 'Файл'}`;
      }
      
      const message = await this.messageModel.create({
        chatId: data.chatId,
        senderId: userId,
        text: messageText,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileName: data.fileName,
      });

      await this.chatModel.findByIdAndUpdate(data.chatId, {
        lastMessage: { text: messageText, senderId: userId, createdAt: new Date() },
      });

      const messageData = message.toObject();
      this.server.to(data.chatId).emit('message:new', messageData);
      
      this.logger.debug(`Message sent to chat ${data.chatId}`);
      return messageData;
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(@MessageBody() data: { messageId: string; chatId: string }, @ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.userId;
      const msg = await this.messageModel.findById(data.messageId);
      if (!msg) {
        this.logger.warn(`Message not found: ${data.messageId}`);
        return { error: 'Message not found' };
      }
      if (msg.senderId !== userId) {
        this.logger.warn(`User ${userId} tried to delete message by ${msg.senderId}`);
        return { error: 'Not authorized' };
      }
      msg.isDeleted = true;
      msg.text = 'Повідомлення видалено';
      await msg.save();
      this.server.to(data.chatId).emit('message:deleted', { messageId: data.messageId });
      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting message:', error);
      return { error: 'Failed to delete message' };
    }
  }

  @SubscribeMessage('chat:join')
  handleJoinChat(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    client.join(chatId);
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    try {
      if (!data.chatId || !client.data.userId) return;
      client.to(data.chatId).emit('typing:update', { userId: client.data.userId, isTyping: true });
    } catch (error) {
      this.logger.error('Error in typing:start:', error);
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    try {
      if (!data.chatId || !client.data.userId) return;
      client.to(data.chatId).emit('typing:update', { userId: client.data.userId, isTyping: false });
    } catch (error) {
      this.logger.error('Error in typing:stop:', error);
    }
  }

  @SubscribeMessage('message:markAsRead')
  async handleMarkAsRead(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.userId;
      if (!userId || !data.chatId) return { error: 'Invalid request' };
      await this.messageModel.updateMany(
        { chatId: data.chatId, senderId: { $ne: userId } },
        { isRead: true }
      );
      this.server.to(data.chatId).emit('messages:read', { chatId: data.chatId });
      return { success: true };
    } catch (error) {
      this.logger.error('Error marking messages as read:', error);
      return { error: 'Failed to mark messages as read' };
    }
  }

  @SubscribeMessage('chat:new')
  async handleNewChat(@MessageBody() data: { chat: any }, @ConnectedSocket() client: Socket) {
    try {
      const chat = data.chat;
      for (const memberId of chat.members) {
        const socketId = this.userSockets.get(memberId);
        if (socketId) {
          this.server.sockets.sockets.get(socketId)?.join(chat._id.toString());
        }
      }
      this.server.to(chat._id.toString()).emit('chat:created', chat);
      this.logger.debug(`Chat created: ${chat._id}`);
    } catch (error) {
      this.logger.error('Error creating chat:', error);
    }
  }
}