import { useEffect, useRef, useState } from 'react';

const radiusTokens: [name: string, cssVar: string][] = [
  ['radius.xs', '--radius-xs'],
  ['radius.sm', '--radius-sm'],
  ['radius.md', '--radius-md'],
  ['radius.lg', '--radius-lg'],
  ['radius.xl', '--radius-xl'],
  ['radius.2xl', '--radius-2xl'],
  ['radius.3xl', '--radius-3xl'],
];

function RadiusSample({ name, cssVar }: { name: string; cssVar: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    const element = ref.current;
    if (element) setValue(getComputedStyle(element).borderRadius);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div
        ref={ref}
        className="size-14 shrink-0 border-2 border-brand-primary bg-brand-subtle"
        style={{ borderRadius: `var(${cssVar})` }}
      />
      <div>
        <div className="text-caption font-bold">{name}</div>
        <div className="text-micro text-fg-muted">
          rounded-
          {name.split('.')[1]} · {value || '…'}
        </div>
      </div>
    </div>
  );
}

export default {
  title: 'shared/Design Tokens/Radii',
  parameters: { layout: 'padded' },
};

export const Scale = {
  render: () => (
    <div className="p-4">
      <h2 className="mb-1 text-body-s font-bold">Радиусы</h2>
      <p className="mb-4 text-caption text-fg-secondary">
        Шкала из макетов (не зависит от темы): 3 — мелкие контролы (чекбоксы), 8 — кнопки и поля, 12
        — карточки и бейджи, 16/24 — диалоги. Для пилюль и аватаров используется{' '}
        <code>rounded-full</code>.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {radiusTokens.map(([name, cssVar]) => (
          <RadiusSample key={name} name={name} cssVar={cssVar} />
        ))}
      </div>
    </div>
  ),
};
