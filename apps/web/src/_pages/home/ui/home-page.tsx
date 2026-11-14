'use client';

import { useState } from 'react';
import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Button, Modal } from '@/shared/ui';

export function HomePage() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold tracking-tight">{PRODUCT_DISPLAY_NAME}</h1>
      <p className="text-lg text-fg-secondary">
        The web skeleton is running. The code lives in FSD layers under <code>src/</code>.
      </p>
      <Button
        type="button"
        className="self-start"
        onClick={() => {
          setAboutOpen(true);
        }}
      >
        About this skeleton
      </Button>
      <Modal
        isShown={aboutOpen}
        onClose={() => {
          setAboutOpen(false);
        }}
        title="About this skeleton"
        secondaryAction={{
          label: 'Close',
          onClick: () => {
            setAboutOpen(false);
          },
        }}
      >
        The web skeleton is running. FSD layers live in <code>src/</code>, and the UI kit lives in{' '}
        <code>src/shared/ui</code>.
      </Modal>
    </main>
  );
}
