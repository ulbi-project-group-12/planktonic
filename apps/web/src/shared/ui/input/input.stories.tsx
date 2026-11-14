import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from './input';

const meta = {
  title: 'shared/Atoms/Input',
  component: Input,
  args: { placeholder: 'name@example.com', 'aria-label': 'Email' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

// aria-invalid is the error state: danger border and ring (tokens/colors.css).
export const Invalid: Story = { args: { 'aria-invalid': true, defaultValue: 'not-an-email' } };
