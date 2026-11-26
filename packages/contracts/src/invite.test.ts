import { describe, expect, it } from 'vitest';
import {
  AcceptInviteOutcomeSchema,
  InviteGoneResponseSchema,
  InviteNotFoundResponseSchema,
} from './index.js';

describe('AcceptInviteOutcomeSchema', () => {
  it.each(['joined', 'already_member'])('accepts %s with a workspace slug', (outcome) => {
    const response = { workspaceSlug: 'my-team', outcome };
    expect(AcceptInviteOutcomeSchema.parse(response)).toEqual(response);
  });

  it('requires a recognized outcome', () => {
    expect(AcceptInviteOutcomeSchema.safeParse({ workspaceSlug: 'my-team' }).success).toBe(false);
    expect(
      AcceptInviteOutcomeSchema.safeParse({ workspaceSlug: 'my-team', outcome: 'pending' }).success,
    ).toBe(false);
  });
});

describe('invite error responses', () => {
  const notFound = {
    statusCode: 404,
    code: 'invite_not_found',
    message: 'Invite not found',
    error: 'Not Found',
  };
  const gone = { statusCode: 410, message: 'Invite is no longer valid', error: 'Gone' };

  it('accepts a 404 for an unknown invitation', () => {
    expect(InviteNotFoundResponseSchema.parse(notFound)).toEqual(notFound);
  });

  it.each(['invite_expired', 'invite_consumed', 'invite_revoked'])(
    'accepts a 410 with code %s',
    (code) => {
      const response = { ...gone, code };
      expect(InviteGoneResponseSchema.parse(response)).toEqual(response);
    },
  );

  it('rejects mismatched status and reason pairs', () => {
    expect(InviteGoneResponseSchema.safeParse({ ...gone, code: notFound.code }).success).toBe(
      false,
    );
    expect(
      InviteNotFoundResponseSchema.safeParse({ ...notFound, code: 'invite_expired' }).success,
    ).toBe(false);
  });
});
