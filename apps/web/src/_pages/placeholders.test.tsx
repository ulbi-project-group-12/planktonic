import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerifyEmailPage } from './verify-email';
import { ResetPasswordPage } from './auth/reset-password';
import { ProfileSettingsPage } from './account/profile';
import { DevicesSettingsPage } from './account/devices';
import { NotificationSettingsPage } from './account/notifications';
import { AppearanceSettingsPage } from './account/appearance';
import { WorkspaceMembersPage } from './workspace/members';
import { WorkspaceSettingsPage } from './workspace/settings';
import { ProjectMembersPage } from './project/members';

const pages = [
  ['VerifyEmailPage', VerifyEmailPage],
  ['ResetPasswordPage', ResetPasswordPage],
  ['ProfileSettingsPage', ProfileSettingsPage],
  ['DevicesSettingsPage', DevicesSettingsPage],
  ['NotificationSettingsPage', NotificationSettingsPage],
  ['AppearanceSettingsPage', AppearanceSettingsPage],
  ['WorkspaceMembersPage', WorkspaceMembersPage],
  ['WorkspaceSettingsPage', WorkspaceSettingsPage],
  ['ProjectMembersPage', ProjectMembersPage],
] as const;

describe('placeholder pages', () => {
  it.each(pages)('%s renders its stub heading', (_, Page) => {
    render(<Page />);
    expect(screen.getByRole('heading', { name: /Скоро здесь буд[еу]т/ })).toBeInTheDocument();
  });
});
