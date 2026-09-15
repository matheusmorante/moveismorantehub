// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CancelledOrderBadge from './CancelledOrderBadge';

describe('CancelledOrderBadge', () => {
    it('deve renderizar somente o carimbo Cancelado, sem ícone próprio', () => {
        const { container } = render(<CancelledOrderBadge text="Cancelado" />);

        expect(screen.getByText('Cancelado')).toBeDefined();
        
        expect(container.querySelector('.bi-x-lg')).toBeNull();
    });

    it('deve suportar rótulo customizado, sem adicionar ícone ao carimbo', () => {
        const { container } = render(<CancelledOrderBadge text="Estornado" large tilted />);

        expect(screen.getByText('Estornado')).toBeDefined();

        expect(container.querySelector('.bi-x-lg')).toBeNull();
    });
});
