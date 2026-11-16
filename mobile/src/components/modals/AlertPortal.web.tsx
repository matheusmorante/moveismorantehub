import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = { visible: boolean; onRequestClose: () => void; children: React.ReactNode };

export function AlertPortal({ visible, onRequestClose, children }: Props) {
  useEffect(() => {
    if (!visible) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onRequestClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onRequestClose]);
  if (!visible || typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 2147483647, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>,
    document.body
  );
}
