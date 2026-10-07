import React from 'react';
import type { BlingProductItem } from '../types/blingProductItem.types';

interface BlingProductDetailsModalProps {
  readonly product: BlingProductItem;
  readonly onClose: () => void;
}

export const BlingProductDetailsModal: React.FC<BlingProductDetailsModalProps> = ({
  product,
  onClose,
}) => {
  const saldo = product.estoque?.saldoTotal || 0;
  const estoqueMinimo = product.estoqueMinimo || 0;
  const needsReplenishment = saldo <= estoqueMinimo;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bling-product-detail-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300 border-0 cursor-default"
        onClick={onClose}
        aria-label="Fechar detalhes do produto Bling"
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 scrollbar-hide">
        <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 pb-4 z-20">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-[1.8rem] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white text-3xl mb-4">
              <i className="bi bi-box-seam" />
            </div>
            <h3
              id="bling-product-detail-title"
              className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-2 px-4"
            >
              {product.nome}
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest">
                SKU: {product.codigo || 'S/ SKU'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                Valores &amp; Peso
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-400 uppercase">Venda:</span>
                  <span className="text-blue-600">
                    R${' '}
                    {parseFloat(String(product.preco || 0)).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-400 uppercase">Custo:</span>
                  <span className="text-slate-500">
                    R${' '}
                    {parseFloat(String(product.precoCusto || 0)).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-400 uppercase">Peso:</span>
                  <span className="text-slate-500">{product.pesoBruto || '0'} kg</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 text-center flex flex-col justify-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                Localização
              </p>
              <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase truncate">
                {product.localizacao || 'NÃO DEF.'}
              </p>
            </div>
          </div>

          <div
            className={`p-6 rounded-[2rem] border-2 transition-all ${needsReplenishment ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/40' : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/40'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${needsReplenishment ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}
                >
                  <i
                    className={`bi ${needsReplenishment ? 'bi-exclamation-octagon-fill' : 'bi-check-all'}`}
                  />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Saldo de Estoque
                  </p>
                  <p
                    className={`text-[11px] font-black uppercase ${needsReplenishment ? 'text-rose-600' : 'text-emerald-600'}`}
                  >
                    {needsReplenishment ? 'Reposição Necessária' : 'Estoque em Dia'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Atual</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{saldo}</p>
              </div>
              <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mínimo</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">
                  {estoqueMinimo}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 pt-0 z-20">
          <button
            onClick={onClose}
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            Fechar agora
          </button>
        </div>
      </div>
    </div>
  );
};
