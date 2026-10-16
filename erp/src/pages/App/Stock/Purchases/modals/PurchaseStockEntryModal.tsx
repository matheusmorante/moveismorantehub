import { useEffect, useRef, useState } from 'react';
import type Purchase from '@/pages/types/purchase.type';
import type Product from '@/pages/types/product.type';
import { subscribeToProducts } from '@/pages/utils/productService';
import { saveInventoryMove } from '@/pages/utils/inventoryService';
import { updatePurchase } from '@/pages/utils/purchaseService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { purchaseInventoryEntryFormSchema } from '../../../../../../../shared-utils/inventoryMoveSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

interface PurchaseStockEntryModalProps {
  readonly purchase: Purchase | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function PurchaseStockEntryModal(props: PurchaseStockEntryModalProps) {
  return props.isOpen && props.purchase ? <PurchaseStockEntryEditor {...props} purchase={props.purchase}
    key={JSON.stringify([props.purchase.id, props.purchase.items])} /> : null;
}

function PurchaseStockEntryEditor({ purchase, onClose }: PurchaseStockEntryModalProps & { purchase: Purchase }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [date, setDate] = useState(() => purchase.date?.slice(0, 10) || new Date().toLocaleDateString('en-CA'));
  const [observation, setObservation] = useState(() =>
    `Pedido de Compra #${purchase.id?.slice(-4)}${purchase.invoiceNumber ? ` | NF: ${purchase.invoiceNumber}` : ''}${purchase.observation ? ` | ${purchase.observation}` : ''}`);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const locked = useRef(false), replayBlocked = useRef(false), mounted = useRef(false);
  const latest = useRef(purchase); latest.current = purchase;
  const catalog = useRef({ products, loaded: productsLoaded }); catalog.current = { products, loaded: productsLoaded };
  const close = () => { if (!locked.current) onClose(); };
  const values = { date, observation, purchaseId: purchase.id || '', status: purchase.status,
    stockProcessed: !!purchase.stockProcessed, items: purchase.items };
  const form = useZodForm(purchaseInventoryEntryFormSchema, values);

  useEffect(() => {
    mounted.current = true;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked.current) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { mounted.current = false; window.removeEventListener('keydown', handleKeyDown); };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToProducts((data) => {
      if (active) { setProducts(data.filter((product) => !product.deleted)); setProductsLoaded(true); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const handleSave = async () => {
    if (locked.current || replayBlocked.current) return;
    locked.current = true; setIsSaving(true); setError(''); setCompleted(0);
    let confirmed = 0;
    try {
      await form.validateAndRun(values, async (data) => {
        if (!mounted.current) return;
        if (!catalog.current.loaded) { setError('O catálogo ainda não foi carregado. Aguarde ou reabra o formulário.'); return; }
        const missing = data.items.find((item) => !catalog.current.products.some((product) => product.id === item.productId
          && (!item.variationId || product.variations?.some((variation) => variation.id === item.variationId))));
        if (missing) { setError(`Produto ou variação não encontrado: ${missing.description}.`); return; }
        const movementDate = new Date(`${data.date}T12:00:00`).toISOString();
        for (const item of data.items) {
          if (!mounted.current) return;
          if (latest.current.status === 'cancelled' || latest.current.stockProcessed) throw new Error('O pedido mudou.');
          const product = catalog.current.products.find((current) => current.id === item.productId);
          if (!product) throw new Error('O produto não está mais disponível no catálogo.');
          const variation = product.variations?.find((current) => current.id === item.variationId);
          if (item.variationId && !variation) throw new Error('A variação não está mais disponível no catálogo.');
          const result = await withTimeout(saveInventoryMove({
            productId: item.productId,
            variationId: item.variationId,
            productDescription: item.description,
            type: 'entry',
            quantity: item.quantity,
            date: movementDate,
            label: `Entrada a partir do Pedido #${purchase.purchaseNumber || purchase.id?.slice(-4)}`,
            observation: data.observation,
            unitCost: item.unitCost,
            relatedEntityId: data.purchaseId,
            relatedEntityType: 'purchase_order',
          }, variation ? Number(variation.stock || 0) : Number(product.stock || 0))
            .then((saved) => ({ saved })), 30_000, null, 'estoque:compra:movimento');
          if (!mounted.current) return;
          if (!result?.saved?.id) throw { uncertain: true };
          confirmed += 1; setCompleted(confirmed);
        }
        if (!mounted.current) return;
        const result = await withTimeout(updatePurchase(data.purchaseId, { stockProcessed: true }).then(() => true),
          30_000, false, 'estoque:compra:conclusao');
        if (!mounted.current) return;
        if (!result) throw { uncertain: true };
        toast.success('Movimentações de entrada registradas com sucesso!'); onClose();
      }, (errors) => {
        if (!mounted.current) return;
        const [path, message] = Object.entries(flattenFormErrors(errors))[0] || [];
        setError(path?.startsWith('items_') ? `Confira os itens do pedido. ${message}` : message || 'Confira os dados da entrada.');
      });
    } catch (cause) {
      if (!mounted.current) return;
      const details = cause as { uncertain?: boolean; persistedMoveId?: string };
      if (confirmed || details?.uncertain || cause instanceof TypeError) {
        replayBlocked.current = true; setBlocked(true);
        const pending = details?.persistedMoveId ? ' Um movimento foi gravado com saldo pendente.'
          : details?.uncertain || cause instanceof TypeError ? ' O resultado da última operação não foi confirmado.' : '';
        setError(`${confirmed} de ${purchase.items.length} movimentos concluídos.${pending} Consulte os movimentos e o pedido antes de repetir.`);
      } else setError('Não foi possível registrar as entradas. Confira os dados e as permissões.');
    } finally {
      locked.current = false;
      if (mounted.current) setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-40 flex items-center justify-center p-0 xl:inset-0 xl:z-50 xl:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-stock-entry-title"
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-slate-900/60 cursor-default"
        onClick={close}
      />
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-2xl xl:rounded-[2rem] xl:border xl:border-slate-100 xl:dark:border-slate-800">
        <header className="flex shrink-0 items-center justify-between bg-emerald-600 p-6 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
              Pedido #{purchase.purchaseNumber || purchase.id?.slice(-4)} · {purchase.supplierName}
            </p>
            <h2 id="purchase-stock-entry-title" className="mt-1 text-xl font-black">
              Entrada a partir deste pedido
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="rounded-xl p-2 hover:bg-white/10 transition-colors"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {isSaving && <p role="status" className="text-sm animate-pulse">Validando e gravando entradas: {completed} de {purchase.items.length} movimentos concluídos…</p>}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 text-emerald-600 shadow-lg shadow-emerald-100 dark:bg-emerald-900/20"
            >
              <i className="bi bi-plus-circle text-xl" aria-hidden="true" />
              <span className="text-[9px] font-black uppercase tracking-widest">Entrada</span>
            </button>
            <button
              type="button"
              disabled
              className="flex cursor-not-allowed flex-col items-center gap-2 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-300 opacity-60 dark:border-slate-800 dark:bg-slate-900"
            >
              <i className="bi bi-dash-circle text-xl" aria-hidden="true" />
              <span className="text-[9px] font-black uppercase tracking-widest">Saída</span>
            </button>
            <button
              type="button"
              disabled
              className="flex cursor-not-allowed flex-col items-center gap-2 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-300 opacity-60 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="text-xl leading-none" aria-hidden="true">
                ⚖
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest">Ajuste</span>
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Produto
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Quantidade
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item, index) => (
                  <tr
                    key={`${item.productId}-${item.variationId || ''}-${index}`}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-100">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-right font-black">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Data
              <input
                type="date"
                disabled={isSaving || blocked}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors"
              />
            </label>
            <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:col-span-2">
              Observação
              <textarea
                disabled={isSaving || blocked}
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                rows={2}
                className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={isSaving || blocked}
            onClick={handleSave}
            className="w-full rounded-2xl bg-emerald-600 py-4 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 shadow-md"
          >
            {isSaving ? 'Registrando...' : 'Confirmar movimentações de entrada'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PurchaseStockEntryModal;
