import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from './src/shared/api-mocks-node';

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});
// Generated mock data is the same in every run and does not depend on test order.
beforeEach(() => {
  faker.seed(1);
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
