// users.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
  Patch,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatGateway } from '../gateway/chat.gateway';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('search')
  async search(@Query('q') query: string, @Request() req) {
    return this.usersService.searchByUsername(query, req.user._id.toString());
  }

  @Get('contacts')
  async getContacts(@Request() req) {
    return this.usersService.getContacts(req.user._id.toString());
  }

  @Post('contacts/:id')
  async addContact(@Param('id') contactId: string, @Request() req) {
    return this.usersService.addContact(req.user._id.toString(), contactId);
  }

  @Delete('contacts/:id')
  async removeContact(@Param('id') contactId: string, @Request() req) {
    return this.usersService.removeContact(req.user._id.toString(), contactId);
  }

  @Patch('me')
  async updateMe(@Request() req, @Body('username') username: string) {
    if (!username || username.trim().length === 0) {
      throw new BadRequestException('Username is required');
    }
    const userId = req.user._id.toString();
    const updated = await this.usersService.updateUsername(userId, username.trim());

    // Отримуємо всі чати користувача та надсилаємо оновлення через WebSocket
    const chats = await this.usersService.getUserChats(userId);
    const newUsername = updated.username;

    for (const chat of chats) {
      // Переконуємось, що chat._id – це рядок
      const chatId = chat._id.toString();
      this.chatGateway.server.to(chatId).emit('user:nameChanged', {
        userId,
        username: newUsername,
      });
    }

    return updated;
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      this.logger.error('No file received');
      throw new BadRequestException('No file uploaded');
    }
    this.logger.log(`File received: ${file.originalname}`);
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const result = await this.usersService.updateAvatar(req.user._id.toString(), avatarUrl);
    return result;
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}