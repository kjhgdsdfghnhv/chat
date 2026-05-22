import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { ChatsModule } from '../chats/chats.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, ChatsModule, UsersModule],
  providers: [ChatGateway],
})
export class GatewayModule {}
