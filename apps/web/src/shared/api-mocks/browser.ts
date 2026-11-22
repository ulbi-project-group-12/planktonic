import { faker } from '@faker-js/faker';
import type { RequestHandler } from 'msw';
import type { SetupWorker } from 'msw/browser';
import { createApiHandlers } from './handlers';

export interface StartApiMocksOptions {
  /** Where the worker script is served from; Storybook serves it next to iframe.html. */
  workerUrl?: string;
  /** Handlers that take precedence over the default set, for one story or one scenario. */
  handlers?: RequestHandler[];
}

let startup: Promise<SetupWorker> | undefined;

/**
 * Starts the MSW browser worker with the full REST mock set (once per page) and applies
 * `handlers` on top. Each call replaces the overrides of the previous call. Requests without
 * a handler (pages, assets, the realtime socket) go to the network.
 */
export async function startApiMocks({
  workerUrl = '/mockServiceWorker.js',
  handlers = [],
}: StartApiMocksOptions = {}): Promise<void> {
  startup ??= start(workerUrl).catch((error: unknown) => {
    startup = undefined;
    throw error;
  });
  const worker = await startup;
  worker.resetHandlers();
  worker.use(...handlers);
}

async function start(workerUrl: string): Promise<SetupWorker> {
  // Loaded on demand: `msw/browser` does not resolve under Node, where tests import this module.
  const { setupWorker } = await import('msw/browser');
  // The same generated data on every load: stories and manual checks stay comparable.
  faker.seed(1);
  const worker = setupWorker(...createApiHandlers());
  await worker.start({ serviceWorker: { url: workerUrl }, onUnhandledFrame: 'bypass' });
  return worker;
}
