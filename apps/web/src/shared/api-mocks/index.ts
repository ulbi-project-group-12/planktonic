// REST mocks for tests, stories and the opt-in dev mode. Application code imports hooks from
// `@/shared/api` and never from here, so MSW and faker stay out of the application bundle.
// The Vitest server is a separate segment, `@/shared/api-mocks-node`: it needs `msw/node`,
// which a browser bundle (Storybook) cannot load.
export * from '../api/generated/api.msw';
export { startApiMocks, type StartApiMocksOptions } from './browser';
export { createApiHandlers } from './handlers';
