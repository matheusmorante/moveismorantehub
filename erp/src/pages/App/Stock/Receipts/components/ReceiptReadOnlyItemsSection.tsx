import type { PurchaseItem } from '@/pages/types/purchase.type';

interface ReceiptReadOnlyItemsSectionProps {
  readonly items: readonly PurchaseItem[];
  readonly formatCurrency: (value: number) => string;
}

export function ReceiptReadOnlyItemsSection({
  items,
  formatCurrency,
}: ReceiptReadOnlyItemsSectionProps) {
  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
        Itens ({items.length})
      </h3>

      {items.map((item, index) => (
        <article
          key={`${item.productId}-${item.variationId || index}`}
          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30"
        >
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Produto
            </span>
            <p className="mt-1 break-words text-sm font-black leading-snug text-slate-900 dark:text-slate-100">
              {item.description || 'Produto não informado'}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ReadOnlyValue label="Quantidade" value={String(item.quantity)} />
            <ReadOnlyValue label="Custo unitário" value={formatCurrency(item.baseCost ?? item.unitCost ?? 0)} />
            <ReadOnlyValue label="Custo total" value={formatCurrency(item.totalCost || 0)} />
          </dl>
        </article>
      ))}

      {items.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500 dark:bg-slate-800/40">
          Nenhum item informado no recebimento.
        </p>
      ) : null}
    </section>
  );
}

function ReadOnlyValue({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-100 px-2.5 py-2 dark:bg-slate-800">
      <dt className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}
