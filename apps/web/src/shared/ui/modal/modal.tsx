'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Button, type ButtonPalette, type ButtonVariant } from '@/shared/ui/button';

const modalSizes = ['s', 'm', 'l'] as const;
type ModalSize = (typeof modalSizes)[number];

/** Desktop window width per the mockup: S 400 · M 560 · L 720; mobile sheet is full-width. */
const sizeClasses: Record<ModalSize, string> = {
  s: 'desktop-s:w-[400px]',
  m: 'desktop-s:w-[560px]',
  l: 'desktop-s:w-[720px]',
};

/** Dragging the sheet below the threshold (px) closes the modal. */
const SWIPE_CLOSE_THRESHOLD = 80;

interface ModalAction {
  /** Footer button label. */
  label: string;
  /** Button variant from the Button atom; defaults to solid for primary, secondary for the second. */
  variant?: ButtonVariant;
  /** Button palette (destructive confirmations — danger); defaults to primary. */
  palette?: ButtonPalette;
  /** Click handler; the modal does not close itself — close only via onClose. */
  onClick?: () => void;
}

interface ModalProps {
  /** Visibility is controlled by external state. */
  isShown: boolean;
  /** Window title; without it a visually hidden heading is rendered for a11y. */
  title?: string;
  /** Desktop window width: S 400 · M 560 · L 720. */
  size?: ModalSize;
  /** Primary footer button (right). */
  primaryAction?: ModalAction;
  /** Secondary footer button (left of the primary one). */
  secondaryAction?: ModalAction;
  /** Modal body: description, form, settings. */
  children?: ReactNode;
  /** Open request (radix). */
  onOpen?: () => void;
  /** Close: Esc, overlay click, cross icon, swiping the sheet down. */
  onClose?: () => void;
  className?: string;
}

/**
 * Modal per the "Atoms — modals" mockup: overlay bg/overlay 48%, radius 16, z-50,
 * focus trap inside; Esc and overlay click close it.
 * Below 1023 px — a bottom sheet with a drag area (swipe down closes it),
 * from 1024 px — a centered window with a cross icon.
 * The portal renders outside the tree, so the theme (.dark) of the nearest container
 * is carried over to the overlay and content.
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
  // The sentinel sits at the tree spot where the modal is mounted — the theme is read from it.
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
      {/* Hidden anchor inside the themed tree to carry the theme into the portal. */}
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
            // Mobile sheet (<1024): slides in from below.
            'max-desktop-s:data-[state=open]:slide-in-from-bottom-16 max-desktop-s:data-[state=closed]:slide-out-to-bottom-16',
            // Desktop (>=1024): centered window, scale-in transition.
            'desktop-s:top-1/2 desktop-s:bottom-auto desktop-s:left-1/2 desktop-s:-translate-x-1/2 desktop-s:-translate-y-1/2 desktop-s:rounded-xl',
            'desktop-s:data-[state=open]:zoom-in-95 desktop-s:data-[state=closed]:zoom-out-95',
            sizeClasses[size],
            portalDark && 'dark',
            className,
          )}
        >
          {/* Mobile drag area: pull down to close the sheet. */}
          <div
            data-slot="modal-handle"
            className="flex touch-none justify-center pt-2.5 pb-1.5 desktop-s:hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="h-1 w-10 rounded-full bg-line-strong" />
          </div>

          <div className="flex items-start justify-between gap-4 pr-12 pl-4 desktop-s:pr-14 desktop-s:pl-6">
            {title ? (
              <DialogPrimitive.Title
                data-slot="modal-title"
                className="pt-4 pb-1 text-body font-bold desktop-s:pt-5"
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
                className="absolute top-4 right-4 hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors outline-none hover:bg-sunken hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-brand-primary/40 desktop-s:inline-flex"
              >
                <X className="size-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div
            data-slot="modal-body"
            className="flex-1 overflow-y-auto px-4 pb-4 leading-5 text-fg-secondary desktop-s:px-6 desktop-s:pb-5"
          >
            {children}
          </div>

          {primaryAction || secondaryAction ? (
            <div
              data-slot="modal-footer"
              className="flex justify-end gap-2 border-t border-line px-4 py-3 desktop-s:px-6"
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
