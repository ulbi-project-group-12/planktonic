import type { MessageResponse } from '@app/contracts';

/** The channel `pnpm db:seed` creates; the prototype page shows only this one. */
export const PROTOTYPE_CHANNEL_ID = '00000000-0000-7000-8000-000000000001';

/** Ascending by `seq`. It is a decimal string past 2^53, so neither Number nor string compare. */
function bySeq(a: MessageResponse, b: MessageResponse): number {
  const left = BigInt(a.seq);
  const right = BigInt(b.seq);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Union of two message lists by `id`, sorted by `seq` ascending. A later copy wins (incoming over
 * current, and later inside incoming), so the `POST` response and the sender's own `message:new`
 * collapse into one row whichever comes first (UL-127). Neither input is mutated; an empty
 * `incoming` returns `current` itself so React can skip the render.
 */
export function mergeMessages(
  current: readonly MessageResponse[],
  incoming: readonly MessageResponse[],
): readonly MessageResponse[] {
  if (incoming.length === 0) return current;
  const byId = new Map<string, MessageResponse>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(bySeq);
}

export interface FeedAction {
  type: 'merge';
  messages: readonly MessageResponse[];
}

/** Every history load, live event and `POST` response goes through `mergeMessages`. */
export function feedReducer(
  state: readonly MessageResponse[],
  action: FeedAction,
): readonly MessageResponse[] {
  return mergeMessages(state, action.messages);
}
