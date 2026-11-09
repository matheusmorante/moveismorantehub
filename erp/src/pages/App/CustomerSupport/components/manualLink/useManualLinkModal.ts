import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  type CustomerSummary,
  mapPersonToSummary,
  manuallyLinkCustomer,
} from '@/pages/utils/customerSupport/customerMatchingService';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import {
  supportCustomerSearchSchema as searchSchema,
  supportCustomerLinkSchema,
  type SupportCustomerLinkInput,
} from '../../../../../../../shared-utils/customerSupportFormSchemas';

type SearchFormData = z.infer<typeof searchSchema>;

interface UseManualLinkModalParams {
  isOpen: boolean;
  conversationId: string;
  onClose: () => void;
  onLinked: (customer: CustomerSummary) => void;
}

export function useManualLinkModal({
  isOpen,
  conversationId,
  onClose,
  onLinked,
}: UseManualLinkModalParams) {
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scopeRef = useRef({ key: `${isOpen}:${conversationId}`, generation: 0 });
  const scopeKey = `${isOpen}:${conversationId}`;
  if (scopeRef.current.key !== scopeKey) {
    scopeRef.current = { key: scopeKey, generation: scopeRef.current.generation + 1 };
  }
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

  const linkForm = useForm<SupportCustomerLinkInput>({
    resolver: zodResolver(supportCustomerLinkSchema),
  });

  useEffect(() => {
    setResults([]);
    setErrorMessage(null);
    setIsSearching(false);
    setIsLinking(false);
    linkLock.current = false;
    resetSearch({ searchTerm: '' });
  }, [isOpen, conversationId, resetSearch]);

  const onSearchSubmit = async (data: SearchFormData) => {
    setIsSearching(true);
    setErrorMessage(null);
    const request = ++searchRequest.current;
    try {
      const term = data.searchTerm.trim();
      const response = await withTimeout<any>(
        supabase.rpc('customer_support_search_customers', {
          p_search: term,
        }),
        15_000,
        null,
        'central:pesquisa-cliente'
      );
      const { data: peopleData, error } =
        response || { data: null, error: new Error('Timeout na busca de clientes') };
      if (error) throw error;

      if (generation === scopeRef.current.generation && request === searchRequest.current) {
        setResults((peopleData || []).map(mapPersonToSummary));
      }
    } catch {
      if (generation === scopeRef.current.generation && request === searchRequest.current) {
        setErrorMessage('Não foi possível consultar clientes. Tente novamente.');
      }
    } finally {
      if (generation === scopeRef.current.generation && request === searchRequest.current) {
        setIsSearching(false);
      }
    }
  };

  const handleLinkCustomer = async (customer: CustomerSummary) => {
    if (linkLock.current) return;
    linkLock.current = true;
    linkForm.reset({ conversationId, customerId: customer.id });
    try {
      await linkForm.handleSubmit(
        async (data) => {
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
        },
        () => setErrorMessage('Conversa ou cliente inválido. Atualize os dados antes de vincular.')
      )();
    } catch {
      if (generation === scopeRef.current.generation) {
        setErrorMessage('Não foi possível vincular o cliente. Tente novamente.');
      }
    } finally {
      if (generation === scopeRef.current.generation) {
        linkLock.current = false;
        setIsLinking(false);
      }
    }
  };

  return {
    results,
    isSearching,
    isLinking,
    errorMessage,
    register,
    handleSubmit,
    onSearchSubmit,
    errors,
    handleLinkCustomer,
  };
}
