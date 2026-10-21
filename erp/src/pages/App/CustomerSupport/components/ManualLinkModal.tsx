import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  CustomerSummary,
  mapPersonToSummary,
  manuallyLinkCustomer,
} from '@/pages/utils/customerSupport/customerMatchingService';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { supportCustomerSearchSchema as searchSchema, supportCustomerLinkSchema, type SupportCustomerLinkInput } from '../../../../../../shared-utils/customerSupportFormSchemas';

type SearchFormData = z.infer<typeof searchSchema>;

interface ManualLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onLinked: (customer: CustomerSummary) => void;
}

export const ManualLinkModal: React.FC<ManualLinkModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  onLinked,
}) => {
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scopeRef = useRef({ key: `${isOpen}:${conversationId}`, generation: 0 });
  const scopeKey = `${isOpen}:${conversationId}`;
  if (scopeRef.current.key !== scopeKey) scopeRef.current = { key: scopeKey, generation: scopeRef.current.generation + 1 };
  const generation = scopeRef.current.generation;
  const linkLock = useRef(false);
  const searchRequest = useRef(0);

  const {
    register,
    handleSubmit,
    reset: resetSearch,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: { searchTerm: '' },
  });
  const linkForm = useForm<SupportCustomerLinkInput>({ resolver: zodResolver(supportCustomerLinkSchema) });

  useEffect(() => {
    setResults([]);
    setErrorMessage(null);
    setIsSearching(false);
    setIsLinking(false);
    linkLock.current = false;
    resetSearch({ searchTerm: '' });
  }, [isOpen, conversationId, resetSearch]);

  if (!isOpen) return null;

  const onSearchSubmit = async (data: SearchFormData) => {
    setIsSearching(true);
    setErrorMessage(null);
    const request = ++searchRequest.current;
    try {
      const term = data.searchTerm.trim();
      const response = await withTimeout<any>(supabase.rpc('customer_support_search_customers', {
        p_search: term,
      }), 15_000, null, 'central:pesquisa-cliente');
      const { data: peopleData, error } = response || { data: null, error: new Error('Timeout na busca de clientes') };
      if (error) throw error;

      if (generation === scopeRef.current.generation && request === searchRequest.current) setResults((peopleData || []).map(mapPersonToSummary));
    } catch {
      if (generation === scopeRef.current.generation && request === searchRequest.current) setErrorMessage('Não foi possível consultar clientes. Tente novamente.');
    } finally {
      if (generation === scopeRef.current.generation && request === searchRequest.current) setIsSearching(false);
    }
  };

  const handleLinkCustomer = async (customer: CustomerSummary) => {
    if (linkLock.current) return;
    linkLock.current = true;
    linkForm.reset({ conversationId, customerId: customer.id });
    try {
      await linkForm.handleSubmit(async (data) => {
        setIsLinking(true);
        setErrorMessage(null);
        const res = await manuallyLinkCustomer(supabase, data.conversationId, data.customerId);
        if (generation !== scopeRef.current.generation) return;
        if (!res.success) {
          setErrorMessage(res.error || 'Falha ao vincular cliente.');
          return;
        }
        onLinked(customer);
        onClose();
      }, () => setErrorMessage('Conversa ou cliente inválido. Atualize os dados antes de vincular.'))();
    } catch {
      if (generation === scopeRef.current.generation) setErrorMessage('Não foi possível vincular o cliente. Tente novamente.');
    } finally {
      if (generation === scopeRef.current.generation) {
        linkLock.current = false;
        setIsLinking(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
              <i className="bi bi-person-plus-fill"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Vincular Cliente do ERP
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Associe esta conversa ao cadastro oficial do cliente
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLinking}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

        {/* Formulário com react-hook-form + zodResolver */}
        <form onSubmit={handleSubmit(onSearchSubmit)} className="mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                {...register('searchTerm')}
                disabled={isLinking}
                placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
                className="w-full pl-8 pr-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || isLinking}
              className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSearching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <span>Buscar</span>
              )}
            </button>
          </div>
          {errors.searchTerm && (
            <p className="text-[11px] text-red-500 mt-1 font-medium">
              {errors.searchTerm.message}
            </p>
          )}
        </form>

        {errorMessage && (
          <div role="alert" className="mt-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
            {errorMessage}
          </div>
        )}

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto my-4 space-y-2 pr-1">
          {results.length === 0 && !isSearching && (
            <div className="text-center py-8 text-slate-400 text-xs">
              <i className="bi bi-people text-2xl block mb-2 opacity-50"></i>
              Digite um termo e clique em buscar para localizar o cadastro do cliente.
            </div>
          )}

          {results.map((cust) => (
            <div
              key={cust.id}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-400 dark:hover:border-blue-600 transition-all flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {cust.fullName}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    #{cust.id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {cust.phone && <span>{formatPhoneForDisplay(cust.phone)}</span>}
                  {cust.cpfCnpj && <span>{cust.cpfCnpj}</span>}
                </div>
              </div>

              <button
                type="button"
                disabled={isLinking || isSearching}
                onClick={() => handleLinkCustomer(cust)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                Vincular
              </button>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            disabled={isLinking}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
