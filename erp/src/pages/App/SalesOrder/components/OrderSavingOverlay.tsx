import React from 'react';

const OrderSavingOverlay = () => (
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

export default OrderSavingOverlay;
