let startup: Promise<void> | undefined;
let demoStartup: Promise<void> | undefined;

export function startApiMocks(workerUrl = '/mockServiceWorker.js'): Promise<void> {
  startup ??= start(workerUrl, 'full').catch((error: unknown) => {
    startup = undefined;
    throw error;
  });
  return startup;
}

export function startDemoApiMocks(): Promise<void> {
  demoStartup ??= start('/mockServiceWorker.js', 'demo').catch((error: unknown) => {
    demoStartup = undefined;
    throw error;
  });
  return demoStartup;
}

async function start(workerUrl: string, scenario: 'demo' | 'full'): Promise<void> {
  const [{ setupWorker }, { createApiHandlers, createDemoApiHandlers }] = await Promise.all([
    import('msw/browser'),
    import('./handlers'),
  ]);
  const handlers = scenario === 'demo' ? createDemoApiHandlers() : createApiHandlers();
  const worker = setupWorker(...handlers);
  await worker.start({ serviceWorker: { url: workerUrl }, onUnhandledFrame: 'bypass' });
}
