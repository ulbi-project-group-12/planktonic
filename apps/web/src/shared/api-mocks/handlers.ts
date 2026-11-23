import { WorkspaceSlug } from '@app/contracts';
import { HttpResponse, http } from 'msw';
import { z } from 'zod';
import {
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

const InviteRole = z.enum(['MEMBER', 'ADMIN']);
const CreateInviteRequest = z.object({ role: InviteRole });

interface MockInvite {
  token: string;
  workspaceSlug: string;
  role: z.infer<typeof InviteRole>;
  used: boolean;
}

/**
 * POST /api/workspaces + GET /api/workspaces + the UL-220 invite endpoints over an
 * in-memory list (per handler set). Until UL-148 lands the real invite contract,
 * the link payload is a random token and the join payload is just the slug back.
 */
function createWorkspaceHandlers() {
  const workspaces = new Map<string, MockWorkspace>();
  const invites = new Map<string, MockInvite>();

  return [
    http.get('*/api/workspaces', () => HttpResponse.json([...workspaces.values()])),
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
    http.post('*/api/workspaces/:slug/invites', async ({ request, params }) => {
      const parsed = CreateInviteRequest.safeParse(await request.json());
      if (!parsed.success) {
        return HttpResponse.json(
          { statusCode: 400, message: 'Validation failed', error: 'Bad Request' },
          { status: 400 },
        );
      }
      const token = Math.random().toString(36).slice(2, 8);
      invites.set(token, {
        token,
        workspaceSlug: String(params.slug),
        role: parsed.data.role,
        used: false,
      });
      return HttpResponse.json({ token, role: parsed.data.role }, { status: 201 });
    }),
    http.get('*/api/invites/:token', ({ params }) => {
      const invite = invites.get(String(params.token));
      if (!invite || invite.used) {
        return HttpResponse.json(
          { statusCode: 404, message: 'Invite not found', error: 'Not Found' },
          { status: 404 },
        );
      }
      return HttpResponse.json({
        workspaceName: workspaces.get(invite.workspaceSlug)?.name ?? invite.workspaceSlug,
        workspaceSlug: invite.workspaceSlug,
        role: invite.role,
      });
    }),
    // The link is single-use: the first accept consumes the token (ADR-0002 §2).
    http.post('*/api/invites/:token/accept', ({ params }) => {
      const invite = invites.get(String(params.token));
      if (!invite || invite.used) {
        return HttpResponse.json(
          { statusCode: 410, message: 'Invite is no longer valid', error: 'Gone' },
          { status: 410 },
        );
      }
      invite.used = true;
      return HttpResponse.json({ workspaceSlug: invite.workspaceSlug });
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
    getAuthRegisterMockHandler({
      id: '019a8f00-0000-7000-8000-000000000004',
      name: 'Ada',
      email: 'ada@example.com',
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
  ];
}
