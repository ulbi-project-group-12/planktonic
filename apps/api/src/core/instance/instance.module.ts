import { Global, Module } from '@nestjs/common';
import { instanceIdProvider } from './instance-id.provider.js';

/** Global: health, realtime and later metrics all name the replica by the same `INSTANCE_ID`. */
@Global()
@Module({
  providers: [instanceIdProvider],
  exports: [instanceIdProvider],
})
export class InstanceModule {}
