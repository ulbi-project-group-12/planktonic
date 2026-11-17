const aliases: { name: string; token: string; swatch: string }[] = [
  {
    name: 'background / foreground',
    token: 'bg.app / text.primary',
    swatch: 'bg-background text-foreground',
  },
  {
    name: 'card / card-foreground',
    token: 'bg.surface / text.primary',
    swatch: 'bg-card text-card-foreground',
  },
  {
    name: 'popover / popover-foreground',
    token: 'bg.surface / text.primary',
    swatch: 'bg-popover text-popover-foreground',
  },
  {
    name: 'primary / primary-foreground',
    token: 'brand.primary / on-brand',
    swatch: 'bg-primary text-primary-foreground',
  },
  {
    name: 'secondary / secondary-foreground',
    token: 'bg.sunken / text.primary',
    swatch: 'bg-secondary text-secondary-foreground',
  },
  {
    name: 'muted / muted-foreground',
    token: 'bg.sunken / text.muted',
    swatch: 'bg-muted text-muted-foreground',
  },
  {
    name: 'accent / accent-foreground',
    token: 'bg.sunken / text.primary',
    swatch: 'bg-accent text-accent-foreground',
  },
  {
    name: 'destructive / destructive-foreground',
    token: 'danger / on-brand',
    swatch: 'bg-destructive text-destructive-foreground',
  },
  {
    name: 'border',
    token: 'border.default',
    swatch: 'border-2 border-border bg-card text-card-foreground',
  },
  {
    name: 'input',
    token: 'border.default',
    swatch: 'border-2 border-input bg-card text-card-foreground',
  },
  { name: 'ring', token: 'brand.primary', swatch: 'ring-3 ring-ring bg-card text-card-foreground' },
];

function ThemeAliases({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={theme === 'dark' ? 'dark' : undefined}>
      <div className="rounded-xl border border-line bg-app p-6">
        <div className="mb-4 text-micro font-medium tracking-wider text-fg-muted uppercase">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </div>
        <div className="grid grid-cols-1 gap-3 desktop-s:grid-cols-2">
          {aliases.map((alias) => (
            <div key={alias.name} className="flex items-center gap-3">
              <div
                className={`flex h-10 w-24 shrink-0 items-center justify-center rounded-md text-caption font-bold ${alias.swatch}`}
              >
                Aa
              </div>
              <div>
                <div className="text-caption font-bold text-fg-primary">{alias.name}</div>
                <div className="text-micro text-fg-muted">→ {alias.token}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default {
  title: 'shared/Design Tokens/shadcn Aliases',
  parameters: { layout: 'fullscreen' },
};

export const Aliases = {
  // renders the light and dark blocks itself, so the toolbar theme is locked to light
  globals: { theme: 'light' },
  render: () => (
    <div className="flex flex-col gap-6 p-8 font-sans">
      <div>
        <h2 className="mb-1 text-body-s font-bold text-fg-primary">Алиасы shadcn</h2>
        <p className="max-w-3xl text-caption text-fg-secondary">
          Компоненты из <code>shadcn add</code> используют имена темы shadcn (
          <code>bg-primary</code>, <code>text-muted-foreground</code>, <code>border-input</code>,{' '}
          <code>ring-ring</code>). Файл <code>tokens/shadcn-aliases.css</code> связывает каждое имя
          с токеном макета, поэтому такие компоненты сразу получают стиль продукта и тёмную тему.
          Наши атомы используют имена макета.
        </p>
      </div>
      <ThemeAliases theme="light" />
      <ThemeAliases theme="dark" />
    </div>
  ),
};
