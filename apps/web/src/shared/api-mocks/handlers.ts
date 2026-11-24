import { WorkspaceSlug } from '@app/contracts';
import { HttpResponse, http } from 'msw';
import { z } from 'zod';
import {
  getAuthLoginMockHandler,
  getAuthMeMockHandler,
  getAuthRegisterMockHandler,
  getHealthLiveMockHandler,
  getHealthReadyMockHandler,
  getMessagesCreateMockHandler,
  getMessagesListMockHandler,
} from '../api/generated/api.msw';

/**
 * Workspace requests and responses live here until UL-143 lands the real contracts and the
 * OpenAPI schema gains the endpoints — then Orval regenerates the handlers and this block goes.
 */
const CreateWorkspaceRequest = z.object({
  name: z.string().trim().min(1).max(80),
  slug: WorkspaceSlug,
});

interface MockWorkspace {
  id: string;
  name: string;
  slug: string;
}

/**
 * Email verification requests and responses live here until UL-158 lands the real contract and
 * the OpenAPI schema gains the endpoints — then Orval regenerates the handlers and this block
 * goes. UL-224 builds the screens against it, so the schema stays in the mock, not in components.
 */
const VerifyEmailRequest = z.object({
  token: z.string().min(1),
});

const RESEND_AFTER_SEC = 60;

/**
 * POST /api/auth/verify-email + POST /api/auth/verify-email/resend over in-memory state (per
 * handler set). Fixed tokens give every outcome deterministically: 'valid' confirms once, then
 * the consumed set reads as already used — that is what the second open of the same link gets;
 * 'used' is consumed up front, 'expired' and any other token are a dead link. Resends are limited
 * per session key (the bearer token, 'anonymous' without one): the first call sends the letter
 * and reports the pause, a call inside the pause answers 429 with the remaining seconds.
 */
function createEmailVerificationHandlers() {
  const consumedTokens = new Set<string>();
  const lastResendAt = new Map<string, number>();

  return [
    http.post('*/api/auth/verify-email', async ({ request }) => {
      const parsed = VerifyEmailRequest.safeParse(await request.json());
      if (!parsed.success) {
        return HttpResponse.json(
          {
            statusCode: 400,
            message: 'Validation failed',
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
          { status: 400 },
        );
      }
      const { token } = parsed.data;
      if (consumedTokens.has(token) || token === 'used') {
        return HttpResponse.json(
          {
            statusCode: 409,
            message: 'Email verification link has already been used',
            error: 'Conflict',
          },
          { status: 409 },
        );
      }
      if (token !== 'valid') {
        // 'expired' and any token the api would not recognise: the link is dead either way.
        return HttpResponse.json(
          {
            statusCode: 410,
            message: 'Email verification link has expired or is invalid',
            error: 'Gone',
          },
          { status: 410 },
        );
      }
      consumedTokens.add(token);
      return HttpResponse.json({ status: 'confirmed' });
    }),
    http.post('*/api/auth/verify-email/resend', ({ request }) => {
      const key = request.headers.get('authorization') ?? 'anonymous';
      const lastSent = lastResendAt.get(key);
      const now = Date.now();
      if (lastSent !== undefined && now - lastSent < RESEND_AFTER_SEC * 1000) {
        const retryAfterSec = Math.ceil((RESEND_AFTER_SEC * 1000 - (now - lastSent)) / 1000);
        return HttpResponse.json(
          {
            statusCode: 429,
            message: 'Too many requests',
            error: 'Too Many Requests',
            retryAfterSec,
          },
          { status: 429 },
        );
      }
      lastResendAt.set(key, now);
      return HttpResponse.json({ resendAfterSec: RESEND_AFTER_SEC });
    }),
  ];
}

const currentUser = {
  id: '019a8f00-0000-7000-8000-000000000004',
  name: 'Ada',
  email: 'ada@example.com',
};

/** POST /api/workspaces + GET /api/workspaces over an in-memory list (per handler set). */
function createWorkspaceHandlers() {
  const workspaces = new Map<string, MockWorkspace>();

  return [
    http.get('*/api/workspaces', ({ request }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
      const list = [...workspaces.values()];
      if (!q) return HttpResponse.json(list);
      return HttpResponse.json(
        list.filter(
          (workspace) =>
            workspace.name.toLowerCase().includes(q) || workspace.slug.toLowerCase().includes(q),
        ),
      );
    }),
    http.post('*/api/workspaces', async ({ request }) => {
      const parsed = CreateWorkspaceRequest.safeParse(await request.json());
      if (!parsed.success) {
        return HttpResponse.json(
          {
            statusCode: 400,
            message: 'Validation failed',
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
          { status: 400 },
        );
      }
      const { name, slug } = parsed.data;
      if (workspaces.has(slug)) {
        // Same shape as the registration conflict (register.service.ts): issues carry the field.
        return HttpResponse.json(
          {
            statusCode: 409,
            message: `Workspace slug "${slug}" is already taken`,
            error: 'Conflict',
            issues: [{ path: 'slug', message: 'This slug is already taken' }],
          },
          { status: 409 },
        );
      }
      const workspace: MockWorkspace = { id: crypto.randomUUID(), name, slug };
      workspaces.set(slug, workspace);
      return HttpResponse.json(workspace, { status: 201 });
    }),
  ];
}

/**
 * The default mock of every REST operation: Vitest, Storybook and the dev app (with
 * NEXT_PUBLIC_API_MOCKING=true) all start from this set. Responses that screens show by default
 * are fixed here; the rest come from the generated faker factories.
 */
export function createApiHandlers() {
  return [
    getAuthLoginMockHandler({ accessToken: 'msw-access-token' }),
    getAuthMeMockHandler(currentUser),
    getAuthRegisterMockHandler({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
    }),
    getHealthLiveMockHandler({
      status: 'ok',
      info: {},
      error: {},
      details: {},
      instanceId: 'msw-demo',
    }),
    getHealthReadyMockHandler(),
    getMessagesCreateMockHandler(),
    getMessagesListMockHandler(),
    ...createWorkspaceHandlers(),
    ...createEmailVerificationHandlers(),
  ];
}
