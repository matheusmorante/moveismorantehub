// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ShippingData from '../components/ShippingData';
import Agendamento from '../ShippingComponents/Agendamento';
import Shipping from '@/pages/types/Shipping.type';

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({
    storeOriginCoords: [-49.16948, -25.35205],
    deliveryHandlingOptions: [],
    pickupHandlingOptions: [],
  }),
  useSettings: () => ({
    storeOriginCoords: [-49.16948, -25.35205],
    deliveryHandlingOptions: [],
    pickupHandlingOptions: [],
  }),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
        not: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }),
      }),
    }),
  },
}));

vi.mock('../components/AddressVerificationMap', () => ({
  default: () => <div data-testid="address-verification-map" />,
}));

vi.mock('../ShippingComponents/FreteDistancia', () => ({
  default: () => <div data-testid="frete-distancia" />,
}));

vi.mock('../ShippingComponents/MapRoute', () => ({
  default: () => <div data-testid="map-route" />,
}));

describe('Aba Logística - Interface Limpa para Endereço e Agendamento Pendentes', () => {
  afterEach(() => {
    cleanup();
  });

  const baseShipping: Shipping = {
    value: 50,
    deliveryMethod: 'delivery',
    orderType: '',
    scheduling: {
      date: '2026-10-20',
      endDate: '',
      dateType: 'fixed',
      time: '',
      startTime: '14:00',
      endTime: '',
      type: 'fixed',
      notInformed: false,
      pendingScheduling: false,
    },
    autoCalculateValue: false,
    useCustomerAddress: false,
    noAddress: false,
    deliveryAddress: {
      cep: '80000-000',
      street: 'Rua das Flores',
      number: '123',
      complement: '',
      observation: '',
      neighborhood: 'Centro',
      city: 'Curitiba',
      state: 'PR',
    },
  };

  it('não deve exibir aviso de "marcado como não informado" quando endereço pendente estiver ligado (noAddress: true)', () => {
    const shippingPendingAddress: Shipping = {
      ...baseShipping,
      noAddress: true,
    };

    render(
      <ShippingData
        shipping={shippingPendingAddress}
        setShipping={vi.fn()}
        onChangeShippingValue={vi.fn()}
        onChangeScheduling={vi.fn()}
        onChangeDistance={vi.fn()}
        onAutoCalculateDistance={vi.fn()}
        isCalculatingDistance={false}
        route=""
        errors={{}}
        customerData={{ fullName: 'Cliente Teste' } as any}
      />
    );

    // O switch de endereço pendente deve estar visível e ligado
    const switchBtn = screen.getByRole('switch', { name: 'Marcar endereço como pendente' });
    expect(switchBtn).toBeTruthy();
    expect(switchBtn.getAttribute('aria-checked')).toBe('true');

    // O aviso de "não informado / permitirá prosseguir sem preencher rua e número" NÃO deve existir
    expect(screen.queryByText(/O endereço de entrega foi marcado como não informado/i)).toBeNull();
    expect(screen.queryByText(/permitirá prosseguir sem preencher os campos de rua e número/i)).toBeNull();
  });

  it('quando agendamento pendente estiver ligado, deve exibir APENAS o card de Agendamento em Aberto e ocultar data e período', () => {
    const pendingScheduling = {
      ...baseShipping.scheduling,
      pendingScheduling: true,
      date: '',
      startTime: '',
    };

    render(
      <Agendamento
        scheduling={pendingScheduling}
        onChangeScheduling={vi.fn()}
        errors={{}}
        isPickup={false}
      />
    );

    // Card de "Agendamento em Aberto" deve estar visível
    expect(screen.getByText('Agendamento em Aberto')).toBeTruthy();
    expect(screen.getByText('Este pedido será agendado em breve.')).toBeTruthy();

    // Campos de Data e Período/Horário devem estar COMPLETAMENTE OCULTOS (não apenas desativados)
    expect(screen.queryByText('Data específica')).toBeNull();
    expect(screen.queryByText('Período de data específico')).toBeNull();
    expect(screen.queryByText('Horário específico')).toBeNull();
    expect(screen.queryByText('Período de horário específico')).toBeNull();
    expect(screen.queryByDisplayValue('2026-10-20')).toBeNull();
  });

  it('quando agendamento pendente estiver desligado, deve exibir normalmente os campos de data e período', () => {
    const activeScheduling = {
      ...baseShipping.scheduling,
      pendingScheduling: false,
      date: '2026-10-20',
      startTime: '14:00',
    };

    render(
      <Agendamento
        scheduling={activeScheduling}
        onChangeScheduling={vi.fn()}
        errors={{}}
        isPickup={false}
      />
    );

    // Card de "Agendamento em Aberto" NÃO deve estar presente
    expect(screen.queryByText('Agendamento em Aberto')).toBeNull();

    // Cards e campos de data e horário devem estar presentes e visíveis
    expect(screen.getByText('Data específica')).toBeTruthy();
    expect(screen.getByText('Horário específico')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-10-20')).toBeTruthy();
    expect(screen.getByDisplayValue('14:00')).toBeTruthy();
  });

  it('em pedido de retirada (pickup), não deve exibir endereço pendente nem opções de endereço de entrega', () => {
    const shippingPickup: Shipping = {
      ...baseShipping,
      deliveryMethod: 'pickup',
      noAddress: true,
    };

    render(
      <ShippingData
        shipping={shippingPickup}
        setShipping={vi.fn()}
        errors={{}}
        customerData={{ fullName: 'Cliente Retirada' } as any}
      />
    );

    // Não deve exibir botão ou label de endereço pendente
    expect(screen.queryByRole('switch', { name: 'Marcar endereço como pendente' })).toBeNull();
    expect(screen.queryByText('Endereço pendente?')).toBeNull();

    // Não deve exibir headers ou controles de endereço
    expect(screen.queryByText('Local de Retirada / Endereço')).toBeNull();
    expect(screen.queryByText('Endereço de Entrega')).toBeNull();
    expect(screen.queryByText('Usar o mesmo endereço do cliente?')).toBeNull();
    expect(screen.queryByTestId('frete-distancia')).toBeNull();
  });

  it('em pedido de entrega (delivery), deve exibir o cabeçalho de Endereço de Entrega e o botão de Endereço Pendente', () => {
    const shippingDelivery: Shipping = {
      ...baseShipping,
      deliveryMethod: 'delivery',
      noAddress: false,
    };

    render(
      <ShippingData
        shipping={shippingDelivery}
        setShipping={vi.fn()}
        errors={{}}
        customerData={{ fullName: 'Cliente Entrega' } as any}
      />
    );

    expect(screen.getByRole('switch', { name: 'Marcar endereço como pendente' })).toBeTruthy();
    expect(screen.getByText('Endereço de Entrega')).toBeTruthy();
    expect(screen.getByText('Endereço pendente?')).toBeTruthy();
  });
});
