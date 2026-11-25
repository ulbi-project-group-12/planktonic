import { applyDecorators, UseGuards } from '@nestjs/common';
import { AccessGuard } from './access.guard.js';
import { AccessMetadata, type RouteAccess } from './access.metadata.js';

export function RequireAccess(rule: RouteAccess) {
  // AuthGuard is global. Only routes with an ACL permission need AccessGuard as well.
  const metadata = AccessMetadata(rule);
  return rule.kind === 'authenticated'
    ? metadata
    : applyDecorators(metadata, UseGuards(AccessGuard));
}
