// REST and data helpers shared by the integration specs.
import { randomUUID, randomUUIDv7 } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { PrismaClient } from '../../../src/generated/prisma/client.js';

/** A new channel with a unique name; the stand's reset removes it before the next test. */
export async function createChannel(prisma: PrismaClient): Promise<string> {
  const channel = await prisma.channel.create({ data: { name: `it-${randomUUID()}` } });
  return channel.id;
}

/** `POST /api/channels/:id/messages` with a fresh idempotency key unless one is given. */
export async function postMessage(
  app: INestApplication,
  channelId: string,
  body: string,
  clientMsgId: string = randomUUIDv7(),
): Promise<Response> {
  return fetch(`${await app.getUrl()}/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientMsgId, body }),
  });
}

/** `GET /api/channels/:id/messages`. */
export async function getMessages(app: INestApplication, channelId: string): Promise<Response> {
  return fetch(`${await app.getUrl()}/api/channels/${channelId}/messages`);
}
