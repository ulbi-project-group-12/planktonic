// REST and data helpers shared by the integration specs.
import { randomUUID, randomUUIDv7 } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../../src/core/config/env.js';
import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { DEFAULT_AUTHOR_ID } from '../../../src/modules/messages/default-author.js';

/** Authenticate as the active fixture user seeded by resetData. */
function authorization(app: INestApplication): string {
  const secret = app.get(ConfigService<Env, true>).get('JWT_ACCESS_SECRET', { infer: true });
  const token = app
    .get(JwtService)
    .sign({ sub: DEFAULT_AUTHOR_ID, tokenVersion: 0 }, { secret, expiresIn: '15m' });
  return `Bearer ${token}`;
}

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
    headers: { 'content-type': 'application/json', authorization: authorization(app) },
    body: JSON.stringify({ clientMsgId, body }),
  });
}

/**
 * `GET /api/channels/:id/messages`, with an optional query such as `{ afterSeq: '41' }`. Keys whose
 * value is `undefined` are left out.
 */
export async function getMessages(
  app: INestApplication,
  channelId: string,
  query: Readonly<Record<string, string | undefined>> = {},
): Promise<Response> {
  const entries = Object.entries(query).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );
  const search = new URLSearchParams(entries).toString();
  const suffix = search === '' ? '' : `?${search}`;
  return fetch(`${await app.getUrl()}/api/channels/${channelId}/messages${suffix}`, {
    headers: { authorization: authorization(app) },
  });
}
