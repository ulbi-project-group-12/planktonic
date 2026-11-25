import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { InviteMemberDialog } from './invite-member-dialog';

/**
 * UL-220 «Пригласить» window on the default MSW mocks: the link is a fresh token
 * from POST /api/workspaces/:slug/invites. Role select is bounded by the inviter.
 */
const meta = {
  title: 'Widgets/InviteMemberDialog',
  component: InviteMemberDialog,
} satisfies Meta<typeof InviteMemberDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Owner: Story = {
  args: {
    isShown: true,
    onClose: () => undefined,
    workspaceSlug: 'demo-hq',
    inviterRole: 'OWNER',
  },
};

export const Admin: Story = {
  args: {
    ...Owner.args,
    inviterRole: 'ADMIN',
  },
};
