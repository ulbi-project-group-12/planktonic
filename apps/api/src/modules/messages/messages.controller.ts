import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateMessageBody, type GetMessagesResponse, type MessageResponse } from '@app/contracts';
import { DEFAULT_AUTHOR_ID } from './default-author.js';
import { MessagesService } from './messages.service.js';

/** HTTP adapter only (STACK §3.1): validation here, rules in MessagesService. */
@Controller('channels/:channelId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(201)
  create(
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body({ schema: CreateMessageBody }) body: CreateMessageBody,
  ): Promise<MessageResponse> {
    return this.messagesService.create(channelId, DEFAULT_AUTHOR_ID, body.body);
  }

  @Get()
  list(@Param('channelId', new ParseUUIDPipe()) channelId: string): Promise<GetMessagesResponse> {
    return this.messagesService.list(channelId);
  }
}
