import React, { useEffect, useRef } from 'react';

type OrderSavingOverlayProps = {
  onFirstFrameVisible?: () => void;
};

const OrderSavingOverlay = ({ onFirstFrameVisible }: OrderSavingOverlayProps) => {
  const reportedRef = useRef(false);

  useEffect(() => {
    if (!onFirstFrameVisible || reportedRef.current) return;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (reportedRef.current) return;
        reportedRef.current = true;
        onFirstFrameVisible();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [onFirstFrameVisible]);

  return (
    <div
      className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/75"
      role="status"
      aria-label="Salvando pedido"
      aria-busy="true"
      onClick={(event) => event.stopPropagation()}
    >
      <span
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"
      />
    </div>
  );
};

export default OrderSavingOverlay;
