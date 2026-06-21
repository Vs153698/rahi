import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { RequestContext } from './auth-context';

/**
 * Injects the authenticated caller's RequestContext (set by JwtAuthGuard).
 * Controllers pass this to repositories so every query is user-scoped.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const req = ctx.switchToHttp().getRequest<{ user?: { id: string } }>();
    return { userId: req.user?.id ?? '' };
  },
);
