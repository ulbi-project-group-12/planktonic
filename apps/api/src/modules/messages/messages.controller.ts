import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  CreateMessageBody,
  GetMessagesQuery,
  type GetMessagesResponse,
  type MessageResponse,
} from '@app/contracts';
import { DEFAULT_AUTHOR_ID } from './default-author.js';
import { MessagesService } from './messages.service.js';

/** HTTP adapter only (STACK §3.1): validation here, rules in MessagesService. */
@Controller('channels/:channelId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /** `201` with the stored message both for a new message and for a retry (UL-126). */
  @Post()
  @HttpCode(201)
  async create(
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body({ schema: CreateMessageBody }) body: CreateMessageBody,
  ): Promise<MessageResponse> {
    const { message } = await this.messagesService.create(
      channelId,
      DEFAULT_AUTHOR_ID,
      body.clientMsgId,
      body.body,
    );
    return message;
  }

  /** `?afterSeq=&limit=` (both optional, strings on the wire; see `GetMessagesQuery`). */
  @Get()
  list(
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Query({ schema: GetMessagesQuery }) query: GetMessagesQuery,
  ): Promise<GetMessagesResponse> {
    return this.messagesService.list(channelId, query);
  }
}
