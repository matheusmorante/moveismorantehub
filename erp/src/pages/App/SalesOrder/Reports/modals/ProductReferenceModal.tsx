import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { salesReportReferenceRowSchema, salesReportReferenceWriteFormSchema, salesReportReferenceQueryFormSchema } from '../../../../../../../shared-utils/salesReportFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

interface ProductReference {
  id: string;
  master_name: string;
  reference_name: string;
}

interface ProductReferenceModalProps {
  isOpen: boolean;
  readOnly?: boolean;
  contextKey?: string;
  onClose: () => void;
  availableProducts: { name: string; supplier: string }[];
}

const ProductReferenceModal: React.FC<ProductReferenceModalProps> = ({
  isOpen,
  readOnly = false,
  contextKey = '',
  onClose,
  availableProducts,
}) => {
  const { user } = useAuth();
  const [references, setReferences] = useState<ProductReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const busy = loading || queryCount > 0;
  const [newMaster, setNewMaster] = useState('');
  const [newReference, setNewReference] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  const uniqueSuppliers = useMemo(() => {
    const suppliers = availableProducts.map((i) => i.supplier).filter(Boolean);
    return Array.from(new Set(suppliers)).sort();
  }, [availableProducts]);

  const filteredSuggestions = useMemo(() => {
    return availableProducts.filter((p) => !selectedSupplier || p.supplier === selectedSupplier);
  }, [availableProducts, selectedSupplier]);

  const [error, setError] = useState('');
  const busyRef = useRef(false); const mountedRef = useRef(true);
  const scope = JSON.stringify([user?.id, contextKey, isOpen, readOnly]);
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const uncertainRef = useRef(new Set<string>());
  const intentRef = useRef<{ signature: string; id: string } | null>(null);
  const writeForm = useZodForm(salesReportReferenceWriteFormSchema, { intent: 'add', id: '00000000-0000-4000-8000-000000000000', masterName: newMaster, referenceName: newReference });
  const { enqueueAndRun: validateQuery } = useZodForm(salesReportReferenceQueryFormSchema, { intent: 'list' });
  const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) => setError(Object.values(flattenFormErrors(errors))[0] || 'Confira a referência.');
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const fetchReferences = useCallback(async () => {
    const submittedScope = scopeRef.current;
    try {
      return await validateQuery({ intent: 'list' }, async () => {
        if (!mountedRef.current || scopeRef.current !== submittedScope) return false;
        setQueryCount(count => count + 1);
        let response;
        try { response = await withTimeout(supabase.from('product_references').select('*').order('master_name', { ascending: true }), 15_000, null, 'Consultar referências do relatório'); }
        finally { if (mountedRef.current) setQueryCount(count => Math.max(0, count - 1)); }
        if (!mountedRef.current || scopeRef.current !== submittedScope) return false;
        if (!response || response.error) throw new Error(response?.error?.message || 'A consulta de referências excedeu o prazo.');
        const receipt = z.array(salesReportReferenceRowSchema).safeParse(response.data);
        if (!receipt.success) throw new Error('O servidor retornou referências inválidas.');
        setReferences(receipt.data); return true;
      });
    } catch (failure) { if (mountedRef.current && scopeRef.current === submittedScope) setError(failure instanceof Error ? failure.message : 'Não foi possível consultar as referências.'); return false; }
  }, [validateQuery]);
  useEffect(() => { if (isOpen) { setReferences([]); setError(''); void fetchReferences(); } }, [isOpen, scope, fetchReferences]);
  const writeReference = async (command: z.input<typeof salesReportReferenceWriteFormSchema>) => {
    if (busyRef.current) return false;
    if (!user?.id || readOnly) { setError('Entre com uma conta autorizada para alterar referências.'); return false; }
    if (uncertainRef.current.has(scope)) { setError('Existe uma alteração de referência sem confirmação. Confira o registro antes de repetir.'); return false; }
    busyRef.current = true; setLoading(true); setError('');
    const submittedScope = scope; const isCurrent = () => mountedRef.current && scopeRef.current === submittedScope;
    let dispatched = false;
    try {
      return await writeForm.validateAndRun(command, async parsed => {
        if (!isCurrent()) return false;
        dispatched = true;
        const response = await withTimeout(parsed.intent === 'add' ? supabase.from('product_references').insert([{ id: parsed.id, master_name: parsed.masterName, reference_name: parsed.referenceName }]).select().single() : supabase.from('product_references').delete().eq('id', parsed.id).select('id'), 20_000, null, 'Gravar referência do relatório');
        if (!response) throw new Error('O servidor não confirmou a referência no prazo. Confira antes de repetir.');
        if (response.error) throw Object.assign(new Error(response.error.message), { knownFailure: /^(22|23|42)/.test(response.error.code || '') || /^PGRST20[0-5]$/.test(response.error.code || '') });
        if (parsed.intent === 'add') {
          const receipt = salesReportReferenceRowSchema.safeParse(response.data);
          if (!receipt.success || receipt.data.id !== parsed.id || receipt.data.master_name !== parsed.masterName || receipt.data.reference_name !== parsed.referenceName) throw new Error('O recibo não corresponde à referência enviada.');
          if (!isCurrent()) return false;
          setReferences(rows => [...rows.filter(row => row.id !== parsed.id), receipt.data]); setNewReference(''); intentRef.current = null;
        } else {
          const receipt = z.array(z.object({ id: z.uuid() })).safeParse(response.data);
          if (!receipt.success || receipt.data.length !== 1 || receipt.data[0].id !== parsed.id) throw new Error('A exclusão da referência não foi confirmada.');
          if (!isCurrent()) return false;
          setReferences(rows => rows.filter(row => row.id !== parsed.id));
        }
        if (!await fetchReferences() && isCurrent()) setError('Referência confirmada. Não foi possível atualizar a lista; tente carregar novamente.');
        return true;
      }, invalid);
    } catch (failure) {
      if (dispatched && !(failure instanceof Error && 'knownFailure' in failure && failure.knownFailure === true)) uncertainRef.current.add(submittedScope);
      if (isCurrent()) setError(failure instanceof Error ? failure.message : 'Não foi possível confirmar a referência.'); return false;
    } finally { busyRef.current = false; if (mountedRef.current) setLoading(false); }
  };
  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault(); const signature = JSON.stringify([scope, newMaster, newReference]);
    if (intentRef.current?.signature !== signature) intentRef.current = { signature, id: crypto.randomUUID() };
    return writeReference({ intent: 'add', id: intentRef.current.id, masterName: newMaster, referenceName: newReference });
  };
  const handleDelete = (id: string) => { if (confirm('Deseja excluir esta referência?')) return writeReference({ intent: 'delete', id, confirmed: true }); };

  const normSearch = normalizeSearchTerm(searchTerm);
  const filteredReferences = references.filter(
    (r) =>
      normalizeSearchTerm(r.master_name).includes(normSearch) ||
      normalizeSearchTerm(r.reference_name).includes(normSearch)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 w-[95vw] max-w-[1400px] h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <i className="bi bi-link-45deg text-indigo-600 text-3xl"></i> Referências de Produtos
            </h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Mapeie vários nomes para um único produto mestre
            </span>
          </div>
          <button
            aria-label="Fechar referências"
            disabled={busy}
            onClick={() => { if (!busyRef.current) onClose(); }}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-955 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"
          >
            <i className="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        {error && <p role="alert" className="px-8 py-2 text-red-600">{error} <button disabled={busy} onClick={() => void fetchReferences()}>Carregar referências</button></p>}
        {busy && <p role="status" className="px-8 py-2 text-indigo-600">Consultando e confirmando as referências...</p>}
        <div className="p-8 bg-slate-50/50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">
                  Filtrar Origem (Opcional)
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-600 dark:text-slate-300 shadow-sm"
                >
                  <option value="">Todos Fornecedores / Origens</option>
                  {uniqueSuppliers.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-1/3 text-right">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic pr-2">
                  {selectedSupplier
                    ? `${filteredSuggestions.length} itens disponíveis desta origem`
                    : `${availableProducts.length} itens totais disponíveis`}
                </p>
              </div>
            </div>

            <form onSubmit={handleAdd}
              className="flex flex-wrap gap-4 items-end bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">
                  Nome Mestre (Como aparecerá no relatório)
                </label>
                <input
                  type="text"
                  list="products"
                  value={newMaster}
                  onChange={(e) => setNewMaster(e.target.value)}
                  placeholder="Ex: Guarda-Roupa Sidney"
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">
                  Referência (Nome original no sistema)
                </label>
                <input
                  type="text"
                  list="products"
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value)}
                  placeholder="Ex: G.Roupa Sidney Branco 3p"
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={busy || readOnly}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                <i className="bi bi-plus-circle-fill mr-2"></i> Vincular
              </button>

              <datalist id="products">
                {filteredSuggestions.map((p) => (
                  <option key={p.name} value={p.name} />
                ))}
              </datalist>
            </form>
          </div>
        </div>

        <div className="px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Pesquisar vínculos já existentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-transparent rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {loading && references.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <i className="bi bi-arrow-clockwise animate-spin text-4xl mb-4 text-indigo-500"></i>
              <p className="text-xs font-black uppercase tracking-widest">
                Carregando referências...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReferences.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-5 bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                        Original
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
                        {ref.reference_name}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center">
                      <i className="bi bi-arrow-right text-indigo-400"></i>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">
                        Mestre
                      </span>
                      <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 leading-tight">
                        {ref.master_name}
                      </span>
                    </div>
                  </div>
                  <button
                    disabled={busy || readOnly}
                    aria-label={`Excluir referência ${ref.reference_name}`}
                    onClick={() => handleDelete(ref.id)}
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 hover:text-red-500 hover:shadow-md transition-all sm:opacity-0 group-hover:opacity-100"
                  >
                    <i className="bi bi-trash3-fill text-sm"></i>
                  </button>
                </div>
              ))}
              {filteredReferences.length === 0 && (
                <div className="col-span-2 text-center py-20">
                  <i className="bi bi-link-45deg text-5xl text-slate-100 dark:text-slate-800 mb-4 block"></i>
                  <p className="text-xs font-bold text-slate-400">
                    Nenhuma referência encontrada para esta busca.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            Total de {references.length} vínculos mapeados no sistema
          </p>
          <button
            onClick={onClose}
            className="px-12 py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
          >
            Concluir e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductReferenceModal;
