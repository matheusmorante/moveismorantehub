import React, { useMemo, useRef, useEffect } from 'react';
import type Order from '@/pages/types/order.type';
import PromissoryNoteDocument from '@/pages/utils/promissory/PromissoryNoteDocument';
import { buildPromissoryNotesFromOrder } from '@/pages/utils/promissory/promissoryNoteService';
import storeLogo from '@/assets/logo-morante-horizontal.svg';

const PromissoryNotePage: React.FC = () => {
  const storedOrder = sessionStorage.getItem('order');
  const order = useMemo<Order | null>(() => {
    if (!storedOrder) return null;
    try {
      return JSON.parse(storedOrder);
    } catch {
      return null;
    }
  }, [storedOrder]);

  const queryParams = new URLSearchParams(window.location.search);
  const isSilent = queryParams.get('silent') === '1';
  const hasPrintedRef = useRef(false);

  const notes = useMemo(() => {
    return order ? buildPromissoryNotesFromOrder(order) : [];
  }, [order]);

  useEffect(() => {
    if (order && notes.length > 0 && !isSilent && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [order, notes, isSilent]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-white text-slate-800">
        <i className="bi bi-exclamation-triangle-fill text-5xl text-amber-500 mb-4"></i>
        <h1 className="text-2xl font-black italic">Nenhum pedido encontrado no armazenamento</h1>
        <p className="text-slate-500 mt-2">Por favor, acesse através das ações pós-venda do pedido.</p>
        <button
          onClick={() => window.close()}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs"
        >
          Fechar Janela
        </button>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-white text-slate-800">
        <i className="bi bi-x-circle-fill text-5xl text-amber-500 mb-4"></i>
        <h1 className="text-2xl font-black italic">Nota Promissória Indisponível</h1>
        <p className="text-slate-500 mt-2 flex flex-col items-center gap-2">
          Este pedido não possui pagamento pendente cadastrado na forma "Promissória".
          <br />
          <span className="text-sm font-semibold text-slate-400">
            A nota promissória é gerada exclusivamente para valores a receber nesta modalidade.
          </span>
        </p>
        <button
          onClick={() => window.close()}
          className="mt-6 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold uppercase tracking-widest text-xs"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen p-4 sm:p-8">
      {/* Barra de controle na tela */}
      <div className="no-print max-w-[210mm] mx-auto mb-6 flex justify-between items-center bg-slate-100 p-4 rounded-2xl border border-slate-200">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
            Visualização de Impressão A4
          </span>
          <span className="text-sm font-bold text-slate-800">
            {notes.length === 1 ? '1 Nota Promissória' : `${notes.length} Notas Promissórias`}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <i className="bi bi-printer"></i>
            <span>Imprimir</span>
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
          >
            Fechar
          </button>
        </div>
      </div>

      <PromissoryNoteDocument notes={notes} order={order} storeLogo={storeLogo} />
    </div>
  );
};

export default PromissoryNotePage;
