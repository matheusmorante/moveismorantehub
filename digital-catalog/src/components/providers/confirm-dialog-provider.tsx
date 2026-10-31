'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmationRequest = ConfirmDialogOptions & {
  resolve: (confirmed: boolean) => void;
};

type ConfirmAction = (options: ConfirmDialogOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmAction | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmationRequest | null>(null);
  const pendingRef = useRef<ConfirmationRequest | null>(null);
  const queueRef = useRef<ConfirmationRequest[]>([]);

  const confirm = useCallback((options: ConfirmDialogOptions) => new Promise<boolean>((resolve) => {
    const next = { ...options, resolve };
    if (pendingRef.current) {
      queueRef.current.push(next);
      return;
    }
    pendingRef.current = next;
    setPending(next);
  }), []);

  const complete = useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    if (!current) return;

    current.resolve(confirmed);
    const next = queueRef.current.shift() || null;
    pendingRef.current = next;
    setPending(next);
  }, []);

  useEffect(() => () => {
    pendingRef.current?.resolve(false);
    queueRef.current.splice(0).forEach((queued) => queued.resolve(false));
    pendingRef.current = null;
  }, []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && complete(false)}>
        <DialogContent showCloseButton={false} className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader className="flex-row items-start gap-3 pr-2">
            <div
              className={`mt-0.5 rounded-full p-2 ${pending?.destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
            >
              {pending?.destructive ? (
                <AlertTriangle className="size-5" aria-hidden="true" />
              ) : (
                <CircleHelp className="size-5" aria-hidden="true" />
              )}
            </div>
            <div className="space-y-2">
              <DialogTitle>{pending?.title}</DialogTitle>
              <DialogDescription>{pending?.description}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => complete(false)}>
              {pending?.cancelLabel || 'Cancelar'}
            </Button>
            <Button
              type="button"
              variant={pending?.destructive ? 'destructive' : 'default'}
              onClick={() => complete(true)}
            >
              {pending?.confirmLabel || 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(): ConfirmAction {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) {
    throw new Error('useConfirmDialog deve ser usado dentro de ConfirmDialogProvider.');
  }
  return confirm;
}
