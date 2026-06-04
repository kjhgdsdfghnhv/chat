import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { ChatsModule } from '../chats/chats.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuthModule,
    ChatsModule,
    forwardRef(() => UsersModule),
  ],
  providers: [ChatGateway],
  exports: [ChatGateway], // важливо: експортуємо, щоб UsersModule міг його використати
})
export class GatewayModule {}