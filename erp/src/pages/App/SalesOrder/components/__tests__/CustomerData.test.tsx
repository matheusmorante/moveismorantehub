// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import CustomerDataInputs from '../CustomerData';
import CustomerData from '@/pages/types/customerData.type';
import Person from '@/pages/types/person.type';

const mockPeople: Person[] = [
  {
    id: 'p1',
    fullName: 'Carlos Alberto',
    phone: '41999991111',
    noPhone: false,
    noAddress: false,
    personType: 'PF',
    type: 'customers',
    active: true,
    fullAddress: {
      street: 'Rua Principal',
      number: '100',
      neighborhood: 'Centro',
      city: 'Curitiba',
      cep: '80000-000',
      complement: '',
      observation: '',
    },
  },
  {
    id: 'p2',
    fullName: 'Maria Oliveira',
    phone: '41988882222',
    noPhone: false,
    noAddress: true,
    personType: 'PF',
    type: 'customers',
    active: true,
  },
];

vi.mock('@/pages/utils/personService', () => ({
  getRecentPeople: vi.fn(async () => mockPeople),
  searchPeople: vi.fn(async (term: string) =>
    mockPeople.filter((p) => p.fullName.toLowerCase().includes(term.toLowerCase()))
  ),
}));

vi.mock('@/pages/App/Registrations/shared/modals/PersonFormModal', () => ({
  default: () => <div data-testid="person-form-modal" />,
}));

describe('CustomerDataInputs Component', () => {
  afterEach(() => {
    cleanup();
  });

  const emptyCustomer: CustomerData = {
    fullName: '',
    phone: '',
    noPhone: false,
    noAddress: false,
    fullAddress: {
      cep: '',
      street: '',
      number: '',
      complement: '',
      observation: '',
      neighborhood: '',
      city: '',
    },
  };

  it('renderiza o campo de busca de cliente e o botão de consumidor final', async () => {
    await act(async () => {
      render(
        <CustomerDataInputs
          customerData={emptyCustomer}
          setCustomerData={vi.fn()}
          errors={{}}
          isPickup={false}
        />
      );
    });

    expect(screen.getByText('Selecionar cliente')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Consumidor final' })).toBeTruthy();
    expect(screen.getByText('Novo cliente')).toBeTruthy();
    expect(screen.getByPlaceholderText('Busque pelo nome ou telefone...')).toBeTruthy();
  });

  it('permite alternar para Consumidor Final ativando noAddress e preenchendo o nome', async () => {
    const setCustomerDataMock = vi.fn();

    await act(async () => {
      render(
        <CustomerDataInputs
          customerData={emptyCustomer}
          setCustomerData={setCustomerDataMock}
          errors={{}}
          isPickup={false}
        />
      );
    });

    const toggle = screen.getByRole('switch', { name: 'Consumidor final' });
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(setCustomerDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Consumidor Final',
        noPhone: true,
        noAddress: true,
      })
    );
  });

  it('permite limpar o cliente quando o botão de limpar for clicado', async () => {
    const setCustomerDataMock = vi.fn();
    const customerWithData: CustomerData = {
      ...emptyCustomer,
      id: 'p1',
      fullName: 'Carlos Alberto',
    };

    await act(async () => {
      render(
        <CustomerDataInputs
          customerData={customerWithData}
          setCustomerData={setCustomerDataMock}
          errors={{}}
          isPickup={false}
        />
      );
    });

    const clearBtn = screen.getByTitle('Limpar cliente');
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    expect(setCustomerDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: undefined,
        fullName: '',
        noPhone: false,
        noAddress: false,
      })
    );
  });
});
