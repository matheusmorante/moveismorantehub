import { useEffect, useMemo, useRef, useState } from 'react';
import CustomerData from '@/pages/types/customerData.type';
import Person from '@/pages/types/person.type';
import { getRecentPeople, searchPeople } from '@/pages/utils/personService';
import { toTitleCase } from '@/pages/utils/formatters';
import {
  canSearchCustomers,
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
}

export function useCustomerSelection({
  customerData,
  setCustomerData,
  marketingOrigin,
  setMarketingOrigin,
}: UseCustomerSelectionParams) {
  const [customers, setCustomers] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState(customerData.fullName || '');
  const [isOpen, setIsOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const previousCustomerRef = useRef<{
    customerData: CustomerData;
    searchTerm: string;
  } | null>(null);

  const isFinalConsumer =
    !customerData.id &&
    customerData.fullName.trim().toLowerCase() === FINAL_CONSUMER_NAME.toLowerCase();

  // Carregar recentes ao montar
  useEffect(() => {
    getRecentPeople('customers', 20).then((data) => {
      setCustomers(data.filter((customer) => customer.active && !customer.deleted));
    });
  }, []);

  // Busca com debounce ao digitar
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) return;

    const delay = setTimeout(async () => {
      try {
        const found = await searchPeople(searchTerm, 'customers', 20);
        setCustomers((prev) => {
          const combined = [...prev, ...found.filter((c) => c.active && !c.deleted)];
          return Array.from(new Map(combined.map((p) => [p.id, p])).values());
        });
      } catch (e) {
        console.error('Erro ao pesquisar clientes no input:', e);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchTerm]);

  useEffect(() => {
    if (!isOpen) setSearchTerm(customerData.fullName || '');
  }, [customerData.fullName, isOpen]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
    if (!canSearchCustomers(searchTerm)) return [];
    const query = getCustomerSearchQuery(searchTerm);
    return customers.filter((customer) =>
      matchesCustomerSearch(query, {
        name: customer.fullName || customer.tradeName,
        phone: customer.phone,
      })
    );
  }, [customers, searchTerm]);

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
      return;
    }
    setSearchTerm(value);
    setIsOpen(canSearchCustomers(value));
    if (!value) clearCustomer();
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
    handleSearchInputKeyDown,
    handleNewCustomerSuccess,
    handleEditCustomerSuccess,
  };
}
