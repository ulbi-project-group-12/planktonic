import { http, passthrough } from 'msw';
import {
  getAuthRegisterMockHandler,
  getHealthLiveMockHandler,
  getHealthReadyMockHandler,
  getMessagesCreateMockHandler,
  getMessagesListMockHandler,
} from '../generated/api.msw';
import { API_DEMO_MOCK_HEADER } from './demo-config';

function createHealthDemoHandler() {
  return getHealthLiveMockHandler({
    status: 'ok',
    info: {},
    error: {},
    details: {},
    instanceId: 'msw-demo',
  });
}

export function createDemoApiHandlers() {
  return [
    http.get('*/api/health', ({ request }) => {
      // An undefined response lets MSW try the generated handler next.
      return request.headers.get(API_DEMO_MOCK_HEADER) === 'true' ? undefined : passthrough();
    }),
    createHealthDemoHandler(),
  ];
}

export function createApiHandlers() {
  return [
    getAuthRegisterMockHandler({
      id: '019a8f00-0000-7000-8000-000000000004',
      name: 'Ada',
      email: 'ada@example.com',
    }),
    createHealthDemoHandler(),
    getHealthReadyMockHandler(),
    getMessagesCreateMockHandler(),
    getMessagesListMockHandler(),
  ];
}
