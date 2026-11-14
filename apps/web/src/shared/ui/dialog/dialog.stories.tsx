import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

const meta = {
  title: 'shared/Atoms/Dialog',
  component: Dialog,
  args: { defaultOpen: false },
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button type="button">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive the channel?</DialogTitle>
          <DialogDescription>
            Members keep read access to its history. You can restore it later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="button">Archive</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Only the trigger is visible; clicking it opens the dialog.
export const Closed: Story = {};

// Rendered open: title, description and footer buttons over the overlay.
export const Open: Story = { args: { defaultOpen: true } };
