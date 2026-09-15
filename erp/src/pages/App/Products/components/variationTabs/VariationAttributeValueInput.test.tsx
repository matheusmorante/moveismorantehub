// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { VariationAttributeValueInput } from './VariationAttributeValueInput';
import * as variationService from '@/pages/utils/variationService';

// Mock do serviço de variações
vi.mock('@/pages/utils/variationService', () => ({
    saveAttributeValue: vi.fn(),
}));

// Mock do react-toastify
vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('VariationAttributeValueInput', () => {
    const mockRegisteredValues = [
        { id: 'val-1', attribute_id: 'attr-cor', value: 'Preto' },
        { id: 'val-2', attribute_id: 'attr-cor', value: 'Branco Neve' },
        { id: 'val-3', attribute_id: 'attr-cor', value: 'Cinza Grafite' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('deve exibir borda verde, texto verde e check verde quando o valor estiver cadastrado e selecionado', () => {
        render(
            <VariationAttributeValueInput
                attributeId="attr-cor"
                attributeName="Cor"
                value="Preto"
                registeredValues={mockRegisteredValues}
                onChange={vi.fn()}
            />
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('Preto');
        // Deve conter estilos de borda verde e texto verde
        expect(input.className).toContain('border-emerald-500');
        expect(input.className).toContain('text-emerald-700');

        // Check verde indicativo presente
        expect(screen.getByTestId('attribute-registered-check')).toBeDefined();

        // Não deve exibir aviso de "não cadastrado" nem botão de cadastrar
        expect(screen.queryByTestId('attribute-unregistered-notice')).toBeNull();
        expect(screen.queryByTestId('attribute-register-button')).toBeNull();
    });

    it('deve exibir aviso "Esse valor não está cadastrado. Deseja cadastrar?" e botão de check quando o valor digitado não existir', () => {
        render(
            <VariationAttributeValueInput
                attributeId="attr-cor"
                attributeName="Cor"
                value="Azul Royal"
                registeredValues={mockRegisteredValues}
                onChange={vi.fn()}
            />
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('Azul Royal');

        // Não deve ter a borda verde de cadastrado
        expect(input.className).not.toContain('border-emerald-500');

        // Aviso embaixo do input
        const notice = screen.getByTestId('attribute-unregistered-notice');
        expect(notice).toBeDefined();
        expect(notice.textContent).toContain('Esse valor não está cadastrado. Deseja cadastrar?');

        // Botão de check para cadastro rápido no canto do campo
        const registerBtn = screen.getByTestId('attribute-register-button');
        expect(registerBtn).toBeDefined();
        expect(registerBtn.getAttribute('title')).toBe('Cadastrar este valor');

        // Não deve ter o check verde de cadastrado
        expect(screen.queryByTestId('attribute-registered-check')).toBeNull();
    });

    it('deve cadastrar o novo valor ao clicar no botão de check e atualizar o estado', async () => {
        const mockOnChange = vi.fn();
        const mockOnValueRegistered = vi.fn();
        const savedItem = { id: 'val-99', attribute_id: 'attr-cor', value: 'Azul Royal' };

        vi.mocked(variationService.saveAttributeValue).mockResolvedValueOnce(savedItem);

        render(
            <VariationAttributeValueInput
                attributeId="attr-cor"
                attributeName="Cor"
                value="Azul Royal"
                registeredValues={mockRegisteredValues}
                onChange={mockOnChange}
                onValueRegistered={mockOnValueRegistered}
            />
        );

        const registerBtn = screen.getByTestId('attribute-register-button');
        fireEvent.click(registerBtn);

        await waitFor(() => {
            expect(variationService.saveAttributeValue).toHaveBeenCalledWith('attr-cor', 'Azul Royal');
            expect(mockOnChange).toHaveBeenCalledWith('Azul Royal');
            expect(mockOnValueRegistered).toHaveBeenCalledWith(savedItem);
        });
    });

    it('deve permanecer no estado neutro sem avisos nem check quando o campo estiver vazio', () => {
        render(
            <VariationAttributeValueInput
                attributeId="attr-cor"
                attributeName="Cor"
                value=""
                registeredValues={mockRegisteredValues}
                onChange={vi.fn()}
            />
        );

        expect(screen.queryByTestId('attribute-registered-check')).toBeNull();
        expect(screen.queryByTestId('attribute-unregistered-notice')).toBeNull();
        expect(screen.queryByTestId('attribute-register-button')).toBeNull();
    });
});
