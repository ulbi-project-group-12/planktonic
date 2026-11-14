import * as React from 'react';

const textSizes: [name: string, px: string, utility: string][] = [
  ['text.2xs', '10px', 'text-2xs'],
  ['text.xs', '11px', 'text-xs'],
  ['text.sm', '12px', 'text-sm'],
  ['text.md', '13px', 'text-md'],
  ['text.lg', '14px', 'text-lg'],
  ['text.xl', '15px', 'text-xl'],
  ['text.2xl', '16px', 'text-2xl'],
  ['text.3xl', '18px', 'text-3xl'],
  ['text.4xl', '20px', 'text-4xl'],
  ['text.5xl', '24px', 'text-5xl'],
  ['text.6xl', '28px', 'text-6xl'],
  ['text.7xl', '32px', 'text-7xl'],
  ['text.8xl', '40px', 'text-8xl'],
  ['text.9xl', '64px', 'text-9xl'],
];

const sample = 'Планктон — основа пищевой цепи';

function SizeRow({ name, px, utility }: { name: string; px: string; utility: string }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [actual, setActual] = React.useState('');

  React.useEffect(() => {
    const element = ref.current;
    if (element) setActual(getComputedStyle(element).fontSize);
  }, []);

  return (
    <div className="flex items-baseline gap-4 border-b border-line py-2">
      <div className="w-24 shrink-0">
        <div className="text-sm font-bold">{name}</div>
        <div className="text-xs text-fg-muted">
          {utility} · {actual || px}
        </div>
      </div>
      <p ref={ref} className={`min-w-0 truncate ${utility}`}>
        {sample}
      </p>
    </div>
  );
}

export default {
  title: 'shared/Design Tokens/Text Sizes',
  parameters: { layout: 'padded' },
};

export const Scale = {
  render: () => (
    <div className="p-4">
      <h2 className="mb-1 text-lg font-bold">Размеры текста</h2>
      <p className="mb-6 text-sm text-fg-secondary">
        Шкала из макетов (частотность: 12 — основной текст UI, 14 — акценты и поля, 11 — подписи, 10
        — микротекст, 20–32 — заголовки экранов). Шрифт — Onest.
      </p>
      <div>
        {textSizes.map(([name, px, utility]) => (
          <SizeRow key={name} name={name} px={px} utility={utility} />
        ))}
      </div>
    </div>
  ),
};
