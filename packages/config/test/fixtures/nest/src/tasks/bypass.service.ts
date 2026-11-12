import * as core from '../core/prisma/index.js';
export * from '../core/prisma/index.js';
export type Client = import('../generated/prisma/client.js').PrismaClient;

export class BypassService {
  constructor(readonly db: core.PrismaService) {}

  async load(): Promise<unknown> {
    return import('../generated/prisma/client.js');
  }
}
