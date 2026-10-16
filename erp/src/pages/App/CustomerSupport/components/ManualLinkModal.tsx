import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  CustomerSummary,
  CUSTOMER_QUERY_COLUMNS,
  mapPersonToSummary,
  manuallyLinkCustomer,
} from '@/pages/utils/customerSupport/customerMatchingService';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';

const searchSchema = z.object({
  searchTerm: z
    .string()
    .min(2, 'Informe pelo menos 2 caracteres para pesquisar cliente por nome, CPF ou telefone.'),
});

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: { searchTerm: '' },
  });

  if (!isOpen) return null;

  const onSearchSubmit = async (data: SearchFormData) => {
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const term = data.searchTerm.trim();
      const cleanDigits = term.replace(/\D/g, '');

      let query = supabase
        .from('people')
        .select(CUSTOMER_QUERY_COLUMNS)
        .or('deleted.is.null,deleted.eq.false');

      if (cleanDigits.length >= 3) {
        query = query.or(
          `full_name.ilike.%${term}%,cpf_cnpj.ilike.%${cleanDigits}%,phone.ilike.%${cleanDigits}%`
        );
      } else {
        query = query.ilike('full_name', `%${term}%`);
      }

      const { data: peopleData, error } = await query.limit(15);
      if (error) throw error;

      setResults((peopleData || []).map(mapPersonToSummary));
    } catch (err: any) {
      console.error('[ManualLinkModal] Erro na busca:', err);
      setErrorMessage(err.message || 'Erro ao consultar clientes no banco.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkCustomer = async (customer: CustomerSummary) => {
    setIsLinking(true);
    try {
      const res = await manuallyLinkCustomer(supabase, conversationId, customer.id);
      if (!res.success) {
        setErrorMessage(res.error || 'Falha ao vincular cliente.');
        return;
      }
      onLinked(customer);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao vincular cliente.');
    } finally {
      setIsLinking(false);
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
                placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
                className="w-full pl-8 pr-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
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
          <div className="mt-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
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
                disabled={isLinking}
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
