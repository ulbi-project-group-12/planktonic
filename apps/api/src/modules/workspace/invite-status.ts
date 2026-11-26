import { GoneException, NotFoundException } from '@nestjs/common';
import type { InviteGoneResponse, InviteNotFoundResponse } from '@app/contracts';

interface InviteState {
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
}

export function requireActiveInvite<T extends InviteState>(invite: T | null, now = new Date()): T {
  if (!invite) {
    const response: InviteNotFoundResponse = {
      statusCode: 404,
      code: 'invite_not_found',
      message: 'Invite not found',
      error: 'Not Found',
    };
    throw new NotFoundException(response);
  }

  const code = invite.revokedAt
    ? 'invite_revoked'
    : invite.consumedAt
      ? 'invite_consumed'
      : invite.expiresAt <= now
        ? 'invite_expired'
        : undefined;

  if (code) {
    const response: InviteGoneResponse = {
      statusCode: 410,
      code,
      message: 'Invite is no longer valid',
      error: 'Gone',
    };
    throw new GoneException(response);
  }
  return invite;
}
