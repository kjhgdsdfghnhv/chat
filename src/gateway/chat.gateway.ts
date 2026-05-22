import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from '../messages/message.schema';
import { Chat, ChatDocument } from '../chats/chat.schema';
import { User, UserDocument } from '../users/user.schema';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSockets = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);
      await this.userModel.findByIdAndUpdate(payload.sub, { isOnline: true });
      this.server.emit('user:online', { userId: payload.sub, isOnline: true });
      const chats = await this.chatModel.find({ members: payload.sub });
      chats.forEach(chat => client.join(chat._id.toString()));
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.delete(userId);
      await this.userModel.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      this.server.emit('user:online', { userId, isOnline: false, lastSeen: new Date() });
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(@MessageBody() data: { chatId: string; text: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const chat = await this.chatModel.findById(data.chatId);
    if (!chat || !chat.members.includes(userId)) return;
    const message = await this.messageModel.create({
      chatId: data.chatId,
      senderId: userId,
      text: data.text,
    });
    await this.chatModel.findByIdAndUpdate(data.chatId, {
      lastMessage: { text: data.text, senderId: userId, createdAt: new Date() },
    });
    this.server.to(data.chatId).emit('message:new', message);
    return message;
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(@MessageBody() data: { messageId: string; chatId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const msg = await this.messageModel.findById(data.messageId);
    if (!msg || msg.senderId !== userId) return;
    msg.isDeleted = true;
    msg.text = 'Повідомлення видалено';
    await msg.save();
    this.server.to(data.chatId).emit('message:deleted', { messageId: data.messageId });
  }

  @SubscribeMessage('chat:join')
  handleJoinChat(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    client.join(chatId);
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.chatId).emit('typing:update', { userId: client.data.userId, isTyping: true });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.chatId).emit('typing:update', { userId: client.data.userId, isTyping: false });
  }

  @SubscribeMessage('message:markAsRead')
  async handleMarkAsRead(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    await this.messageModel.updateMany(
      { chatId: data.chatId, senderId: { $ne: userId } },
      { isRead: true }
    );
    this.server.to(data.chatId).emit('messages:read', { chatId: data.chatId });
  }
}
