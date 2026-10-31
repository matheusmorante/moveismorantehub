import React, { useCallback, useEffect, useRef, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  registerConfirmationHandler,
  type ConfirmationOptions,
} from './confirmationService';

interface PendingConfirmation extends ConfirmationOptions {
  resolve: (confirmed: boolean) => void;
}

interface ConfirmDialogHostProps {
  readonly children: React.ReactNode;
}

export const ConfirmDialogHost: React.FC<ConfirmDialogHostProps> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const pendingRef = useRef<PendingConfirmation | null>(null);
  const queueRef = useRef<PendingConfirmation[]>([]);
  const confirmedRef = useRef(false);

  useBodyScrollLock(Boolean(pending));

  const request = useCallback((options: ConfirmationOptions) => new Promise<boolean>((resolve) => {
    const next = { ...options, resolve };
    if (pendingRef.current) {
      queueRef.current.push(next);
      return;
    }
    pendingRef.current = next;
    setPending(next);
  }), []);

  useEffect(() => {
    const unregister = registerConfirmationHandler(request);
    return () => {
      unregister();
      pendingRef.current?.resolve(false);
      queueRef.current.splice(0).forEach((queued) => queued.resolve(false));
      pendingRef.current = null;
    };
  }, [request]);

  const complete = () => {
    const current = pendingRef.current;
    if (!current) return;

    current.resolve(confirmedRef.current);
    confirmedRef.current = false;
    const next = queueRef.current.shift() || null;
    pendingRef.current = next;
    setPending(next);
  };

  return (
    <>
      {children}
      <div className="relative z-[100000000]">
        <ConfirmModal
          isOpen={Boolean(pending)}
          onClose={complete}
          onConfirm={() => { confirmedRef.current = true; }}
          title={pending?.title || ''}
          message={pending?.message || ''}
          confirmLabel={pending?.confirmLabel}
          cancelLabel={pending?.cancelLabel}
          type={pending?.type}
        />
      </div>
    </>
  );
};
