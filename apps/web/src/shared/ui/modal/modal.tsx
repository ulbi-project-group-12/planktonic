'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Button, type ButtonPalette, type ButtonVariant } from '@/shared/ui/button';

const modalSizes = ['s', 'm', 'l'] as const;
type ModalSize = (typeof modalSizes)[number];

/** Ширина десктопного окна по макету: S 400 · M 560 · L 720; мобильная шторка — во всю ширину. */
const sizeClasses: Record<ModalSize, string> = {
  s: 'desktop-s:w-[400px]',
  m: 'desktop-s:w-[560px]',
  l: 'desktop-s:w-[720px]',
};

/** Смахивание шторки ниже порога (px) закрывает модалку. */
const SWIPE_CLOSE_THRESHOLD = 80;

interface ModalAction {
  /** Подпись кнопки футера. */
  label: string;
  /** Вид кнопки из атома Button; по умолчанию solid у основной, secondary у второй. */
  variant?: ButtonVariant;
  /** Палитра кнопки (destructive-подтверждения — danger); по умолчанию primary. */
  palette?: ButtonPalette;
  /** Обработчик клика; модалка сама не закрывается — закрытие только через onClose. */
  onClick?: () => void;
}

interface ModalProps {
  /** Показ управляется внешним стейтом. */
  isShown: boolean;
  /** Заголовок окна; без него рендерится скрытый заголовок для a11y. */
  title?: string;
  /** Ширина десктопного окна: S 400 · M 560 · L 720. */
  size?: ModalSize;
  /** Основная кнопка футера (справа). */
  primaryAction?: ModalAction;
  /** Вторая кнопка футера (слева от основной). */
  secondaryAction?: ModalAction;
  /** Тело модалки: описание, форма, настройки. */
  children?: ReactNode;
  /** Запрос на открытие (radix). */
  onOpen?: () => void;
  /** Закрытие: Esc, клик по оверлею, крестик, смахивание шторки вниз. */
  onClose?: () => void;
  className?: string;
}

/**
 * Модалка по макету «Атомы — модалки»: overlay bg/overlay 48%, radius 16, z-50,
 * focus trap внутри; Esc и клик по оверлею закрывают.
 * До 1023 px — шторка снизу с областью захвата (смахивание вниз закрывает),
 * от 1024 px — окно по центру с крестиком.
 * Портал рендерится вне дерева, поэтому тема (.dark) ближайшего контейнера
 * переносится на оверлей и контент.
 */
function Modal({
  isShown,
  onOpen,
  onClose,
  title,
  size = 'm',
  primaryAction,
  secondaryAction,
  children,
  className,
}: ModalProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  // Сентинел стоит в точке дерева, где подключена модалка — по нему узнаём тему.
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [portalDark, setPortalDark] = useState(false);

  useEffect(() => {
    if (!isShown) return;
    setPortalDark(Boolean(sentinelRef.current?.closest('.dark')));
  }, [isShown]);

  const handleOpenChange = (open: boolean) => {
    if (open) onOpen?.();
    else onClose?.();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    setDragOffset(Math.max(0, event.clientY - dragStartYRef.current));
  };

  const handlePointerUp = () => {
    if (dragStartYRef.current === null) return;
    if (dragOffset >= SWIPE_CLOSE_THRESHOLD) onClose?.();
    dragStartYRef.current = null;
    setDragOffset(0);
  };

  return (
    <DialogPrimitive.Root open={isShown} onOpenChange={handleOpenChange}>
      {/* Скрытый якорь внутри темизированного дерева для переноса темы в портал. */}
      <span ref={sentinelRef} className="hidden" aria-hidden />
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="modal-overlay"
          className={cn(
            'fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            portalDark && 'dark',
          )}
        />
        <DialogPrimitive.Content
          data-slot="modal"
          style={dragOffset > 0 ? { transform: `translateY(${String(dragOffset)}px)` } : undefined}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl bg-surface text-body-s text-fg-primary outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            // Мобильная шторка (<1024): выезд снизу.
            'max-desktop-s:data-[state=open]:slide-in-from-bottom-16 max-desktop-s:data-[state=closed]:slide-out-to-bottom-16',
            // Десктоп (>=1024): окно по центру, появление с масштабом.
            'desktop-s:top-1/2 desktop-s:bottom-auto desktop-s:left-1/2 desktop-s:-translate-x-1/2 desktop-s:-translate-y-1/2 desktop-s:rounded-xl',
            'desktop-s:data-[state=open]:zoom-in-95 desktop-s:data-[state=closed]:zoom-out-95',
            sizeClasses[size],
            portalDark && 'dark',
            className,
          )}
        >
          {/* Мобильная область захвата: тащим вниз, чтобы закрыть шторку. */}
          <div
            data-slot="modal-handle"
            className="flex touch-none justify-center pt-2.5 pb-1.5 lg:hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="h-1 w-10 rounded-full bg-border-strong" />
          </div>

          <div className="flex items-start justify-between gap-4 pr-12 pl-4 lg:pr-14 lg:pl-6">
            {title ? (
              <DialogPrimitive.Title
                data-slot="modal-title"
                className="pt-4 pb-1 text-body font-bold lg:pt-5"
              >
                {title}
              </DialogPrimitive.Title>
            ) : (
              <DialogPrimitive.Title className="sr-only">Диалог</DialogPrimitive.Title>
            )}
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                data-slot="modal-close"
                aria-label="Закрыть"
                className="absolute top-4 right-4 hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors outline-none hover:bg-sunken hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-brand-primary/40 lg:inline-flex"
              >
                <X className="size-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div
            data-slot="modal-body"
            className="flex-1 overflow-y-auto px-4 pb-4 leading-5 text-fg-secondary lg:px-6 lg:pb-5"
          >
            {children}
          </div>

          {primaryAction || secondaryAction ? (
            <div
              data-slot="modal-footer"
              className="flex justify-end gap-2 border-t border-line px-4 py-3 lg:px-6"
            >
              {secondaryAction ? (
                <Button
                  variant={secondaryAction.variant ?? 'secondary'}
                  palette={secondaryAction.palette ?? 'primary'}
                  onClick={secondaryAction.onClick}
                >
                  {secondaryAction.label}
                </Button>
              ) : null}
              {primaryAction ? (
                <Button
                  variant={primaryAction.variant ?? 'solid'}
                  palette={primaryAction.palette ?? 'primary'}
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { Modal, modalSizes, type ModalAction, type ModalProps, type ModalSize };
