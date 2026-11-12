import { MessagesRepository, type Message } from './messages.repository.js';

export class MessagesService {
  constructor(private readonly messages: MessagesRepository) {}

  total(): number {
    return this.messages.count();
  }

  describe(message: Message): string {
    return message.id;
  }
}
