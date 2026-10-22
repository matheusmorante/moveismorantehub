import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PackageMinus, PackagePlus, Scale } from 'lucide-react';
import Product, { Variation } from '../../../types/product.type';
import { saveInventoryMove, subscribeToInventoryMoves } from '@/pages/utils/inventoryService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { stockLaunchFormSchema } from '../../../../../../shared-utils/inventoryMoveSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import InventoryMove from '../../../types/inventoryMove.type';
import { calculateInventoryTimelineBalance } from '@/pages/utils/inventoryTimelineBalance';

export interface StockLaunchModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly targetProduct: Product | null;
  readonly targetVariation?: Variation;
  readonly currentStock?: number;
}

export type LaunchType = 'entry' | 'exit' | 'adjustment';

interface VariationDisplayNameLike extends Partial<Variation> {
  readonly displayName?: string;
}

/**
 * Modal rápido para lançamento manual de entrada, saída ou ajuste de inventário de produtos e variações.
 */
export const StockLaunchModal: React.FC<StockLaunchModalProps> = (props) => {
  if (!props.isOpen || !props.targetProduct) return null;
  if (props.targetProduct.itemType === 'composition') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Saldo de produto composto">
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={props.onClose} aria-hidden="true" />
        <div className="relative w-full max-w-md rounded-3xl border border-blue-100 bg-white p-7 shadow-2xl dark:border-blue-900 dark:bg-slate-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <i className="bi bi-boxes text-2xl" aria-hidden="true" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Produto Composto</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            O saldo é calculado pelos produtos componentes. Registre entradas e saídas diretamente nos componentes; este produto não recebe movimentações.
          </p>
          <button type="button" onClick={props.onClose} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700">
            Entendi
          </button>
        </div>
      </div>
    );
  }
  return (
    <StockLaunchEditor
      key={JSON.stringify([props.targetProduct.id, props.targetVariation?.id || props.targetProduct.variations?.[0]?.id])}
      {...props}
      targetProduct={props.targetProduct}
    />
  );
};

