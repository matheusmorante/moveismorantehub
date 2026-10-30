import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import {
  QuickRegisterVariationModal,
  type QuickRegisterItem,
} from '../../InboundInvoices/modals/QuickRegisterVariationModal';
import { useInboundInvoiceQuickRegister } from '../../InboundInvoices/hooks/useInboundInvoiceQuickRegister';
import { InboundReceiptItemRow } from './InboundReceiptItemRow';
import type { InboundReceiptItemComposition } from './InboundCompositionManager';

// ─── Tipos Exportados ──────────────────────────────────────────────────────────

export type { InboundReceiptItemComposition };

export type InboundReceiptItem = InboundInvoiceItem & {
  expectedQuantity?: number;
  linkedProductId?: string;
  linkedVariationId?: string;
  linkedProductCode?: string;
  linkedProductName?: string;
  linkStatus: 'automatic' | 'pending' | 'not_applicable';
  linkMode?: 'single' | 'composition' | 'not_applicable';
  composition?: InboundReceiptItemComposition[];
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface InboundNfeItemsSectionProps {
  readonly items: readonly InboundReceiptItem[];
  readonly processedItems?: readonly PurchaseItem[];
  readonly supplierId: string;
  readonly onChange: (itemNumber: number, update: Partial<InboundReceiptItem>) => void;
  readonly formatCurrency: (value: number) => string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function InboundNfeItemsSection({
  items,
  processedItems = [],
  supplierId,
  onChange,
  formatCurrency,
}: InboundNfeItemsSectionProps) {
  const { quickRegisterTarget, setQuickRegisterTarget, handleQuickRegisterConfirm } = useInboundInvoiceQuickRegister(
    supplierId, items, (itemNumber, update) => onChange(itemNumber, {
      linkedProductId: update.matchedProductId, linkedVariationId: update.matchedVariationId,
      linkedProductName: update.productErpName, linkedProductCode: update.linkedProductCode, linkStatus: 'pending',
    }),
  );

  const notApplicableCount = items.filter((item) => item.linkMode === 'not_applicable').length;
  const linkedCount = items.filter(
    (item) =>
      item.linkMode !== 'not_applicable' &&
      Boolean(item.linkedProductId || item.compositionLinks?.some((link) => link.productId))
  ).length;
  const pendingCount = items.length - linkedCount - notApplicableCount;
  const allResolved = pendingCount === 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <i className="bi bi-box-seam text-emerald-600" aria-hidden="true" />
            Itens da NF-e e Vínculo com o ERP
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Revise os produtos que entrarão no estoque. Linhas “Não se aplica” permanecem na NF-e e são ignoradas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
              allResolved
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40'
            }`}
          >
            <i
              className={`bi ${allResolved ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}
              aria-hidden="true"
            />
            {linkedCount} vinculados · {notApplicableCount} não se aplica · {pendingCount} pendentes
          </span>
        </div>
      </header>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item, index) => (
          <InboundReceiptItemRow
            key={item.itemNumber}
            item={item}
            processedItem={processedItems[index]}
            onChange={onChange}
            formatCurrency={formatCurrency}
            onQuickRegister={(itemNumber, nfeItem) =>
              setQuickRegisterTarget({ itemNumber, item: nfeItem as unknown as QuickRegisterItem })
            }
          />
        ))}
      </div>

      <QuickRegisterVariationModal
        isOpen={Boolean(quickRegisterTarget)}
        item={quickRegisterTarget?.item || null}
        supplierId={supplierId}
        onClose={() => setQuickRegisterTarget(null)}
        onConfirmSelection={handleQuickRegisterConfirm}
      />
    </section>
  );
}

export default InboundNfeItemsSection;
