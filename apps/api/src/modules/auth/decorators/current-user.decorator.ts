import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser, AuthRequest } from '../auth.request.js';

export const CurrentUser = createParamDecorator<undefined, AuthenticatedUser>((_data, context) => {
  const { user } = context.switchToHttp().getRequest<AuthRequest>();
  if (!user) {
    throw new UnauthorizedException();
  }
  return user;
});
