import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUTHOR_ID } from './default-author.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';

const CHANNEL = '00000000-0000-7000-8000-000000000001';
const KEY = '019a8f00-0000-7000-8000-000000000004';

describe('MessagesController', () => {
  it('posts with the default author, key and body text and returns only the message', async () => {
    const create = vi.fn().mockResolvedValue({ message: { id: 'x' }, created: false });
    const moduleRef = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [{ provide: MessagesService, useValue: { create } }],
    }).compile();

    const response = await moduleRef
      .get(MessagesController)
      .create({ channelId: CHANNEL }, { clientMsgId: KEY, body: 'hello' });

    expect(response).toEqual({ id: 'x' });
    expect(create).toHaveBeenCalledWith(CHANNEL, DEFAULT_AUTHOR_ID, KEY, 'hello');
  });
});