function StockLaunchEditor({ onClose, targetProduct, targetVariation, currentStock: propCurrentStock }:
  StockLaunchModalProps & { targetProduct: Product }) {
  const [type, setType] = useState<LaunchType>('entry');
  const [quantity, setQuantity] = useState<number>(0);
  const [newDesiredStock, setNewDesiredStock] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const locked = useRef(false), blocked = useRef(false), mounted = useRef(false);
  const close = () => { if (!locked.current) onClose(); };
  const [moves, setMoves] = useState<readonly InventoryMove[]>([]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToInventoryMoves((data) => { if (active) setMoves(data || []); });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    mounted.current = true;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !locked.current) onClose(); };
    window.addEventListener('keydown', escape);
    return () => { mounted.current = false; window.removeEventListener('keydown', escape); };
  }, [onClose]);

  const activeVariation = targetVariation || targetProduct?.variations?.[0];
  const variationWithDisplayName = activeVariation as VariationDisplayNameLike | undefined;
  const variationName = activeVariation?.name || variationWithDisplayName?.displayName || '';

  // Calcula o saldo dinamicamente a partir das movimentações reais
  const currentStock = useMemo(() => {
    if (!targetProduct) return 0;

    const targetVarId = activeVariation?.id;
    const relevantMoves = moves.filter((m) => {
      if (m.status === 'cancelled') return false;
      if (m.productId !== targetProduct.id) return false;
      if (targetVarId && m.variationId) {
        return String(m.variationId) === String(targetVarId);
      }
      return true;
    });

    const timelineBalance = calculateInventoryTimelineBalance(relevantMoves);
    if (timelineBalance !== null) return timelineBalance;

    if (propCurrentStock !== undefined) return propCurrentStock;
    return Number(
      activeVariation?.stock !== undefined ? activeVariation.stock : targetProduct.stock || 0
    );
  }, [targetProduct, activeVariation, propCurrentStock, moves]);

  const fullDisplayName = variationName.trim() || 'Variação não identificada';
  const adjustmentDiff = newDesiredStock !== '' ? Number(newDesiredStock) - currentStock : 0;
  const values = { productId: targetProduct.id || '', variationId: activeVariation?.id || '', productDescription: fullDisplayName,
    type, quantity, currentStock, newDesiredStock, observation: reason };
  const form = useZodForm(stockLaunchFormSchema, values);
  const latestStock = useRef(currentStock); latestStock.current = currentStock;
  const handleSave = async () => {
    if (locked.current || blocked.current) return;
    locked.current = true; setIsSaving(true); setError('');
    try {
      await form.validateAndRun(values, async (data) => {
        if (!mounted.current) return;
        if (data.type === 'balance' && latestStock.current !== data.currentStock) {
          setError('O saldo mudou durante a validação. Confira o saldo atualizado antes de ajustar.'); return;
        }
        const { currentStock: previousStock, ...move } = data;
        const result = await withTimeout(saveInventoryMove({ ...move, date: new Date().toISOString(), label: data.observation }, previousStock)
          .then((saved) => ({ saved })), 30_000, null, 'estoque:manual');
        if (!mounted.current) return;
        if (!result?.saved?.id) throw { uncertain: true };
        toast.success('Movimentação registrada com sucesso! ✨');
        onClose();
      }, (errors) => {
        if (!mounted.current) return;
        const message = Object.values(flattenFormErrors(errors))[0] || 'Confira a movimentação.';
        setError(message); toast.error(message);
      });
    } catch (cause) {
      if (!mounted.current) return;
      const details = cause as { uncertain?: boolean; persistedMoveId?: string };
      if (details?.uncertain || cause instanceof TypeError) {
        blocked.current = true; setUncertain(true);
        setError(details?.persistedMoveId ? 'O movimento foi gravado, mas o saldo não foi confirmado. Consulte o estoque antes de repetir.'
          : 'Não foi possível confirmar a gravação. Consulte os movimentos antes de repetir.');
      } else setError('Não foi possível gravar a movimentação. Confira os dados e as permissões.');
    } finally {
      locked.current = false;
      if (mounted.current) setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Nova Movimentação de Estoque"
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in cursor-pointer"
        onClick={close}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
        {/* Header Dinâmico */}
        <div
          className={`flex items-center justify-between px-8 py-5 transition-colors text-white ${
            type === 'entry' ? 'bg-emerald-600' : type === 'exit' ? 'bg-rose-600' : 'bg-amber-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <i className="bi bi-arrow-left-right text-lg" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Nova Movimentação de Estoque
              </h3>
              <p className="text-[11px] font-medium text-white/80">
                {type === 'entry'
                  ? 'Entrada no estoque'
                  : type === 'exit'
                    ? 'Saída do estoque'
                    : 'Ajuste de inventário'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <i className="bi bi-x-lg text-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {isSaving && <p role="status" className="text-sm animate-pulse">Validando e gravando a movimentação…</p>}
          {/* Resumo do Produto Selecionado */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 shrink-0">
                <i className="bi bi-box-seam text-lg" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {fullDisplayName}
                </h4>
                <p className="text-xs text-slate-500 font-medium tracking-tight mt-0.5">
                  Saldo Atual:{' '}
                  <span className="font-black text-slate-700 dark:text-slate-200">
                    {currentStock} {targetProduct.unit || 'UN'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Tipo de Movimentação */}
          <div className="grid grid-cols-3 gap-3">
            {(['entry', 'exit', 'adjustment'] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={isSaving || uncertain}
                onClick={() => setType(t)}
                className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  type === t
                    ? t === 'entry'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/20 shadow-lg shadow-emerald-100 dark:shadow-none'
                      : t === 'exit'
                        ? 'bg-red-50 border-red-500 text-red-600 dark:bg-red-900/20 shadow-lg shadow-red-100 dark:shadow-none'
                        : 'bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-900/20 shadow-lg shadow-amber-100 dark:shadow-none'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                }`}
              >
                {t === 'entry' ? (
                  <PackagePlus className="h-6 w-6" aria-hidden="true" />
                ) : t === 'exit' ? (
                  <PackageMinus className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Scale className="h-6 w-6" aria-hidden="true" />
                )}
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {t === 'entry' ? 'Entrada' : t === 'exit' ? 'Saída' : 'Ajuste'}
                </span>
              </button>
            ))}
          </div>

          {/* Formulário de Quantidade / Novo Saldo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {type === 'adjustment' ? (
              <div className="space-y-1.5">
                <label htmlFor="manual-stock-desired" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Novo Saldo do Produto
                </label>
                <input
                  id="manual-stock-desired"
                  type="number"
                  value={newDesiredStock}
                  onChange={(e) => setNewDesiredStock(e.target.value)}
                  placeholder={`Saldo atual: ${currentStock}`}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors"
                  disabled={isSaving || uncertain}
                  autoFocus
                />
                {newDesiredStock !== '' && (
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1.5">
                    <span>Ajuste resultante:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                        adjustmentDiff > 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : adjustmentDiff < 0
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {adjustmentDiff > 0 ? `+${adjustmentDiff}` : adjustmentDiff}{' '}
                      {targetProduct.unit || 'un'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="manual-stock-quantity" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Quantidade *
                </label>
                <input
                  id="manual-stock-quantity"
                  type="number"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="0"
                  min="1"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                  disabled={isSaving || uncertain}
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="manual-stock-reason" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Motivo / Observação *
              </label>
              <input
                id="manual-stock-reason"
                type="text"
                disabled={isSaving || uncertain}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Balanço de estoque, contagem física..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          {/* Botão de Confirmação */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || uncertain}
            className={`w-full py-3.5 rounded-xl font-black uppercase tracking-wider text-xs text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              type === 'entry'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none'
                : type === 'exit'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none'
                  : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none'
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <i className="bi bi-check2 text-base" aria-hidden="true" />
                <span>Confirmar Movimentação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StockLaunchModal;
