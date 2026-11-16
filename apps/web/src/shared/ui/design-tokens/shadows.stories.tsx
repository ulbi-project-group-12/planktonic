import { useEffect, useState } from 'react';

interface ShadowToken {
  /** Token name — the utility: shadow-elevation-1 … shadow-elevation-6. */
  name: string;
  /** Raw CSS variable from tokens/shadows.css. */
  cssVar: string;
  /** Where the token is used in the kit. */
  usage: string;
}

const shadowTokens: ShadowToken[] = [
  { name: 'shadow-elevation-1', cssVar: '--shadow-elevation-1', usage: 'меню дропдауна' },
  { name: 'shadow-elevation-2', cssVar: '--shadow-elevation-2', usage: 'селект, тост, тултип' },
  { name: 'shadow-elevation-3', cssVar: '--shadow-elevation-3', usage: 'крупные оверлеи' },
  { name: 'shadow-elevation-4', cssVar: '--shadow-elevation-4', usage: '—' },
  { name: 'shadow-elevation-5', cssVar: '--shadow-elevation-5', usage: '—' },
  { name: 'shadow-elevation-6', cssVar: '--shadow-elevation-6', usage: '—' },
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
          <code>shadow-elevation-1</code> … <code>shadow-elevation-6</code>. Дефолтная шкала
          Tailwind (<code>shadow-xs</code> … <code>shadow-2xl</code>) не тронута. Тени не зависят от
          темы.
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
