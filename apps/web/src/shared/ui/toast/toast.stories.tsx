import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '@/shared/ui/button';
import { Toast, toastPalettes, ToastProvider } from './toast';
import { DEFAULT_TOAST_DURATION_MS, toast } from './toast-store';
import { Toaster } from './toaster';

/** Theme card with a button: on click the toast flies to the shared fixed viewport bottom-right. */
function ToastSpec({ theme, onShow }: { theme: 'light' | 'dark'; onShow: () => void }) {
  return (
    <div className={theme === 'dark' ? 'dark' : undefined}>
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-6 text-base font-bold text-fg-primary">
          {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
        </h2>
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — тосты</h3>
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-line bg-app p-6">
            <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
              Живой пример — сколько кликов, столько тостов · стек друг под другом
            </div>
            <Button onClick={onShow}>Показать тост</Button>
          </div>
          <p className="text-[11px] text-fg-muted">
            палитры: success — иконка success · danger — ошибка + повтор · info — события github ·
            warning — дедлайны, лимиты
          </p>
          <p className="text-[11px] text-fg-muted">
            в приложении: один раз {'<Toaster />'} в корне + вызов toast({'{...}'}) из любого места
          </p>
        </div>
      </div>
    </div>
  );
}

/** Both theme blocks share one fixed viewport; the toast theme is set by the wrapper with the dark class. */
function ToastSpecDemo() {
  const [items, setItems] = useState<{ id: number; open: boolean; dark: boolean }[]>([]);
  const counterRef = useRef(0);

  const show = (dark: boolean) => {
    counterRef.current += 1;
    const id = counterRef.current;
    setItems((prev) => [...prev, { id, open: true, dark }]);
    // as in the app: the toast goes away on its own unless explicitly closed
    window.setTimeout(() => {
      dismiss(id);
    }, DEFAULT_TOAST_DURATION_MS);
  };

  const dismiss = (id: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, open: false } : item)));
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 180);
  };

  return (
    <>
      <ToastSpec
        theme="light"
        onShow={() => {
          show(false);
        }}
      />
      <ToastSpec
        theme="dark"
        onShow={() => {
          show(true);
        }}
      />
      <ToastProvider viewportLabel="Уведомления — живой пример">
        {items.map((item) => (
          <div key={item.id} className={item.dark ? 'dark' : undefined}>
            <Toast
              open={item.open}
              onOpenChange={(open) => {
                if (!open) dismiss(item.id);
              }}
              palette="success"
              title="Задача создана"
              description={`Тост ${String(item.id)} — стек друг под другом`}
              action={{ label: 'Открыть', onClick: fn() }}
            />
          </div>
        ))}
      </ToastProvider>
    </>
  );
}

/** Static viewport in flow: toasts are shown next to the row caption. */
const statesViewport = 'static z-auto w-full max-w-full flex-row flex-wrap gap-2 p-0';

/** All states — static, no auto-dismiss. Landmark labels need a suffix: the States story
 *  renders this block in both theme blocks, and viewport labels must stay unique per page. */
function ToastStates({ labelSuffix = '' }: { labelSuffix?: string }) {
  const noop = () => undefined;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[120px_1fr] items-center gap-4">
        <span className="text-[11px] text-fg-muted">Базовый</span>
        <ToastProvider
          viewportClassName={statesViewport}
          viewportLabel={`Уведомления — базовый${labelSuffix}`}
        >
          {toastPalettes.map((palette) => (
            <Toast
              key={palette}
              open
              onOpenChange={noop}
              duration={Infinity}
              palette={palette}
              title={
                {
                  success: 'Задача создана',
                  danger: 'Не отправлено',
                  info: 'PR #128 влит',
                  warning: 'Срок завтра',
                }[palette]
              }
            />
          ))}
        </ToastProvider>
      </div>
      <div className="grid grid-cols-[120px_1fr] items-center gap-4">
        <span className="text-[11px] text-fg-muted">С описанием</span>
        <ToastProvider
          viewportClassName={statesViewport}
          viewportLabel={`Уведомления — с описанием${labelSuffix}`}
        >
          {toastPalettes.map((palette) => (
            <Toast
              key={palette}
              open
              onOpenChange={noop}
              duration={Infinity}
              palette={palette}
              title={
                {
                  success: 'Сводка готова',
                  danger: 'Генерация не удалась',
                  info: 'Стендап через 15 мин',
                  warning: 'Лимит файла 25 МБ',
                }[palette]
              }
              description={
                {
                  success: 'ИИ собрал отчёт за неделю',
                  danger: 'Попробуйте ещё раз позже',
                  info: 'Ответы собираются до 12:00',
                  warning: 'Сожмите изображение',
                }[palette]
              }
            />
          ))}
        </ToastProvider>
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Toast',
  component: Toast,
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  // renders the light and dark blocks itself, so the toolbar theme is locked to light
  globals: { theme: 'light' },
  args: { open: true, onOpenChange: fn(), title: 'Задача создана' },
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="flex flex-col gap-10 bg-app p-8 font-sans">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} className={theme === 'dark' ? 'dark' : undefined}>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="mb-4 text-body-l font-bold text-fg-primary">
              Атомы — тосты · состояния · {theme === 'dark' ? 'Dark' : 'Light'}
            </h3>
            <ToastStates labelSuffix={theme === 'dark' ? ' · Dark' : ''} />
          </div>
        </div>
      ))}
      <ToastSpecDemo />
    </div>
  ),
};

export const Playground: Story = {
  args: {
    defaultOpen: true,
    onOpenChange: fn(),
    palette: 'success',
    title: 'Задача создана',
    description: 'PL-42 в колонке «Нужно сделать»',
    action: { label: 'Открыть', onClick: fn() },
    duration: 5000,
  },
  argTypes: {
    palette: { control: 'select', options: toastPalettes },
    title: { control: 'text' },
    description: { control: 'text' },
    duration: { control: 'number' },
    defaultOpen: { control: 'boolean' },
    onOpenChange: { control: false },
    action: { control: false },
  },
  decorators: [
    (StoryComponent) => (
      <ToastProvider>
        <StoryComponent />
      </ToastProvider>
    ),
  ],
};

/** Imperative usage, as in the app: Toaster at the root + toast(). */
export const Imperative: StoryObj = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 bg-app p-10 font-sans">
      <Toaster />
      {toastPalettes.map((palette) => (
        <Button
          key={palette}
          size="s"
          variant="secondary"
          onClick={() => {
            toast({
              palette,
              title: {
                success: 'Задача создана',
                danger: 'Не отправлено',
                info: 'PR #128 влит',
                warning: 'Срок завтра',
              }[palette],
              description: 'Появляется через Toaster в корне приложения',
              action: { label: 'Открыть', onClick: fn() },
            });
          }}
        >
          toast({palette})
        </Button>
      ))}
      <Button
        size="s"
        onClick={() => {
          ['Задача создана', 'PR #128 влит', 'Сводка готова'].forEach((title, index) => {
            window.setTimeout(() => {
              toast({
                palette: (['success', 'info', 'warning'] as const)[index],
                title,
                description: `Тост ${String(index + 1)} из 3 — стекуются друг под другом`,
              });
            }, index * 400);
          });
        }}
      >
        Три подряд
      </Button>
    </div>
  ),
};
