import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui';

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">{PRODUCT_DISPLAY_NAME}</h1>
      <p className="text-base text-muted-foreground">
        The web skeleton is running. The code lives in FSD layers under <code>src/</code>.
      </p>
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" className="self-start">
            About this skeleton
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About this skeleton</DialogTitle>
            <DialogDescription>
              The web skeleton is running. FSD layers live in <code>src/</code>, and the UI kit
              lives in <code>src/shared/ui</code>.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  );
}
