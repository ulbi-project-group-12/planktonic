import type { Message } from '../generated/prisma/client.js';

export function onMessage(message: Message): string {
  return message.id;
}
