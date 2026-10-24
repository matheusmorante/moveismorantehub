import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { reconciliationSupplierSearchSchema } from '../../../../../../../shared-utils/reconciliationFormSchemas';
import { searchReconciliationSuppliersWithClient, type ReconciliationSupplierOption } from '../../../../../../../shared-utils/productReconciliationSupplierSearch';

export type SupplierOption = ReconciliationSupplierOption;
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
        const suppliers = await searchReconciliationSuppliersWithClient(supabase, values.search);
        if (!current()) return;
        setSuppliers(suppliers);
      } catch (cause) { if (current()) setSearchError(cause instanceof Error ? cause.message : 'Não foi possível buscar fornecedores.'); }
      finally { if (current()) setIsSearching(false); }
    }, 350);
  };
  return { suppliers, isSearching, searchError, clearSearch, handleQueryChange };
}
