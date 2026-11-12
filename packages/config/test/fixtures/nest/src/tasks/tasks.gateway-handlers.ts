import * as messages from '../messages/index.js';
import type { Helper } from '../test/db.js';

export type Repo = messages.MessagesRepository;
export type Db = Helper;

export async function load(): Promise<unknown> {
  return import('./tasks.service.js');
}
