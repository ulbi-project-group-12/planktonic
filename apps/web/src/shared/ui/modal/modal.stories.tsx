import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import { Modal, modalSizes, type ModalAction, type ModalSize } from './modal';

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-app p-6">
      <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

/** Кнопка-триггер + управляемая модалка в одном примере. */
function ModalDemo({
  label,
  title,
  size = 'm',
  primaryAction,
  secondaryAction,
  children,
}: {
  label: string;
  title: string;
  size?: ModalSize;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  return (
    <div className="flex min-w-0 flex-col items-start gap-3">
      <Button
        variant="secondary"
        size="s"
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Modal
        isShown={open}
        onClose={close}
        title={title}
        size={size}
        primaryAction={primaryAction ? { ...primaryAction, onClick: close } : undefined}
        secondaryAction={secondaryAction ? { ...secondaryAction, onClick: close } : undefined}
      >
        {children}
      </Modal>
    </div>
  );
}

function ConfirmExample() {
  return (
    <ModalDemo
      label="Подтверждение — destructive"
      title="Удалить канал?"
      size="s"
      secondaryAction={{ label: 'Отмена' }}
      primaryAction={{ label: 'Удалить', palette: 'danger' }}
    >
      История будет удалена безвозвратно.
    </ModalDemo>
  );
}

function FormExample() {
  return (
    <ModalDemo
      label="Форма — создание задачи"
      title="Новая задача"
      secondaryAction={{ label: 'Отмена' }}
      primaryAction={{ label: 'Создать' }}
    >
      <div className="flex flex-col gap-3">
        <Input label="Название задачи" placeholder="Название задачи" />
        <Input label="Исполнитель" placeholder="Исполнитель" />
      </div>
    </ModalDemo>
  );
}

function SettingsExample() {
  const [notifications, setNotifications] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  return (
    <ModalDemo label="Настройки — без футера" title="# дизайн" size="s">
      <div className="flex flex-col gap-3">
        <Switch
          checked={notifications}
          onCheckedChange={(checked) => {
            setNotifications(checked);
          }}
          label="Уведомления"
        />
        <Switch
          checked={isPrivate}
          onCheckedChange={(checked) => {
            setIsPrivate(checked);
          }}
          label="Приватный"
        />
      </div>
    </ModalDemo>
  );
}

function SizesExample() {
  const [openSize, setOpenSize] = useState<ModalSize | null>(null);
  const close = () => {
    setOpenSize(null);
  };
  return (
    <div className="flex flex-wrap items-start gap-3">
      {modalSizes.map((size) => (
        <Button
          key={size}
          variant="secondary"
          size="s"
          onClick={() => {
            setOpenSize(size);
          }}
        >
          {size.toUpperCase()} — {size === 's' ? 400 : size === 'm' ? 560 : 720}
        </Button>
      ))}
      {modalSizes.map((size) => (
        <Modal
          key={size}
          isShown={openSize === size}
          onClose={close}
          title={`Размер ${size.toUpperCase()}`}
          size={size}
          primaryAction={{ label: 'Понятно', onClick: close }}
        >
          Ширина окна на десктопе — {size === 's' ? 400 : size === 'm' ? 560 : 720} px. Мобильная
          шторка всегда во всю ширину экрана.
        </Modal>
      ))}
    </div>
  );
}

function ModalSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Диалоги — overlay + card">
        <div className="flex flex-wrap items-start gap-6">
          <ConfirmExample />
          <FormExample />
          <SettingsExample />
        </div>
      </Card>
      <Card label="Размеры — S 400 · M 560 · L 720 (desktop)">
        <SizesExample />
      </Card>
      <p className="text-[11px] text-fg-muted">
        bg/overlay #0F121C 48% · radius 16 · z/modal 50 · Esc и клик по оверлею закрывают · focus
        trap внутри · до 1023 px шторка снизу со смахиванием вниз, от 1024 px окно по центру с
        крестиком
      </p>
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — модалки</h3>
        <ModalSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Modal',
  component: Modal,
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  // Демо-модалки управляют своим стейтом сами; args нужен только из-за
  // обязательного isShown в типе истории.
  args: { isShown: false },
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
    isShown: true,
    title: 'Новая задача',
    size: 'm',
    children: 'Тело модалки: описание, форма или настройки.',
    secondaryAction: { label: 'Отмена' },
    primaryAction: { label: 'Создать' },
  },
  argTypes: {
    size: { control: 'select', options: modalSizes },
  },
};
