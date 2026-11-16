import { useEffect, useState } from 'react';

interface ShadowToken {
  /** Token name — the utility: shadow-sm … shadow-3xl. */
  name: string;
  /** Raw CSS variable from tokens/shadows.css. */
  cssVar: string;
  /** Where the token is used in the kit. */
  usage: string;
}

const shadowTokens: ShadowToken[] = [
  { name: 'shadow-sm', cssVar: '--shadow-sm', usage: 'меню дропдауна, мелкие контролы' },
  { name: 'shadow-md', cssVar: '--shadow-md', usage: 'селект, тост, тултип' },
  { name: 'shadow-lg', cssVar: '--shadow-lg', usage: 'крупные оверлеи' },
  { name: 'shadow-xl', cssVar: '--shadow-xl', usage: '—' },
  { name: 'shadow-2xl', cssVar: '--shadow-2xl', usage: '—' },
  { name: 'shadow-3xl', cssVar: '--shadow-3xl', usage: '—' },
];

/** Reads the rendered box-shadow of every demo card after paint. */
function useMeasuredShadows(): Record<string, string> {
  const [shadows, setShadows] = useState<Record<string, string>>({});

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const next: Record<string, string> = {};
      for (const element of document.querySelectorAll<HTMLElement>('[data-shadow-card]')) {
        next[element.dataset.shadowCard ?? ''] = getComputedStyle(element).boxShadow;
      }
      setShadows(next);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return shadows;
}

function ShadowCard({ token, value }: { token: ShadowToken; value: string | undefined }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        data-shadow-card={token.name}
        className={`h-24 w-full rounded-xl bg-surface ${token.name}`}
      />
      <div className="w-full">
        <div className="text-caption font-bold text-fg-primary">{token.name}</div>
        <div className="text-micro text-fg-muted">{token.cssVar}</div>
        <div className="mt-1 break-all text-micro text-fg-secondary">{value ?? '…'}</div>
        <div className="mt-1 text-micro text-fg-muted">{token.usage}</div>
      </div>
    </div>
  );
}

export default {
  title: 'shared/Design Tokens/Shadows',
  parameters: { layout: 'fullscreen' },
};

export const Scale = {
  render: () => <ShadowsScale />,
};

function ShadowsScale() {
  const shadows = useMeasuredShadows();

  return (
    <div className="flex flex-col gap-6 p-8 font-sans">
      <div>
        <h2 className="mb-1 text-body-s font-bold text-fg-primary">Тени</h2>
        <p className="max-w-3xl text-caption text-fg-secondary">
          Токены лежат в <code>tokens/shadows.css</code> — это шкала высот из макета: каждая ступень
          поднимает смещение на 4 px и наращивает размытие и непрозрачность. Утилиты:{' '}
          <code>shadow-sm</code> … <code>shadow-3xl</code> (дефолтная шкала Tailwind намеренно
          заменена макетной). Тени не зависят от темы.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-app p-6">
        <div className="mb-4 text-micro font-medium tracking-wider text-fg-muted uppercase">
          Шкала — карточки рендерятся реальными утилитами
        </div>
        <div className="grid grid-cols-2 gap-6 desktop-s:grid-cols-3 desktop-m:grid-cols-6">
          {shadowTokens.map((token) => (
            <ShadowCard key={token.name} token={token} value={shadows[token.name]} />
          ))}
        </div>
      </div>
    </div>
  );
}
