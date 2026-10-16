import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { inventoryBatchEditCommandFormSchema, priceHistoryQueryFormSchema } from '../../../../../../shared-utils/catalogFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import CurrencyInput from '@/components/CurrencyInput';
import { formatCurrency, formatDateTime } from '@/pages/utils/formatters';
import Product from '@/pages/types/product.type';
import { updateInventoryMove } from '@/pages/utils/inventoryService';
import { toast } from 'react-toastify';
import {
  InventoryMoveEntry,
  PriceHistoryEntry,
  loadBatchHistory,
  loadPriceHistory,
} from '../priceHistory';

interface PriceHistoryModalProps {
  readonly product?: Product | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = (props) => props.isOpen
  ? <PriceHistoryEditor {...props} key={props.product ? props.product.id || 'unidentified' : 'all'} /> : null;

const PriceHistoryEditor: React.FC<PriceHistoryModalProps> = ({
  product,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'prices' | 'batches'>('prices');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [batchHistory, setBatchHistory] = useState<InventoryMoveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<number>(0);
  const [editQty, setEditQty] = useState<number>(0);
  const [editingEntry, setEditingEntry] = useState<InventoryMoveEntry | null>(null);
  const scopeId = product ? product.id || '' : undefined;
  const form = useZodForm(inventoryBatchEditCommandFormSchema, { quantity: editQty, unitCost: editCost, moveId: '', productId: '', previousQuantity: 0, previousUnitCost: 0 });
  const { validateValues: validateQuery } = useZodForm(priceHistoryQueryFormSchema, { productId: scopeId, tab: activeTab });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [queryError, setQueryError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const mounted = useRef(false), locked = useRef(false), replayBlocked = useRef(false), request = useRef(0);
  const close = () => { if (!locked.current) onClose(); };

  useEffect(() => {
    mounted.current = true;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !locked.current) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { mounted.current = false; window.removeEventListener('keydown', handleKeyDown); };
  }, [onClose]);

  const fetchData = useCallback(async () => {
    const revision = ++request.current;
    setLoading(true); setQueryError('');
    const current = () => mounted.current && revision === request.current;
    try {
      const values = await validateQuery({ productId: scopeId, tab: activeTab }, (errors) => {
        if (current()) setQueryError(Object.values(flattenFormErrors(errors))[0] || 'Confira a consulta do histórico.');
      });
      if (!values || !current()) return false;
      if (values.tab === 'prices') {
        const result = await withTimeout(loadPriceHistory(values.productId).then((rows) => ({ rows })), 15_000, null, 'historico:precos');
        if (!current()) return false;
        if (!result) throw new Error('Consulta sem confirmação.');
        setPriceHistory(result.rows);
      } else {
        const result = await withTimeout(loadBatchHistory(values.productId).then((rows) => ({ rows })), 15_000, null, 'historico:lotes');
        if (!current()) return false;
        if (!result) throw new Error('Consulta sem confirmação.');
        setBatchHistory(result.rows);
      }
      return true;
    } catch {
      if (current()) setQueryError('Não foi possível consultar o histórico. Tente carregar novamente.');
      return false;
    } finally {
      if (current()) setLoading(false);
    }
  }, [activeTab, scopeId, validateQuery]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (locked.current || replayBlocked.current || !editingEntry) return;
    locked.current = true; setIsSaving(true); setError('');
    try {
      await form.validateAndRun({ quantity: editQty, unitCost: editCost, moveId: editingId || '', productId: editingEntry.product_id,
        previousQuantity: Number(editingEntry.quantity), previousUnitCost: Number(editingEntry.unit_cost ?? 0) }, async (values) => {
        if (!mounted.current) return;
        const result = await withTimeout(updateInventoryMove(values.moveId, { quantity: values.quantity, unitCost: values.unitCost },
          { productId: values.productId, quantity: values.previousQuantity, unitCost: values.previousUnitCost }).then((move) => ({ move })),
          30_000, null, 'historico:editar-lote');
        if (!mounted.current) return;
        if (!result?.move?.id) throw { uncertain: true };
        setEditingId(null); setEditingEntry(null);
        toast.success('Lote atualizado com sucesso!');
        if (!await fetchData() && mounted.current) setError('O lote foi atualizado, mas o histórico não pôde ser recarregado.');
      }, (errors) => { if (mounted.current) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira os valores do lote.'); });
    } catch (cause) {
      if (!mounted.current) return;
      const details = cause as { uncertain?: boolean; persistedMoveId?: string };
      if (details?.uncertain || cause instanceof TypeError) {
        replayBlocked.current = true; setUncertain(true);
        setError(details?.persistedMoveId ? 'A alteração foi gravada, mas o saldo não foi confirmado. Consulte o estoque antes de repetir.'
          : 'A alteração não foi confirmada. Consulte o histórico antes de repetir.');
      } else setError(cause instanceof Error ? cause.message : 'Não foi possível alterar o lote. Confira os dados e as permissões.');
    } finally { locked.current = false; if (mounted.current) setIsSaving(false); }
  };

  const currentListCount = (activeTab === 'prices' ? priceHistory : batchHistory).length;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-history-modal-title"
        className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/5 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
                <i className="bi bi-clock-history text-white text-xl" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="price-history-modal-title"
                  className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight"
                >
                  Históricos
                </h2>
                <p className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-widest mt-0.5">
                  {product ? `Produto: ${product.description}` : 'Auditoria Geral'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar modal"
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100 dark:border-slate-700 cursor-pointer"
            >
              <i className="bi bi-x-lg text-lg" aria-hidden="true" />
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit"
            role="tablist"
            aria-label="Abas de histórico"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'prices'}
              disabled={isSaving}
              onClick={() => { if (!locked.current) { setActiveTab('prices'); setEditingId(null); setEditingEntry(null); if (!replayBlocked.current) setError(''); } }}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'prices'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <i className="bi bi-tags-fill mr-2" aria-hidden="true" />
              Preços de Venda
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'batches'}
              disabled={isSaving}
              onClick={() => { if (!locked.current) setActiveTab('batches'); }}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'batches'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <i className="bi bi-box-fill mr-2" aria-hidden="true" />
              Entradas (Lotes/Custo)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
          {error && <p role="alert" className="m-4 text-sm text-red-700">{error}</p>}
          {isSaving && <p role="status" className="m-4 text-sm animate-pulse">Validando e atualizando o lote…</p>}
          {queryError && <div role="alert" className="m-4 text-sm text-red-700">{queryError}
            <button type="button" disabled={isSaving} onClick={() => { void fetchData(); }} className="ml-2 underline">Carregar novamente</button>
          </div>}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Carregando histórico...
              </p>
            </div>
          ) : currentListCount === 0 && !queryError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-30">
              <i
                className={`bi ${activeTab === 'prices' ? 'bi-journal-x' : 'bi-box-seam'} text-5xl text-slate-400`}
                aria-hidden="true"
              />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                Nenhum registro encontrado
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md z-10 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th
                    scope="col"
                    className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400"
                  >
                    Data e Hora
                  </th>
                  {activeTab === 'prices' ? (
                    <>
                      {!product && (
                        <th
                          scope="col"
                          className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400"
                        >
                          Produto
                        </th>
                      )}
                      <th
                        scope="col"
                        className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right"
                      >
                        Novo Preço
                      </th>
                      <th
                        scope="col"
                        className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right"
                      >
                        Novo Custo
                      </th>
                      <th
                        scope="col"
                        className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center"
                      >
                        Alteração
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        scope="col"
                        className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right"
                      >
                        Quantidade
                      </th>
                      <th
                        scope="col"
                        className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right"
                      >
                        Custo do Lote
                      </th>
                      <th
                        scope="col"
                        className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400"
                      >
                        Etiqueta/Obs
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {activeTab === 'prices'
                  ? priceHistory.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                            {formatDateTime(entry.changed_at)}
                          </span>
                        </td>
                        {!product && (
                          <td className="px-8 py-5">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                              {entry.product_description}
                            </span>
                          </td>
                        )}
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                              {formatCurrency(entry.new_unit_price)}
                            </span>
                            {entry.old_unit_price !== entry.new_unit_price && (
                              <span className="text-[9px] text-slate-400 line-through">
                                {formatCurrency(entry.old_unit_price)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(entry.new_cost_price)}
                            </span>
                            {entry.old_cost_price !== entry.new_cost_price && (
                              <span className="text-[9px] text-slate-400 line-through">
                                {formatCurrency(entry.old_cost_price)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span
                            className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                              entry.change_type === 'unit_price'
                                ? 'bg-blue-100 text-blue-600'
                                : entry.change_type === 'cost_price'
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-indigo-100 text-indigo-600'
                            }`}
                          >
                            {entry.change_type === 'unit_price'
                              ? 'Venda'
                              : entry.change_type === 'cost_price'
                                ? 'Custo'
                                : 'Ambos'}
                          </span>
                        </td>
                      </tr>
                    ))
                  : batchHistory.map((entry) => (
                      <tr
                        key={entry.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${editingId === entry.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      >
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                            {formatDateTime(entry.date)}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          {editingId === entry.id ? (
                            <input
                              type="number"
                              disabled={isSaving || uncertain}
                              aria-label="Editar quantidade"
                              value={editQty}
                              onChange={(e) => setEditQty(Number(e.target.value))}
                              className="w-20 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 text-right text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                {entry.quantity} un
                              </span>
                              <span
                                className={`text-[9px] font-bold ${entry.balance && entry.balance > 0 ? 'text-emerald-500' : 'text-slate-400'}`}
                              >
                                {entry.balance} dispon.
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          {editingId === entry.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] font-black text-slate-400">R$</span>
                              <CurrencyInput
                                id="batch-edit-cost"
                                label="Editar custo"
                                disabled={isSaving || uncertain}
                                value={editCost}
                                onChangeValue={(val) => setEditCost(val)}
                                showBadge={false}
                                className="w-24 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded px-2 py-1 text-right text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                              {formatCurrency(entry.unit_cost || 0)}
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {entry.label}
                              </span>
                              {entry.observation && (
                                <p className="text-[10px] text-slate-400 italic">
                                  {entry.observation}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {editingId === entry.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving || uncertain}
                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100 dark:shadow-none cursor-pointer"
                                    title="Confirmar"
                                  >
                                    {isSaving ? (
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <i className="bi bi-check-lg" aria-hidden="true" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => { if (!locked.current) { setEditingId(null); setEditingEntry(null); if (!replayBlocked.current) setError(''); } }}
                                    className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg hover:bg-slate-200 cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <i className="bi bi-x-lg" aria-hidden="true" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isSaving || uncertain || loading || !!queryError}
                                  onClick={() => {
                                    if (locked.current || replayBlocked.current) return;
                                    setEditingId(entry.id);
                                    setEditingEntry({ ...entry }); setError('');
                                    setEditCost(Number(entry.unit_cost ?? 0));
                                    setEditQty(Number(entry.quantity));
                                  }}
                                  className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all cursor-pointer"
                                  title="Editar Lote"
                                >
                                  <i className="bi bi-pencil-square" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            Total: {currentListCount} registros
          </p>
          <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-tight">
            Rastreabilidade Morante Hub v2.0
          </p>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0, 0, 0.2, 1) forwards; }
            `,
        }}
      />
    </div>
  );
};

export default PriceHistoryModal;
