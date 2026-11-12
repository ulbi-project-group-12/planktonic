import type { GitHubRepository } from '@app/contracts';
import { MessagesService } from '../messages/messages.service.js';

function Controller(prefix: string): ClassDecorator {
  return () => {
    if (prefix === '') throw new Error('A controller needs a prefix');
  };
}

@Controller('github')
export class GitHubController {
  constructor(private readonly messages: MessagesService) {}

  label(repository: GitHubRepository): string {
    return `${repository.fullName}: ${String(this.messages.total())}`;
  }
}
