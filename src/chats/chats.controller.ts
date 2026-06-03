import { Controller, Get, Post, Delete, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @Get()
  getUserChats(@Request() req) {
    return this.chatsService.getUserChats(req.user._id.toString());
  }

  @Post('private/:targetId')
  createPrivateChat(@Param('targetId') targetId: string, @Request() req) {
    return this.chatsService.createPrivateChat(req.user._id.toString(), targetId);
  }

  @Post('group')
  createGroupChat(@Body() body: { name: string; memberIds: string[] }, @Request() req) {
    return this.chatsService.createGroupChat(req.user._id.toString(), body.name, body.memberIds);
  }

  @Get(':chatId/messages')
  getMessages(@Param('chatId') chatId: string, @Request() req) {
    return this.chatsService.getChatMessages(chatId, req.user._id.toString());
  }

  @Delete('messages/:messageId')
  deleteMessage(@Param('messageId') messageId: string, @Request() req) {
    return this.chatsService.deleteMessage(messageId, req.user._id.toString());
  }

  @Post(':chatId/members')
  addMembers(@Param('chatId') chatId: string, @Body() body: { memberIds: string[] }, @Request() req) {
    return this.chatsService.addMembersToGroup(chatId, req.user._id.toString(), body.memberIds);
  }

  @Patch(':chatId/name')
  updateGroupName(@Param('chatId') chatId: string, @Body() body: { name: string }, @Request() req) {
    return this.chatsService.updateGroupName(chatId, req.user._id.toString(), body.name);
  }

  @Delete(':chatId')
  deleteChat(@Param('chatId') chatId: string, @Request() req) {
    return this.chatsService.deleteChat(chatId, req.user._id.toString());
  }
}