import { Suspense } from 'react';
import { Spinner } from '@/shared/ui';
import { VerifyEmailContent } from './verify-email-content';

export function VerifyEmailPage() {
  // The content reads `?token=`: without a boundary the whole page would opt out of prerendering.
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center">
          <Spinner size="l" />
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
