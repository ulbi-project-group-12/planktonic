// A namespace import must stay legal outside the Prisma owners.
import * as messages from './messages/messages.service.js';

function Module(meta: { providers: unknown[] }): ClassDecorator {
  return () => {
    if (meta.providers.length === 0) throw new Error('A module needs providers');
  };
}

@Module({ providers: [messages.MessagesService] })
export class AppModule {}
