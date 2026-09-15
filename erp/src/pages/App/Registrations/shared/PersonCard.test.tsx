// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PersonCard from './PersonCard';
import Person from '../../../types/person.type';

describe('PersonCard - Cliente Minimalista', () => {
    afterEach(() => {
        cleanup();
    });

    const mockCustomer: Person = {
        id: 'cust-123',
        fullName: 'Carlos Eduardo da Silva',
        tradeName: 'Carlos Moveis',
        cpfCnpj: '123.456.789-00',
        phone: '(41) 99999-8888',
        email: 'carlos@exemplo.com',
        active: true,
        type: 'customers',
        personType: 'PF',
        fullAddress: {
            street: 'Rua das Flores',
            number: '100',
            city: 'Curitiba',
            state: 'PR'
        }
    };

    it('renderiza dados do cliente alinhados de forma minimalista', () => {
        const onEdit = vi.fn();
        render(
            <PersonCard
                person={mockCustomer}
                onEdit={onEdit}
                onDelete={vi.fn()}
                onRestore={vi.fn()}
                onPermanentDelete={vi.fn()}
                onToggleActive={vi.fn()}
            />
        );

        // Deve exibir o nome do cliente
        expect(screen.getByText('Carlos Eduardo da Silva')).toBeDefined();
        // Deve exibir status Ativo
        expect(screen.getByText('Ativo')).toBeDefined();
        // Deve exibir CPF/CNPJ
        expect(screen.getByText('123.456.789-00')).toBeDefined();
        // Deve exibir telefone
        expect(screen.getByText('(41) 99999-8888')).toBeDefined();
        // Deve exibir email
        expect(screen.getByText('carlos@exemplo.com')).toBeDefined();
        // Deve exibir cidade/UF
        expect(screen.getByText(/Curitiba/i)).toBeDefined();
    });

    it('chama onEdit ao clicar no card de cliente', () => {
        const onEdit = vi.fn();
        render(
            <PersonCard
                person={mockCustomer}
                onEdit={onEdit}
                onDelete={vi.fn()}
                onRestore={vi.fn()}
                onPermanentDelete={vi.fn()}
                onToggleActive={vi.fn()}
            />
        );

        fireEvent.click(screen.getByLabelText(/Editar Carlos Eduardo da Silva/i));
        expect(onEdit).toHaveBeenCalledWith(mockCustomer);
    });
});
