import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { createApiHandlers } from './src/shared/api/mocks/handlers';

const server = setupServer(...createApiHandlers());
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});

// jsdom не реализует Pointer Events полностью — radix (Toast и др.) зовёт hasPointerCapture.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
}

// Vitest runs without globals, so RTL cannot register its own cleanup.
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
