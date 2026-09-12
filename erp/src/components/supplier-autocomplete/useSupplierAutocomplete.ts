import { useState, useEffect, useRef } from 'react';
import Person from '@/pages/types/person.type';

interface UseSupplierAutocompleteProps {
    suppliers: Person[];
    selectedSupplierId: string;
    onSelect: (supplierId: string) => void;
    disabled?: boolean;
    minChars?: number;
}

export const useSupplierAutocomplete = ({
    suppliers,
    selectedSupplierId,
    onSelect,
    disabled = false,
    minChars = 2
}: UseSupplierAutocompleteProps) => {
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    const [query, setQuery] = useState(selectedSupplier?.fullName || "");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const prevSelectedIdRef = useRef<string>(selectedSupplierId);

    // Sincronizar query se o fornecedor selecionado mudar externamente
    useEffect(() => {
        if (selectedSupplierId !== prevSelectedIdRef.current) {
            prevSelectedIdRef.current = selectedSupplierId;
            if (selectedSupplier) {
                setQuery(selectedSupplier.fullName);
            } else if (!selectedSupplierId) {
                setQuery("");
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
                    setQuery("");
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedSupplier, selectedSupplierId]);

    const normalize = (str: string) => 
        (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const queryNorm = normalize(query);

    // Filtrar sugestões localmente respeitando a quantidade mínima de caracteres
    const filteredSuggestions = suppliers.filter(s => {
        if (minChars > 0 && queryNorm.length < minChars) {
            return false;
        }
        if (!queryNorm || queryNorm.length === 0 || queryNorm === normalize(selectedSupplier?.fullName || "")) {
            return minChars === 0;
        }
        const nameNorm = normalize(s.fullName);
        const tradeNorm = normalize(s.tradeName || "");
        const docNorm = normalize(s.document || "");
        return nameNorm.includes(queryNorm) || tradeNorm.includes(queryNorm) || docNorm.includes(queryNorm);
    });

    const isSelected = Boolean(selectedSupplierId && selectedSupplier);

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        setQuery("");
        onSelect("");
        setShowSuggestions(false);
    };

    const handleFocus = () => {
        if (disabled) return;
        if (minChars > 0 && query.trim().length < minChars) {
            setShowSuggestions(false);
            return;
        }
        setShowSuggestions(true);
    };

    const handleInputChange = (val: string) => {
        if (disabled) return;
        setQuery(val);
        const trimmed = val.trim();
        if (minChars > 0 && trimmed.length < minChars) {
            setShowSuggestions(false);
            if (trimmed === "") {
                onSelect("");
            }
            return;
        }

        setShowSuggestions(true);
        if (trimmed === "") {
            onSelect("");
        } else {
            const exactMatch = suppliers.find(s => 
                (s.fullName || '').trim().toLowerCase() === trimmed.toLowerCase() ||
                (s.tradeName || '').trim().toLowerCase() === trimmed.toLowerCase()
            );
            if (exactMatch && exactMatch.id) {
                onSelect(exactMatch.id);
            } else if (selectedSupplierId) {
                onSelect("");
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
        filteredSuggestions,
        selectedSupplier,
        isSelected,
        handleClear,
        handleFocus,
        handleInputChange,
        handleSelectOption
    };
};
