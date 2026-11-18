import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUTHOR_ID } from './default-author.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';

const CHANNEL = '00000000-0000-7000-8000-000000000001';

describe('MessagesController', () => {
  it('posts with the default author and the validated body text', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'x' });
    const moduleRef = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [{ provide: MessagesService, useValue: { create } }],
    }).compile();

    await moduleRef.get(MessagesController).create(CHANNEL, { body: 'hello' });

    expect(create).toHaveBeenCalledWith(CHANNEL, DEFAULT_AUTHOR_ID, 'hello');
  });
});
