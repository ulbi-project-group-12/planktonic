import {
  getAuthRegisterMockHandler,
  getHealthLiveMockHandler,
  getHealthReadyMockHandler,
  getMessagesCreateMockHandler,
  getMessagesListMockHandler,
} from '../api/generated/api.msw';

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
  ];
}
