import { useEffect, useMemo, useRef, useState } from 'react';
import CustomerData from '@/pages/types/customerData.type';
import Person from '@/pages/types/person.type';
import { fetchPersonById, getRecentPeople, searchPeople } from '@/pages/utils/personService';
import { toTitleCase } from '@/pages/utils/formatters';
import { getTestArtifactContext } from '../../../../../../../shared-utils/testArtifactContext';
import {
  canSearchCustomerAutocomplete,
  getCustomerSearchQuery,
  matchesCustomerSearch,
} from '@/pages/utils/customerSearch';

export const EMPTY_ADDRESS = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  observation: '',
};

export const FINAL_CONSUMER_NAME = 'Consumidor Final';

interface UseCustomerSelectionParams {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  marketingOrigin?: string;
  setMarketingOrigin?: (origin: string) => void;
  isTestMode?: boolean;
}

export function useCustomerSelection({
  customerData,
  setCustomerData,
  marketingOrigin,
  setMarketingOrigin,
  isTestMode = false,
}: UseCustomerSelectionParams) {
  const context = isTestMode ? getTestArtifactContext() : null;
  const runId = context?.runId, ownerId = context?.ownerId, scenarioKey = context?.scenarioKey;
  const testContext = useMemo(() => runId && ownerId
    ? { runId, ownerId, ...(scenarioKey ? { scenarioKey } : {}) } : undefined,
  [runId, ownerId, scenarioKey]);
  const [customers, setCustomers] = useState<Person[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [searchTerm, setSearchTerm] = useState(customerData.fullName || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [shouldDebounceSearch, setShouldDebounceSearch] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isSearchSettled =
    canSearchCustomerAutocomplete(searchTerm) && searchTerm.trim() === debouncedSearchTerm;
  const previousCustomerRef = useRef<{
    customerData: CustomerData;
    searchTerm: string;
  } | null>(null);

  const isFinalConsumer =
    !customerData.id &&
    customerData.fullName.trim().toLowerCase() === FINAL_CONSUMER_NAME.toLowerCase();

  // A busca de sugestões não carrega mais uma página de recentes ao montar.
  // Carrega somente o cadastro selecionado para preservar a ação de edição;
  // em modo de teste, mantém o escopo de fixtures já isolado pelo contexto.
  useEffect(() => {
    let active = true;
    setCustomers([]);
    if (isTestMode) {
      if (!testContext) return () => { active = false; };
      getRecentPeople('customers', 20, testContext).then((data) => {
        if (active) setCustomers(data.filter((customer) => customer.active && !customer.deleted));
      });
    } else if (customerData.id) {
      fetchPersonById(customerData.id).then((customer) => {
        if (active && customer?.active && !customer.deleted) setCustomers([customer]);
      });
    }
    return () => { active = false; };
  }, [customerData.id, isTestMode, testContext]);

  // Só libera a busca e os resultados após o termo estabilizar por 300 ms.
  useEffect(() => {
    if (!shouldDebounceSearch) return;
    if (!canSearchCustomerAutocomplete(searchTerm)) {
      setDebouncedSearchTerm('');
      setShouldDebounceSearch(false);
      return;
    }

    const trimmedSearchTerm = searchTerm.trim();
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(trimmedSearchTerm);
      setShouldDebounceSearch(false);
    }, 300);

    return () => clearTimeout(delay);
  }, [searchTerm, shouldDebounceSearch]);

  useEffect(() => {
    if (!canSearchCustomerAutocomplete(debouncedSearchTerm) || (isTestMode && !testContext)) {
      setIsSearchingCustomers(false);
      return;
    }
    let active = true;
    setIsSearchingCustomers(true);
    const fetchCustomers = async () => {
      try {
        const found = await searchPeople(debouncedSearchTerm, 'customers', 5, testContext);
        if (!active) return;
        setCustomers((prev) => {
          const combined = [...prev, ...found.filter((c) => c.active && !c.deleted)];
          return Array.from(new Map(combined.map((p) => [p.id, p])).values());
        });
      } catch (e) {
        console.error('Erro ao pesquisar clientes no input:', e);
      } finally {
        if (active) setIsSearchingCustomers(false);
      }
    };

    void fetchCustomers();
    return () => { active = false; };
  }, [debouncedSearchTerm, isTestMode, testContext]);

  useEffect(() => {
    if (
      !isOpen &&
      !shouldDebounceSearch &&
      (customerData.id || customerData.fullName)
    ) {
      setSearchTerm(customerData.fullName || '');
    }
  }, [customerData.fullName, customerData.id, isOpen, shouldDebounceSearch]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShouldDebounceSearch(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const selectedPerson = useMemo(() => {
    if (!customerData.id) return null;
    return customers.find((c) => c.id === customerData.id) || null;
  }, [customers, customerData.id]);

  const filteredCustomers = useMemo(() => {
    if (!isSearchSettled) return [];
    const query = getCustomerSearchQuery(debouncedSearchTerm);
    return customers
      .filter((customer) =>
        matchesCustomerSearch(query, {
          name: customer.fullName || customer.tradeName,
          phone: customer.phone,
        })
      )
      .slice(0, 5);
  }, [customers, debouncedSearchTerm, isSearchSettled]);

  const clearCustomer = () => {
    setCustomerData({
      id: undefined,
      fullName: '',
      phone: '',
      noPhone: false,
      noAddress: false,
      fullAddress: EMPTY_ADDRESS,
      additionalContacts: [],
    });
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setShouldDebounceSearch(false);
    setIsOpen(false);
  };

  const toggleFinalConsumer = () => {
    if (isFinalConsumer) {
      const previous = previousCustomerRef.current;
      previousCustomerRef.current = null;
      setCustomerData(
        previous?.customerData || {
          fullName: '',
          phone: '',
          noPhone: false,
          noAddress: false,
          fullAddress: EMPTY_ADDRESS,
          additionalContacts: [],
        }
      );
      setSearchTerm(previous?.searchTerm || '');
      setShouldDebounceSearch(false);
      setIsOpen(false);
      return;
    }

    previousCustomerRef.current = { customerData, searchTerm };
    setCustomerData({
      fullName: FINAL_CONSUMER_NAME,
      phone: '',
      noPhone: true,
      noAddress: true,
      fullAddress: { ...EMPTY_ADDRESS },
      additionalContacts: [],
    });
    setSearchTerm(FINAL_CONSUMER_NAME);
    setShouldDebounceSearch(false);
    setIsOpen(false);
  };

  const selectCustomer = (customer: Person) => {
    const formattedName = toTitleCase(customer.fullName || customer.tradeName || '');
    const legacyNoAddress = Boolean(
      (customer.fullAddress as unknown as { noAddress?: boolean } | undefined)?.noAddress
    );
    setCustomerData({
      id: customer.id,
      fullName: formattedName,
      phone: customer.phone || '',
      noPhone: customer.noPhone || false,
      noAddress: customer.noAddress || legacyNoAddress,
      fullAddress: customer.fullAddress || EMPTY_ADDRESS,
      additionalContacts: customer.additionalContacts || [],
    });
    setSearchTerm(formattedName);
    setShouldDebounceSearch(false);
    if (customer.marketingOrigin) setMarketingOrigin?.(customer.marketingOrigin);
    setIsOpen(false);
  };

  const handleEditCustomer = () => {
    setIsOpen(false);
    if (selectedPerson) {
      setEditingPerson(selectedPerson);
    } else if (customerData.id || customerData.fullName) {
      const fallbackPerson: Partial<Person> = {
        id: customerData.id,
        fullName: customerData.fullName,
        phone: customerData.phone,
        noPhone: customerData.noPhone,
        noAddress: customerData.noAddress,
        fullAddress: customerData.fullAddress || EMPTY_ADDRESS,
        additionalContacts: customerData.additionalContacts || [],
        marketingOrigin: ((customerData as CustomerData & { marketingOrigin?: string })
          .marketingOrigin ||
          marketingOrigin ||
          '') as Person['marketingOrigin'],
        type: 'customers',
      };
      setEditingPerson(fallbackPerson as Person);
    }
  };

  const handleSearchInputChange = (value: string) => {
    if (customerData.id && value !== searchTerm) {
      clearCustomer();
    }
    if (!value) {
      clearCustomer();
      return;
    }
    setSearchTerm(value);
    setShouldDebounceSearch(true);
    setIsOpen(canSearchCustomerAutocomplete(value));
  };

  const handleSearchInputFocus = () => {
    if (customerData.id || !canSearchCustomerAutocomplete(searchTerm)) return;
    setIsOpen(true);
    if (!isSearchSettled) setShouldDebounceSearch(true);
  };

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && Boolean(customerData.id)) {
      e.preventDefault();
      clearCustomer();
    }
  };

  const handleNewCustomerSuccess = (customer: Person) => {
    setCustomers((current) => [
      ...current.filter((item) => item.id !== customer.id),
      customer,
    ]);
    selectCustomer(customer);
    setIsNewCustomerOpen(false);
  };

  const handleEditCustomerSuccess = (customer: Person) => {
    setCustomers((current) => [
      ...current.filter((item) => item.id !== customer.id),
      customer,
    ]);
    selectCustomer(customer);
    setEditingPerson(null);
  };

  const isCustomerSelected = Boolean(
    (customerData.id || customerData.fullName) && searchTerm.trim()
  );

  return {
    wrapperRef,
    customers,
    searchTerm,
    setSearchTerm,
    isOpen,
    isSearchSettled,
    isSearchingCustomers,
    setIsOpen,
    isNewCustomerOpen,
    setIsNewCustomerOpen,
    editingPerson,
    setEditingPerson,
    isFinalConsumer,
    isCustomerSelected,
    filteredCustomers,
    selectCustomer,
    clearCustomer,
    toggleFinalConsumer,
    handleEditCustomer,
    handleSearchInputChange,
    handleSearchInputFocus,
    handleSearchInputKeyDown,
    handleNewCustomerSuccess,
    handleEditCustomerSuccess,
  };
}
