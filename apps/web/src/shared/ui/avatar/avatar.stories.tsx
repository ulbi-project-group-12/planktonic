import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar, AvatarGroup, avatarSizes, presenceList, type Presence } from './avatar';

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    // фон surface: кольцо 2 px у presence совпадает с подложкой и не читается как бордер
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="mb-6 text-xs font-medium tracking-wider text-fg-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

function SizeItem({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      {children}
      <div className="text-[11px] whitespace-nowrap text-fg-muted">{caption}</div>
    </div>
  );
}

const sizeCaptions: Record<string, string> = {
  sm: '24 px — инициалы 10',
  md: '32 px — списки, сообщения',
  lg: '40 px — шапка, presence',
  xl: '48 px — профиль',
};

const presenceNames: Record<Presence, string> = {
  online: 'Александр Кузнецов',
  away: 'Мария Светлова',
  dnd: 'Дмитрий Волков',
  offline: 'Иван Петров',
};

const groupUsers = [
  { name: 'Александр Кузнецов' },
  { name: 'Мария Светлова' },
  { name: 'Дмитрий Волков' },
  { name: 'Иван Петров' },
  { name: 'Ольга Смирнова' },
  { name: 'Пётр Соколов' },
];

function AvatarSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Размеры — radius full, цвет по имени">
        <div className="flex flex-wrap items-end gap-6">
          {avatarSizes.map((size) => (
            <SizeItem key={size} caption={sizeCaptions[size] ?? size}>
              <Avatar name="Александр Кузнецов" size={size} />
            </SizeItem>
          ))}
          <SizeItem caption="без имени — «?»">
            <Avatar name="" size="lg" />
          </SizeItem>
        </div>
      </Card>
      <Card label="Presence — dot 12 · кольцо surface 2 px">
        <div className="flex flex-wrap items-center gap-6">
          {presenceList.map((presence) => (
            <div key={presence} className="flex items-center gap-2.5">
              <Avatar name={presenceNames[presence]} size="lg" presence={presence} />
              <span className="text-sm text-fg-secondary">
                {
                  { online: 'В сети', away: 'Отошёл', dnd: 'Не беспокоить', offline: 'Не в сети' }[
                    presence
                  ]
                }
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card label="Группы — overlap 10 · «+N»">
        <div className="flex flex-wrap items-center gap-8">
          <AvatarGroup users={groupUsers.slice(0, 3)} size="sm" />
          <AvatarGroup users={groupUsers} max={3} size="md" />
          <div className="flex items-center gap-2.5">
            <AvatarGroup users={groupUsers} max={1} size="lg" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-fg-primary">Иван Петров</span>
              <span className="text-xs text-fg-muted">В сети</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ThemeBlock({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={theme === 'dark' ? 'dark' : undefined}>
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-6 text-base font-bold text-fg-primary">
          {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
        </h2>
        <h3 className="mb-4 text-xl font-bold text-fg-primary">Атомы — аватары</h3>
        <AvatarSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Avatar',
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  args: { name: 'Александр Кузнецов' },
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="flex flex-col gap-10 bg-app p-8 font-sans">
      <ThemeBlock theme="light" />
      <ThemeBlock theme="dark" />
    </div>
  ),
};

export const Playground: Story = {
  args: {
    name: 'Александр Кузнецов',
    size: 'md',
    src: '',
  },
  argTypes: {
    size: { control: 'select', options: avatarSizes },
    presence: { control: 'select', options: [...presenceList, null] },
  },
};
