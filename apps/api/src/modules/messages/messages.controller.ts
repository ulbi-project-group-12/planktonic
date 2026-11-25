import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  ChannelMessagesParams,
  CreateMessageBody,
  GetMessagesQuery,
  GetMessagesResponse,
  HttpErrorResponse,
  MessageResponse,
  ValidationErrorResponse,
} from '@app/contracts';
import { RequireAccess } from '../../core/access/access.decorator.js';
import { ApiZodResponse } from '../../core/openapi/zod-decorators.js';
import { DEFAULT_AUTHOR_ID } from './default-author.js';
import { MessagesService } from './messages.service.js';

/** HTTP adapter only (STACK §3.1): validation here, rules in MessagesService. */
@Controller('channels/:channelId/messages')
@RequireAccess({ kind: 'authenticated' })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /** `201` with the stored message both for a new message and for a retry (UL-126). */
  @Post()
  @HttpCode(201)
  @ApiZodResponse(201, 'The stored message, new or retried', MessageResponse)
  @ApiZodResponse(400, 'The channel id or the body failed its contract', ValidationErrorResponse)
  @ApiZodResponse(404, 'No such channel', HttpErrorResponse)
  @ApiZodResponse(409, 'clientMsgId was already used in another channel', HttpErrorResponse)
  async create(
    @Param({ schema: ChannelMessagesParams }) { channelId }: ChannelMessagesParams,
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
  @ApiZodResponse(400, 'The channel id or the query failed its contract', ValidationErrorResponse)
  @ApiZodResponse(404, 'No such channel', HttpErrorResponse)
  list(
    @Param({ schema: ChannelMessagesParams }) { channelId }: ChannelMessagesParams,
    @Query({ schema: GetMessagesQuery }) query: GetMessagesQuery,
  ): Promise<GetMessagesResponse> {
    return this.messagesService.list(channelId, query);
  }
}
