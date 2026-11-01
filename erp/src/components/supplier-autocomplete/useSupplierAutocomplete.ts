import { useState, useEffect, useRef } from 'react';
import Person from '@/pages/types/person.type';

interface UseSupplierAutocompleteProps {
  suppliers: Person[];
  selectedSupplierId: string;
  onSelect: (supplierId: string) => void;
  supplierFilter?: (supplier: Person) => boolean;
  disabled?: boolean;
  minChars?: number;
}

export const useSupplierAutocomplete = ({
  suppliers,
  selectedSupplierId,
  onSelect,
  supplierFilter,
  disabled = false,
  minChars = 3,
}: UseSupplierAutocompleteProps) => {
  const requiredMinChars = Math.max(3, minChars);
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const selectableSuppliers = supplierFilter ? suppliers.filter(supplierFilter) : suppliers;
  const [query, setQuery] = useState(selectedSupplier?.fullName || '');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isSearchSettled =
    query.trim().length >= requiredMinChars && query.trim() === debouncedQuery;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < requiredMinChars) {
      setDebouncedQuery('');
      return;
    }

    const timeoutId = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timeoutId);
  }, [query, requiredMinChars]);

  const prevSelectedIdRef = useRef<string>(selectedSupplierId);

  // Sincronizar query se o fornecedor selecionado mudar externamente
  useEffect(() => {
    if (selectedSupplierId !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedSupplierId;
      if (selectedSupplier) {
        setQuery(selectedSupplier.fullName);
      } else if (!selectedSupplierId) {
        setQuery('');
      }
    } else if (selectedSupplier && !query) {
      setQuery(selectedSupplier.fullName);
    }
  }, [selectedSupplierId, selectedSupplier, query]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        if (selectedSupplier) {
          setQuery(selectedSupplier.fullName);
        } else if (!selectedSupplierId) {
          setQuery('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedSupplier, selectedSupplierId]);

  const normalize = (str: string) =>
    (str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const queryNorm = normalize(debouncedQuery);

  // Filtrar sugestÃƒÆ’Ã‚Âµes localmente respeitando a quantidade mÃƒÆ’Ã‚Â­nima de caracteres
  const filteredSuggestions = selectableSuppliers.filter((s) => {
    if (!isSearchSettled) {
      return false;
    }
    if (
      !queryNorm ||
      queryNorm.length === 0 ||
      queryNorm === normalize(selectedSupplier?.fullName || '')
    ) {
      return false;
    }
    const nameNorm = normalize(s.fullName);
    const tradeNorm = normalize(s.tradeName || '');
    const docNorm = normalize(s.cpfCnpj || (s as any).document || '');
    return (
      nameNorm.includes(queryNorm) || tradeNorm.includes(queryNorm) || docNorm.includes(queryNorm)
    );
  }).slice(0, 5);

  const isSelected = Boolean(selectedSupplierId && selectedSupplier);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setQuery('');
    onSelect('');
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (disabled) return;
    if (query.trim().length < requiredMinChars) {
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(true);
  };

  const handleInputChange = (val: string) => {
    if (disabled) return;
    setQuery(val);
    const trimmed = val.trim();
    if (trimmed.length < requiredMinChars) {
      setShowSuggestions(false);
      if (trimmed === '') {
        onSelect('');
      }
      return;
    }

    setShowSuggestions(true);
    if (trimmed === '') {
      onSelect('');
    } else {
      const exactMatch = selectableSuppliers.find(
        (s) =>
          (s.fullName || '').trim().toLowerCase() === trimmed.toLowerCase() ||
          (s.tradeName || '').trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exactMatch && exactMatch.id) {
        onSelect(exactMatch.id);
      } else if (selectedSupplierId) {
        onSelect('');
      }
    }
  };

  const handleSelectOption = (supplier: Person) => {
    onSelect(supplier.id!);
    setQuery(supplier.fullName);
    setShowSuggestions(false);
  };

  return {
    query,
    wrapperRef,
    showSuggestions,
    setShowSuggestions,
    isSearchSettled,
    filteredSuggestions,
    selectedSupplier,
    isSelected,
    handleClear,
    handleFocus,
    handleInputChange,
    handleSelectOption,
  };
};
