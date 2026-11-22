import { setupServer } from 'msw/node';
import { createApiHandlers } from '../api-mocks';

/**
 * The MSW server every Vitest file runs against (vitest.setup.ts starts and resets it).
 * Override a response for one test with `server.use(...)`; the override is dropped after the test.
 */
export const server = setupServer(...createApiHandlers());
