import React from 'react';
import type { BlingProductItem } from '../types/blingProductItem.types';

interface BlingProductTableRowProps {
  readonly product: BlingProductItem;
  readonly onViewDetails: (product: BlingProductItem) => void;
}

export const BlingProductTableRow: React.FC<BlingProductTableRowProps> = ({
  product,
  onViewDetails,
}) => {
  const isChild = !!product.idProdutoPai;
  const isParent = product.formato === 'V';
  const saldo = product.estoque?.saldoTotal || 0;
  const estoqueMinimo = product.estoqueMinimo || 0;
  const isLowStock = saldo <= estoqueMinimo && saldo > 0;
  const isOutOfStock = saldo <= 0;

  return (
    <tr
      className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${isChild ? 'bg-slate-50/20' : ''}`}
    >
      <td className="px-8 py-6">
        <div className={`relative flex items-center gap-4 ${isChild ? 'ml-12' : ''}`}>
          {isChild && (
            <div className="absolute -left-8 top-[-30px] w-6 h-[46px] border-l-2 border-b-2 border-slate-200 dark:border-slate-700 rounded-bl-xl" />
          )}
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-sm ${isChild ? 'bg-amber-50 text-amber-500 scale-90' : 'bg-slate-100 text-slate-400'}`}
          >
            <i className={`bi ${isChild ? 'bi-dot' : isParent ? 'bi-stack' : 'bi-box-seam'}`} />
          </div>
          <div>
            <p
              className={`text-[12px] font-black uppercase truncate max-w-xs ${isChild ? 'text-slate-500 font-bold' : 'text-slate-800 dark:text-white'}`}
            >
              {product.nome}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {isChild
                ? 'Variação'
                : isParent
                  ? 'Produto com variações'
                  : 'Produto Simples'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-8 py-6 text-center">
        <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-mono font-bold text-slate-500">
          {product.codigo || '---'}
        </span>
      </td>
      <td className="px-8 py-6 text-center">
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[12px] font-black ${isOutOfStock ? 'bg-rose-50 text-rose-600' : isLowStock ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}
        >
          <i
            className={`bi ${isOutOfStock ? 'bi-x-circle-fill' : isLowStock ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`}
          />
          {saldo} / <span className="text-[10px] opacity-60">{estoqueMinimo}</span>
        </div>
      </td>
      <td className="px-8 py-6 text-right">
        <button
          onClick={() => onViewDetails(product)}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
        >
          <i className="bi bi-eye" />
        </button>
      </td>
    </tr>
  );
};
