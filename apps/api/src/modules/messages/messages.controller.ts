import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  CreateMessageBody,
  GetMessagesQuery,
  GetMessagesResponse,
  MessageResponse,
} from '@app/contracts';
import { ApiZodResponse } from '../../core/openapi/zod-decorators.js';
import { DEFAULT_AUTHOR_ID } from './default-author.js';
import { MessagesService } from './messages.service.js';

/** HTTP adapter only (STACK §3.1): validation here, rules in MessagesService. */
@Controller('channels/:channelId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /** `201` with the stored message both for a new message and for a retry (UL-126). */
  @Post()
  @HttpCode(201)
  @ApiZodResponse(201, 'The stored message, new or retried', MessageResponse)
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
  @ApiZodResponse(200, 'One page of the channel, oldest first', GetMessagesResponse)
  list(
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Query({ schema: GetMessagesQuery }) query: GetMessagesQuery,
  ): Promise<GetMessagesResponse> {
    return this.messagesService.list(channelId, query);
  }
}
