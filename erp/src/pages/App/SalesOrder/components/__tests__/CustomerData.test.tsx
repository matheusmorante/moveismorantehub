// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import CustomerDataInputs from '../CustomerData';
import CustomerData from '@/pages/types/customerData.type';
import Person from '@/pages/types/person.type';
import { getRecentPeople, searchPeople } from '@/pages/utils/personService';
import { bindTestArtifactContext, clearTestArtifactContext } from '../../../../../../../shared-utils/testArtifactContext';

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
    clearTestArtifactContext();
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

  it('uses the authenticated test context only while test mode is enabled', async () => {
    const identity = { runId: '702b921e-fd31-488d-925e-560602a65510', ownerId: 'eccde09e-72d8-4efe-a387-eb34114dea39' };
    bindTestArtifactContext(identity);
    const props = { customerData: emptyCustomer, setCustomerData: vi.fn(), errors: {}, isPickup: false };
    const view = render(<CustomerDataInputs {...props} isTestMode />);
    await act(async () => {});
    expect(getRecentPeople).toHaveBeenLastCalledWith('customers', 20, identity);
    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByPlaceholderText('Busque pelo nome ou telefone...'), { target: { value: 'Cliente teste' } });
      await act(async () => { await vi.advanceTimersByTimeAsync(301); });
      expect(searchPeople).toHaveBeenLastCalledWith('Cliente teste', 'customers', 20, identity);
      view.rerender(<CustomerDataInputs {...props} isTestMode={false} />);
      await act(async () => {});
      expect(getRecentPeople).toHaveBeenLastCalledWith('customers', 20, undefined);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fall back to operational customers when test mode has no context', async () => {
    clearTestArtifactContext();
    render(<CustomerDataInputs customerData={emptyCustomer} setCustomerData={vi.fn()} errors={{}} isPickup={false} isTestMode />);
    await act(async () => {});
    expect(getRecentPeople).not.toHaveBeenCalled();
    expect(searchPeople).not.toHaveBeenCalled();
  });

  it('ignores a late result from the previous test context after switching mode', async () => {
    bindTestArtifactContext({ runId: '702b921e-fd31-488d-925e-560602a65510', ownerId: 'eccde09e-72d8-4efe-a387-eb34114dea39' });
    let resolvePrevious!: (value: Person[]) => void;
    vi.mocked(getRecentPeople).mockImplementationOnce(() => new Promise((resolve) => { resolvePrevious = resolve; }));
    const props = { customerData: emptyCustomer, setCustomerData: vi.fn(), errors: {}, isPickup: false };
    const view = render(<CustomerDataInputs {...props} isTestMode />);
    view.rerender(<CustomerDataInputs {...props} isTestMode={false} />);
    await act(async () => { resolvePrevious([{ ...mockPeople[0], id: 'late', fullName: 'Cliente antigo' }]); });
    fireEvent.change(screen.getByPlaceholderText('Busque pelo nome ou telefone...'), { target: { value: 'Cliente antigo' } });
    expect(screen.queryByRole('button', { name: /Cliente Antigo/i })).toBeNull();
  });

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
