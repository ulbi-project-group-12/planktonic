import { WorkspaceSlug } from '@app/contracts';
import { HttpResponse, http } from 'msw';
import { z } from 'zod';
import {
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
  ];
}
