import React from 'react';

const OrderFormLoadingOverlay: React.FC = () => (
  <div className="relative bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden animate-reveal">
    <div className="flex flex-1 items-center justify-center">
      <div aria-hidden="true" className="h-10 w-10 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
      <span role="status" className="sr-only">Carregando formulário</span>
    </div>
  </div>
);

export default OrderFormLoadingOverlay;
