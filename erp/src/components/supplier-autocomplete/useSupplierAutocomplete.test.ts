// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSupplierAutocomplete } from './useSupplierAutocomplete';
import Person from '@/pages/types/person.type';

const mockSuppliers: Person[] = [
    { id: 'sup_1', fullName: 'Acme Madeiras', tradeName: 'Acme', document: '12345678000199', type: 'suppliers' },
    { id: 'sup_2', fullName: 'Brasil Compensados', tradeName: 'BrasComp', document: '98765432000100', type: 'suppliers' },
    { id: 'sup_3', fullName: 'Alvorada Ferragens', tradeName: 'Alvorada', document: '11223344000155', type: 'suppliers' },
];

describe('useSupplierAutocomplete com minChars', () => {
    it('não deve exibir sugestões ao focar ou digitar menos de 2 caracteres quando minChars=2', () => {
        const onSelect = vi.fn();
        const { result } = renderHook(() =>
            useSupplierAutocomplete({
                suppliers: mockSuppliers,
                selectedSupplierId: '',
                onSelect,
                minChars: 2,
            })
        );

        // Foco inicial com campo vazio
        act(() => {
            result.current.handleFocus();
        });
        expect(result.current.showSuggestions).toBe(false);
        expect(result.current.filteredSuggestions).toEqual([]);

        // Digitar apenas 1 caractere ('A')
        act(() => {
            result.current.handleInputChange('A');
        });
        expect(result.current.showSuggestions).toBe(false);
        expect(result.current.filteredSuggestions).toEqual([]);
    });

    it('deve exibir sugestões quando atingir 2 ou mais caracteres quando minChars=2', () => {
        const onSelect = vi.fn();
        const { result } = renderHook(() =>
            useSupplierAutocomplete({
                suppliers: mockSuppliers,
                selectedSupplierId: '',
                onSelect,
                minChars: 2,
            })
        );

        // Digitar 2 caracteres ('Ac')
        act(() => {
            result.current.handleInputChange('Ac');
        });
        expect(result.current.showSuggestions).toBe(true);
        expect(result.current.filteredSuggestions.length).toBe(1);
        expect(result.current.filteredSuggestions[0].fullName).toBe('Acme Madeiras');

        // Digitar outro termo com 2 caracteres ('Al')
        act(() => {
            result.current.handleInputChange('Al');
        });
        expect(result.current.showSuggestions).toBe(true);
        expect(result.current.filteredSuggestions.length).toBe(1);
        expect(result.current.filteredSuggestions[0].fullName).toBe('Alvorada Ferragens');
    });

    it('deve fechar sugestões se o usuário apagar o texto para menos de 2 caracteres', () => {
        const onSelect = vi.fn();
        const { result } = renderHook(() =>
            useSupplierAutocomplete({
                suppliers: mockSuppliers,
                selectedSupplierId: '',
                onSelect,
                minChars: 2,
            })
        );

        act(() => {
            result.current.handleInputChange('Bra');
        });
        expect(result.current.showSuggestions).toBe(true);

        // Apagar para 1 caractere
        act(() => {
            result.current.handleInputChange('B');
        });
        expect(result.current.showSuggestions).toBe(false);
        expect(result.current.filteredSuggestions).toEqual([]);
    });

    it('deve ter minChars=2 como padrão quando não especificado', () => {
        const onSelect = vi.fn();
        const { result } = renderHook(() =>
            useSupplierAutocomplete({
                suppliers: mockSuppliers,
                selectedSupplierId: '',
                onSelect,
            })
        );

        // Sem passar minChars, ao focar não abre sugestões
        act(() => {
            result.current.handleFocus();
        });
        expect(result.current.showSuggestions).toBe(false);
        expect(result.current.filteredSuggestions).toEqual([]);

        // Com 1 caractere não abre
        act(() => {
            result.current.handleInputChange('A');
        });
        expect(result.current.showSuggestions).toBe(false);
        expect(result.current.filteredSuggestions).toEqual([]);

        // Com 2 caracteres abre sugestões
        act(() => {
            result.current.handleInputChange('Ac');
        });
        expect(result.current.showSuggestions).toBe(true);
        expect(result.current.filteredSuggestions.length).toBe(1);
    });

    it('permite abrir no foco quando minChars=0 for passado explicitamente', () => {
        const onSelect = vi.fn();
        const { result } = renderHook(() =>
            useSupplierAutocomplete({
                suppliers: mockSuppliers,
                selectedSupplierId: '',
                onSelect,
                minChars: 0,
            })
        );

        act(() => {
            result.current.handleFocus();
        });
        expect(result.current.showSuggestions).toBe(true);
        expect(result.current.filteredSuggestions.length).toBe(3);
    });
});
