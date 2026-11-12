import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from './input';

const meta = {
  title: 'shared/ui/Input',
  component: Input,
  args: { placeholder: 'name@example.com', 'aria-label': 'Email' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

// The shadcn Input styles aria-invalid as the error state (destructive border and ring).
export const Invalid: Story = { args: { 'aria-invalid': true, defaultValue: 'not-an-email' } };
