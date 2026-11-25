import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { expect, it } from 'vitest';
import { AppModule } from '../../app.module.js';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/public.decorator.js';
import { AccessMetadata } from './access.metadata.js';

it('declares access or public metadata on every application route', async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, DiscoveryModule],
  }).compile();

  try {
    const discovery = moduleRef.get(DiscoveryService);
    const reflector = moduleRef.get(Reflector);
    const scanner = new MetadataScanner();
    const violations: string[] = [];
    let routeCount = 0;

    for (const { instance, metatype } of discovery.getControllers()) {
      if (!metatype || typeof instance !== 'object' || instance === null) continue;
      const prototype = metatype.prototype as Record<string, unknown>;
      for (const name of scanner.getAllMethodNames(prototype)) {
        const handler = prototype[name];
        if (typeof handler !== 'function' || !Reflect.hasMetadata(METHOD_METADATA, handler)) {
          continue;
        }
        routeCount++;
        const targets = [handler, metatype];
        const rule = reflector.getAllAndOverride(AccessMetadata, targets);
        const isPublic = reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets);
        if (Boolean(rule) === Boolean(isPublic)) {
          const path = reflector.get<string | string[]>(PATH_METADATA, handler);
          violations.push(`${metatype.name}.${name} (${String(path)})`);
        }
      }
    }

    expect(routeCount).toBeGreaterThan(0);
    expect(violations, 'Routes must declare exactly one access rule or @Public()').toEqual([]);
  } finally {
    await moduleRef.close();
  }
});
