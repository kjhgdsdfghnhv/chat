import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatsModule } from './chats/chats.module';
import { GatewayModule } from './gateway/gateway.module';
import { MessagesModule } from './messages/messages.module';  // <-- добавь

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp'),
    AuthModule,
    UsersModule,
    ChatsModule,
    GatewayModule,
    MessagesModule,  // <-- добавь
  ],
})
export class AppModule {}