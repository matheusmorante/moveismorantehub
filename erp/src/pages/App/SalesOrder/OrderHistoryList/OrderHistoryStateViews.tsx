import React from 'react';

export const OrderHistoryLoadingView: React.FC<{ readonly showTroubleshoot: boolean }> = ({
  showTroubleshoot,
}) => (
  <div className="flex flex-col items-center justify-center py-20 gap-6">
    <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"></div>
    <div className="flex flex-col items-center gap-2">
      <p className="text-slate-400 dark:text-slate-600 font-bold tracking-widest uppercase text-xs">
        Carregando pedidos da nuvem...
      </p>
      {showTroubleshoot && (
        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight opacity-75">
          Demorando muito? Verifique a conexão ou o Console (F12)
        </p>
      )}
    </div>
  </div>
);

export const OrderHistoryErrorView: React.FC<{ readonly onRetry: () => void }> = ({
  onRetry,
}) => (
  <div role="alert" className="flex flex-col items-center justify-center gap-3 py-20 text-center">
    <p className="font-bold text-red-600">Não foi possível carregar os pedidos.</p>
    <button
      onClick={onRetry}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
    >
      Tentar novamente
    </button>
  </div>
);

export const OrderHistoryEmptyView: React.FC<{ readonly isTrash: boolean }> = ({ isTrash }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center">
      <i
        className={`bi ${isTrash ? 'bi-trash3' : 'bi-search'} text-3xl text-slate-200 dark:text-slate-800`}
      ></i>
    </div>
    <p className="text-slate-400 dark:text-slate-600 font-bold tracking-widest uppercase text-xs">
      {isTrash ? 'A lixeira está vazia' : 'Nenhum pedido encontrado'}
    </p>
  </div>
);

export const OrderHistoryEmptyPageNotice: React.FC = () => (
  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
    Nenhum pedido para exibir nesta página. Use a paginação para continuar.
  </div>
);
