import { hostname } from 'node:os';

export const INSTANCE_ID = Symbol('INSTANCE_ID');

export const instanceIdProvider = {
  provide: INSTANCE_ID,
  useFactory: (): string => hostname(),
};
