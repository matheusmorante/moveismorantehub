import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { reconciliationSupplierResultsSchema, reconciliationSupplierSearchSchema } from '../../../../../../../shared-utils/reconciliationFormSchemas';

export type SupplierOption = { id: string; fullName: string; tradeName?: string; cpfCnpj?: string };
export function useReconciliationSupplierSearch(enabled: boolean) {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const revision = useRef(0);
  const opened = useRef(enabled); opened.current = enabled;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { validateValues } = useZodForm(reconciliationSupplierSearchSchema, { search: '' });
  const clearSearch = () => { revision.current += 1; if (timer.current) clearTimeout(timer.current); timer.current = null; setIsSearching(false); };
  useEffect(() => {
    setSuppliers([]); setSearchError(''); setIsSearching(false);
    return () => { revision.current += 1; if (timer.current) clearTimeout(timer.current); };
  }, [enabled]);
  const handleQueryChange = (term: string) => {
    clearSearch(); setSuppliers([]); setSearchError('');
    if (!opened.current || term.trim().length < 2) return;
    const request = revision.current; setIsSearching(true);
    timer.current = setTimeout(async () => {
      timer.current = null;
      const current = () => opened.current && request === revision.current;
      try {
        const values = await validateValues({ search: term }, (errors) => { if (current()) setSearchError(Object.values(flattenFormErrors(errors))[0]); });
        if (!values || !current()) return;
        const result = await withTimeout(supabase.from('people').select('id, full_name, social_name, nickname, cpf_cnpj')
          .or('full_name.ilike."%' + values.search + '%",social_name.ilike."%' + values.search + '%"')
          .or('person_type.ilike.suppliers,person_type.ilike.supplier').eq('deleted', false).order('full_name').limit(20), 15_000, null, 'reconciliacao:buscar-fornecedor');
        if (!current()) return;
        if (!result || result.error) throw new Error('Não foi possível buscar fornecedores. Tente novamente.');
        const parsed = reconciliationSupplierResultsSchema.safeParse(result.data ?? []);
        if (!parsed.success) throw new Error('A busca retornou fornecedores inválidos. Tente novamente.');
        setSuppliers(parsed.data.map((person) => ({ id: person.id, fullName: person.full_name || '', tradeName: person.social_name || person.nickname || '', cpfCnpj: person.cpf_cnpj || '' })));
      } catch (cause) { if (current()) setSearchError(cause instanceof Error ? cause.message : 'Não foi possível buscar fornecedores.'); }
      finally { if (current()) setIsSearching(false); }
    }, 350);
  };
  return { suppliers, isSearching, searchError, clearSearch, handleQueryChange };
}
