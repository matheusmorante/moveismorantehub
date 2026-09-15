// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CancelledOrderBadge from './CancelledOrderBadge';

describe('CancelledOrderBadge', () => {
    it('deve renderizar o rótulo com o texto Cancelado e o ícone de X em botãozinho redondo', () => {
        const { container } = render(<CancelledOrderBadge text="Cancelado" />);

        expect(screen.getByText('Cancelado')).toBeDefined();
        
        // Verifica se há o ícone de X
        const xIcon = container.querySelector('.bi-x-lg');
        expect(xIcon).not.toBeNull();

        // Verifica se o container do ícone é arredondado (rounded-full)
        const roundBadge = xIcon?.closest('.rounded-full');
        expect(roundBadge).not.toBeNull();
    });

    it('deve suportar rótulo customizado (ex: Estornado) mantendo o ícone de X', () => {
        const { container } = render(<CancelledOrderBadge text="Estornado" large tilted />);

        expect(screen.getByText('Estornado')).toBeDefined();

        const xIcon = container.querySelector('.bi-x-lg');
        expect(xIcon).not.toBeNull();

        const roundBadge = xIcon?.closest('.rounded-full');
        expect(roundBadge).not.toBeNull();
    });
});
