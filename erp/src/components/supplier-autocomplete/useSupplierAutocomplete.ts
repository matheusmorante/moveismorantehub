import { useState, useEffect, useRef } from 'react';
import Person from '@/pages/types/person.type';

interface UseSupplierAutocompleteProps {
    suppliers: Person[];
    selectedSupplierId: string;
    onSelect: (supplierId: string) => void;
    disabled?: boolean;
}

export const useSupplierAutocomplete = ({
    suppliers,
    selectedSupplierId,
    onSelect,
    disabled = false
}: UseSupplierAutocompleteProps) => {
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    const [query, setQuery] = useState(selectedSupplier?.fullName || "");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sincronizar query se o fornecedor selecionado mudar externamente
    useEffect(() => {
        if (selectedSupplier) {
            setQuery(selectedSupplier.fullName);
        } else {
            setQuery("");
        }
    }, [selectedSupplierId, suppliers]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
                if (selectedSupplier) {
                    setQuery(selectedSupplier.fullName);
                } else {
                    setQuery("");
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedSupplier]);

    const normalize = (str: string) => 
        (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const queryNorm = normalize(query);

    // Filtrar sugestões localmente
    const filteredSuggestions = suppliers.filter(s => {
        if (!queryNorm || queryNorm.length === 0 || queryNorm === normalize(selectedSupplier?.fullName || "")) {
            return true;
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

    const handleInputChange = (val: string) => {
        if (disabled) return;
        setQuery(val);
        setShowSuggestions(true);
        if (val.trim() === "") {
            onSelect("");
        } else {
            const exactMatch = suppliers.find(s => 
                (s.fullName || '').trim().toLowerCase() === val.trim().toLowerCase() ||
                (s.tradeName || '').trim().toLowerCase() === val.trim().toLowerCase()
            );
            if (exactMatch && exactMatch.id) {
                onSelect(exactMatch.id);
            } else {
                onSelect(val);
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
        handleInputChange,
        handleSelectOption
    };
};
