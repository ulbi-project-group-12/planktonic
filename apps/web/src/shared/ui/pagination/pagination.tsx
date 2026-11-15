import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib';

const paginationVariants = ['numbers', 'compact'] as const;
type PaginationVariant = (typeof paginationVariants)[number];

/** Номера страниц с разрывами: всегда первая, последняя и соседи текущей. */
function buildPages(page: number, totalPages: number): (number | 'ellipsis')[] {
  const wanted = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const numbers = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  let previous = 0;
  for (const n of numbers) {
    if (previous > 0 && n - previous > 1) result.push('ellipsis');
    result.push(n);
    previous = n;
  }
  return result;
}

const itemClass = cn(
  'inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-sm font-bold transition-colors',
  'outline-none focus-visible:ring-3 focus-visible:ring-brand-primary/40 disabled:cursor-not-allowed',
);

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** numbers — десктоп/списки · compact — мобайл («Назад 3 / 12 Вперёд»). */
  variant?: PaginationVariant;
  className?: string;
}

/** Пагинация по макету «Атомы — пагинация»: элементы 28×28 · radius 8 · активная — fill brand. */
function Pagination({
  page,
  totalPages,
  onPageChange,
  variant = 'numbers',
  className,
}: PaginationProps) {
  const goPrev = () => {
    if (page > 1) onPageChange(page - 1);
  };
  const goNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  const arrowClass = (disabled: boolean) =>
    cn(itemClass, 'text-fg-secondary', disabled && 'pointer-events-none text-fg-muted');

  if (variant === 'compact') {
    return (
      <nav
        aria-label="Пагинация"
        data-slot="pagination"
        data-variant="compact"
        className={className}
      >
        <div className="inline-flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={page <= 1}
            aria-label="Назад"
            className={arrowClass(page <= 1)}
          >
            <ChevronLeft className="size-4" />
            <span className="text-sm font-bold">Назад</span>
          </button>
          <span className="text-sm font-bold text-fg-secondary">
            {page} <span className="text-fg-muted">/ {totalPages}</span>
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={page >= totalPages}
            aria-label="Вперёд"
            className={arrowClass(page >= totalPages)}
          >
            <span className="text-sm font-bold">Вперёд</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Пагинация" data-slot="pagination" data-variant="numbers" className={className}>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={page <= 1}
          aria-label="Назад"
          className={arrowClass(page <= 1)}
        >
          <ChevronLeft className="size-4" />
        </button>
        {buildPages(page, totalPages).map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${String(index)}`}
              aria-hidden
              className="px-1 text-sm text-fg-muted"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => {
                onPageChange(item);
              }}
              aria-label={`Страница ${String(item)}`}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                itemClass,
                item === page
                  ? 'bg-brand-primary text-on-brand'
                  : 'text-fg-secondary hover:bg-sunken',
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={page >= totalPages}
          aria-label="Вперёд"
          className={arrowClass(page >= totalPages)}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

interface LoadMoreProps {
  onLoadMore: () => void;
  loading?: boolean;
  /** Сколько элементов подгрузится — подпись под кнопкой. */
  batchSize?: number;
  className?: string;
}

/** «Загрузить ещё» по макету: кнопка истории чата · при загрузке — спиннер и «Загружаем…». */
function LoadMore({ onLoadMore, loading = false, batchSize, className }: LoadMoreProps) {
  return (
    <div data-slot="load-more" className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loading}
        className={cn(
          'inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface',
          'px-4 text-sm font-bold text-brand-primary transition-colors',
          'hover:bg-sunken focus-visible:ring-3 focus-visible:ring-brand-primary/40 focus-visible:outline-none',
          loading && 'pointer-events-none text-fg-muted',
        )}
      >
        {loading ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Загружаем…
          </>
        ) : (
          'Загрузить ещё'
        )}
      </button>
      {batchSize !== undefined && !loading ? (
        <span className="text-[11px] text-fg-muted">подгрузит {batchSize} сообщений</span>
      ) : null}
    </div>
  );
}

interface PaginationStatusProps {
  shown: number;
  total: number;
  className?: string;
}

/** Статус выдачи по макету: «Показано 20 из 134» + тонкий прогресс-бар. */
function PaginationStatus({ shown, total, className }: PaginationStatusProps) {
  const percent = total > 0 ? Math.min(100, Math.round((shown / total) * 100)) : 0;
  return (
    <div data-slot="pagination-status" className={cn('flex flex-col gap-2', className)}>
      <span className="text-xs text-fg-secondary">
        Показано {shown} из {total}
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full bg-brand-primary transition-all"
          style={{ width: `${String(percent)}%` }}
        />
      </div>
    </div>
  );
}

export {
  LoadMore,
  Pagination,
  paginationVariants,
  PaginationStatus,
  type LoadMoreProps,
  type PaginationProps,
  type PaginationStatusProps,
  type PaginationVariant,
};
