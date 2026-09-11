import React from 'react';
import Product, { Variation } from '@/pages/types/product.type';
import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import { InboundInvoiceItemFiscalReview } from './InboundInvoiceItemFiscalReview';

export type RealProductSuggestion = {
  productId: string;
  variationId?: string;
  displayName: string;
  product: any;
  variation?: any;
};

interface InboundInvoiceItemCardProps {
  item: InboundInvoiceItem;
  supplierId?: string;
  realSuggestion?: RealProductSuggestion;
  isRejected: boolean;
  isProcessingSuggestions: boolean;
  onSelectProduct: (itemNumber: number, product: Product, variation?: Variation) => void;
  onUnlinkProduct: (itemNumber: number) => void;
  onAcceptRealSuggestion: (itemNumber: number, suggestion: RealProductSuggestion) => void;
  onRejectSuggestion: (itemNumber: number) => void;
  onRequestIndividualCreation: (item: InboundInvoiceItem) => void;
}

/**
 * Card individual de um item da NF-e para conferência e vínculo com produtos do ERP.
 * Responsabilidade: apresentação coesa dos dados fiscais e campos de associação do item.
 */
export const InboundInvoiceItemCard: React.FC<InboundInvoiceItemCardProps> = ({
  item,
  supplierId,
  realSuggestion,
  isRejected,
  isProcessingSuggestions,
  onSelectProduct,
  onUnlinkProduct,
  onAcceptRealSuggestion,
  onRejectSuggestion,
  onRequestIndividualCreation,
}) => {
  const linked = Boolean(item.matchedProductId);
  const hasAiSuggestion = !linked && !isRejected && Boolean(realSuggestion);
  const displayValue = linked
    ? (item.productErpName || '')
    : (hasAiSuggestion && realSuggestion ? realSuggestion.displayName : '');

  return (
    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
      {/* Lado Esquerdo: Dados Fiscais da NF */}
      <div className="min-w-0 space-y-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dados da NF</span>
        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
          {item.itemNumber}. {item.productDescription || 'Descrição não encontrada'}
        </h4>
        <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
          Cód. fornecedor: {item.productCode || '—'} · {item.quantity} {item.unit}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span>Unit.: <b>{formatCurrency(item.unitCost)}</b></span>
          <span>Total: <b>{formatCurrency(item.totalCost)}</b></span>
          <span>NCM: {item.ncm || '—'}</span>
          <span>CFOP: {item.cfop || '—'}</span>
        </div>
        <InboundInvoiceItemFiscalReview item={item} />
      </div>

      {/* Lado Direito: Vínculo do Produto no ERP */}
      <div className="flex min-w-0 flex-col rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Produto interno vinculado
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${
              linked
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
            }`}
          >
            {linked ? 'Vinculado' : 'Não vinculado'}
          </span>
        </div>

        {!supplierId ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Vincule o fornecedor para identificar ou cadastrar os produtos.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Campo de Busca / Seleção Direta */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ProductAutocomplete
                    supplierId={supplierId}
                    value={displayValue}
                    isSelected={linked}
                    isAiSuggestion={hasAiSuggestion}
                    isLoadingSuggestions={!linked && isProcessingSuggestions}
                    disabled={!linked && isProcessingSuggestions}
                    onAcceptSuggestion={() => realSuggestion && onAcceptRealSuggestion(item.itemNumber, realSuggestion)}
                    onRejectSuggestion={() => onRejectSuggestion(item.itemNumber)}
                    placeholder="Digite 2 ou mais letras para buscar..."
                    onSelect={(product, variation) => onSelectProduct(item.itemNumber, product, variation)}
                  />
                </div>
                {linked && (
                  <button
                    type="button"
                    onClick={() => onUnlinkProduct(item.itemNumber)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Desvincular produto para buscar outro"
                  >
                    <i className="bi bi-x-lg text-xs" />
                  </button>
                )}
              </div>
              {linked && item.linkedProductCode && (
                <p className="text-[10px] font-mono text-slate-400">
                  Código ERP: {item.linkedProductCode}
                </p>
              )}
            </div>

            {/* Botão Cadastrar Rapidamente quando não vinculado */}
            {!linked && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => onRequestIndividualCreation(item)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 transition-colors shadow-sm"
                >
                  <i className="bi bi-plus-circle-fill text-xs" />
                  Cadastrar rapidamente
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
