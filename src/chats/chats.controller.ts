import { Controller, Get, Post, Delete, Param, Body, Request, UseGuards, Patch } from '@nestjs/common';
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

  @Delete(':chatId')
  deleteChat(@Param('chatId') chatId: string, @Request() req) {
    return this.chatsService.deleteChat(chatId, req.user._id.toString());
  }

  // NEW: update group name
  @Patch(':chatId/name')
  updateGroupName(@Param('chatId') chatId: string, @Body('name') name: string, @Request() req) {
    return this.chatsService.updateGroupName(chatId, req.user._id.toString(), name);
  }

  // NEW: remove member from group
  @Delete(':chatId/members/:memberId')
  removeMember(@Param('chatId') chatId: string, @Param('memberId') memberId: string, @Request() req) {
    return this.chatsService.removeMemberFromGroup(chatId, req.user._id.toString(), memberId);
  }

  // NEW: leave group (for regular members)
  @Post(':chatId/leave')
  leaveGroup(@Param('chatId') chatId: string, @Request() req) {
    return this.chatsService.leaveGroup(chatId, req.user._id.toString());
  }
}