import React, { useState, useEffect, useRef } from 'react';
import type { AuditItem } from '../types/inventoryAudit.types';
import { supabase } from '@/pages/utils/supabaseConfig';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { inventoryAuditReviewFormSchema, inventoryAuditReviewQuerySchema } from '../../../../../../../shared-utils/inventoryAuditFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

type ReviewedItem = AuditItem & { reconciledExpected: number; difference: number };
type InventoryMove = {
  product_id: string; variation_id: string | null; type: string;
  quantity: number | string | null; observation: string | null; status: string | null;
};
class InvalidInventorySource extends Error {}

interface InventoryReviewModalProps {
  readonly items: AuditItem[];
  readonly startDate: string; // The date when the inventory was created (snapshot)
  readonly hasStages?: boolean;
  readonly canFinalize: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (
    itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number; difference: number }>
  ) => void | boolean | Promise<void | boolean>;
}

export const InventoryReviewModal: React.FC<InventoryReviewModalProps> = (props) => (
  <InventoryReviewEditor key={JSON.stringify([props.startDate, props.items])} {...props} />
);

const InventoryReviewEditor: React.FC<InventoryReviewModalProps> = ({
  items,
  startDate,
  canFinalize,
  onCancel,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(true);
  const [reconcileError, setReconcileError] = useState(false);
  const [reconciledItems, setReconciledItems] = useState<ReviewedItem[]>([]);
  const [uncountedCount, setUncountedCount] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [sourceInvalid, setSourceInvalid] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const mounted = useRef(false), locked = useRef(false), replayBlocked = useRef(false);
  const [queryValues] = useState(() => ({ items: items.map((item) => ({ ...item })), startDate }));
  const queryForm = useZodForm(inventoryAuditReviewQuerySchema, queryValues);
  const { validateValues: validateQuery } = queryForm;
  const form = useZodForm(inventoryAuditReviewFormSchema, {
    items: reconciledItems.filter((item) => item.physicalCount !== null).map((item) => ({ ...item, physicalCount: item.physicalCount! })),
  });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !locked.current) onCancel(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onCancel]);

  useEffect(() => {
    let active = true;
    let querying = true;
    const current = () => active && querying;
    const reconcile = async () => {
      setReconcileError(false);
      const applyMoves = (source: AuditItem[], moves: InventoryMove[]) => {
        const reconciled = source.map((item) => {
          if (item.physicalCount === null) {
            return { ...item, reconciledExpected: item.systemStock, difference: 0 };
          }

          // Find moves for this variation
          const variationMoves = moves.filter(
            (m) =>
              String(m.product_id) === item.productId &&
              (item.variationId ? String(m.variation_id) === item.variationId : !m.variation_id)
          );

          // Filter out any moves that are from THIS inventory session (they shouldn't exist yet, but just in case)
          // and filter only entry/exit moves that actually change the physical amount during the count
          const validMoves = variationMoves.filter((m) => {
            try {
              const meta = JSON.parse(m.observation || '{}');
              if (
                m.status === 'reversed' ||
                m.status === 'cancelled' ||
                meta.status === 'reversed' ||
                meta.status === 'cancelled'
              )
                return false;
              return !meta.inventoryAudit && m.type !== 'adjustment'; // we assume adjustments are absolute anchors, but let's stick to entry/exit
            } catch {
              return (
                m.status !== 'reversed' &&
                m.status !== 'cancelled' &&
                (m.type === 'entry' || m.type === 'exit')
              );
            }
          });

          let delta = 0;
          for (const m of validMoves) {
            if (m.type === 'entry') delta += Number(m.quantity);
            else if (m.type === 'exit') delta -= Number(m.quantity);
          }

          const reconciledExpected = item.systemStock + delta;
          const difference = item.physicalCount - reconciledExpected;
          if (!Number.isFinite(reconciledExpected) || !Number.isFinite(difference))
            throw new InvalidInventorySource('Os saldos do inventário são inválidos. Revise a contagem antes de concluir.');

          return {
            ...item,
            reconciledExpected,
            difference,
          };
        });

        if (!active) return;
        setUncountedCount(source.filter((item) => item.physicalCount === null).length);
        setReconciledItems(reconciled);
      };
      try {
        const parsed = await validateQuery(queryValues, (errors) => {
          if (!active) return;
          setSourceInvalid(true);
          setError(`Revise os dados do inventário: ${Object.values(flattenFormErrors(errors))[0] || 'dados inválidos.'}`);
        });
        if (!active || parsed === false) return;
        try {
          if (typeof navigator !== 'undefined' && navigator.onLine === false)
            throw new Error('Inventário revisado offline');
          const loadMoves = async () => {
            const moves: InventoryMove[] = [];
            const productIds = [...new Set(parsed.items.map((item) => item.productId).filter(Boolean))];
            for (let offset = 0; offset < productIds.length; offset += 50) {
              const chunk = productIds.slice(offset, offset + 50);
              for (let from = 0; ; from += 200) {
                if (!current()) return null;
                const { data, error: queryError } = await supabase
                  .from('inventory_moves')
                  .select('product_id, variation_id, type, quantity, observation, status')
                  .in('product_id', chunk)
                  .gte('date', parsed.startDate)
                  .order('date', { ascending: true })
                  .range(from, from + 199);
                if (!current()) return null;
                if (queryError) throw queryError;
                if (data !== null && (!Array.isArray(data) || data.some((move) =>
                  typeof move?.product_id !== 'string' || !move.product_id ||
                  (move.variation_id !== null && typeof move.variation_id !== 'string') ||
                  typeof move.type !== 'string' ||
                  !['number', 'string'].includes(typeof move.quantity) ||
                  (typeof move.quantity === 'string' && !move.quantity.trim()) ||
                  !Number.isFinite(Number(move.quantity))
                ))) throw new InvalidInventorySource('As movimentações retornaram saldos inválidos. Confira o estoque antes de concluir.');
                moves.push(...(data || []));
                if (!data || data.length < 200) break;
              }
            }
            return moves;
          };
          const result = await withTimeout(loadMoves().then((moves) => ({ moves })),
            15_000, null, 'inventario:reconciliar');
          querying = false;
          if (!active) return;
          if (result === null) throw new Error('Tempo de consulta esgotado');
          if (result.moves) applyMoves(parsed.items, result.moves);
        } catch (cause) {
          querying = false;
          if (!active) return;
          if (cause instanceof InvalidInventorySource) throw cause;
          setReconcileError(true);
          applyMoves(parsed.items, []);
        }
      } catch (cause) {
        if (!active) return;
        setSourceInvalid(true);
        setError(cause instanceof InvalidInventorySource ? cause.message : 'Não foi possível validar os dados do inventário.');
      } finally {
        querying = false;
        if (active) setLoading(false);
      }
    };

    void reconcile();
    return () => { active = false; querying = false; };
  }, [queryValues, validateQuery]);

  const close = () => { if (!locked.current) onCancel(); };
  const handleConfirm = async () => {
    if (!mounted.current || locked.current || loading || sourceInvalid || replayBlocked.current) return;
    locked.current = true;
    setIsConfirming(true); setError('');
    try {
      await form.validateAndRun({
        items: reconciledItems.filter((item) => item.physicalCount !== null).map((item) => ({ ...item, physicalCount: item.physicalCount! })),
      }, async (parsed) => {
        if (!mounted.current) return false;
        const result = await withTimeout(Promise.resolve(onConfirm(parsed.items)).then((value) => ({ value })),
          60_000, null, 'inventario:confirmar');
        if (!mounted.current) return false;
        if (result === null) {
          replayBlocked.current = true; setBlocked(true);
          setError('A conclusão não foi confirmada no prazo. Confira o inventário antes de tentar novamente.');
          return false;
        }
        if (result.value === false) {
          setError('Não foi possível concluir o inventário. Confira os dados e tente novamente.');
          return false;
        }
        replayBlocked.current = true; setBlocked(true);
        return true;
      }, (errors) => {
        if (mounted.current) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira as contagens do inventário.');
      });
    } catch (cause) {
      if (!mounted.current) return;
      if ((cause as { uncertain?: boolean })?.uncertain || cause instanceof TypeError) {
        replayBlocked.current = true; setBlocked(true);
        setError('A conclusão não foi confirmada. Confira o inventário antes de tentar novamente.');
      } else setError('Não foi possível concluir o inventário. Confira os dados e tente novamente.');
    } finally {
      locked.current = false;
      if (mounted.current) setIsConfirming(false);
    }
  };

  const itemsToAdjust = reconciledItems.filter(
    (item) => item.physicalCount !== null && item.difference !== 0
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Revisão do Inventário" aria-busy={loading || isConfirming} className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-full overflow-hidden animate-slide-up">
        <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Revisão do Inventário
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Verifique as divergências e itens não contados antes de concluir.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar revisão"
            disabled={isConfirming}
            onClick={close}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
          {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}
          {isConfirming && <p role="status" className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-700"><i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />Validando e concluindo o inventário...</p>}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium">
                Reconciliando movimentações com o estoque inicial...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reconcileError && (
                <p
                  role="alert"
                  className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700"
                >
                  Sem conexão com o estoque. As divergências são estimativas locais; a submissão
                  ficará salva neste navegador.
                </p>
              )}
              {uncountedCount > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-xl">
                  <div className="flex items-start gap-3">
                    <i className="bi bi-exclamation-triangle text-amber-600 dark:text-amber-500 text-xl mt-0.5"></i>
                    <div>
                      <h4 className="font-bold text-amber-800 dark:text-amber-400">
                        Itens não contados
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                        Há <strong>{uncountedCount}</strong> variações no escopo que não receberam
                        nenhuma contagem. Eles permanecerão com o saldo intacto no sistema.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">
                    Divergências Encontradas ({itemsToAdjust.length})
                  </h4>
                </div>
                {itemsToAdjust.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <i className="bi bi-check-circle text-4xl text-emerald-500 mb-3 block"></i>
                    <p className="font-bold">Nenhuma divergência encontrada!</p>
                    <p className="text-sm mt-1">
                      Todos os itens contados batem exatamente com o estoque reconciliado.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {itemsToAdjust.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {item.supplierNames}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm shrink-0 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                          <div className="text-center">
                            <div className="text-[10px] font-black text-slate-400 uppercase">
                              Esperado
                            </div>
                            <div className="font-bold text-slate-600 dark:text-slate-400">
                              {item.reconciledExpected}
                            </div>
                          </div>
                          <i className="bi bi-arrow-right text-slate-300 dark:text-slate-600"></i>
                          <div className="text-center">
                            <div className="text-[10px] font-black text-emerald-600/70 uppercase">
                              Contado
                            </div>
                            <div className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
                              {item.physicalCount}
                            </div>
                          </div>
                          <div className="text-center w-12">
                            <div className="text-[10px] font-black text-slate-400 uppercase">
                              Ajuste
                            </div>
                            <div
                              className={`font-black text-lg ${item.difference > 0 ? 'text-blue-500' : 'text-rose-500'}`}
                            >
                              {item.difference > 0 ? '+' : ''}
                              {item.difference}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <footer className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          {!canFinalize && (
            <p role="status" className="mb-3 text-sm text-amber-700 dark:text-amber-300">
              Seu perfil pode revisar a contagem, mas precisa da permissão “Finalizar inventários” para concluir.
            </p>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={close}
              disabled={loading || isConfirming}
              className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Voltar para contagem
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!canFinalize || loading || isConfirming || sourceInvalid || blocked || reconciledItems.every((item) => item.physicalCount === null)}
              title={
                !canFinalize
                  ? 'Seu perfil precisa da permissão “Finalizar inventários”.'
                  : reconciledItems.every((item) => item.physicalCount === null)
                    ? 'Conte pelo menos um item para confirmar o inventário.'
                    : ''
              }
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Concluir Inventário
              <i className="bi bi-check2-all"></i>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default InventoryReviewModal;
