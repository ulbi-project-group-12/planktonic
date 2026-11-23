'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib';
import { AppSidebar } from './app-sidebar';

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="mobile-nav-overlay"
          className={cn(
            'fixed inset-0 z-50 bg-overlay',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        <DialogPrimitive.Content
          data-slot="mobile-nav-drawer"
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 bg-surface outline-none',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-left-16',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left-16',
          )}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Навигация</DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <button
              type="button"
              aria-label="Закрыть меню"
              className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md text-fg-muted outline-none transition-colors hover:bg-sunken hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-brand-primary/40"
            >
              <X className="size-4" />
            </button>
          </DialogPrimitive.Close>
          <div className="h-full overflow-auto">
            <AppSidebar className="border-r-0" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
