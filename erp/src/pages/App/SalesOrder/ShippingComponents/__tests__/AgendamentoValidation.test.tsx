// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { validateShipping } from '../../../../../../../shared-utils/commercialOrderRules';
import { createDefaultScheduling, StatefulAgendamentoHarness } from './AgendamentoTestUtils';

afterEach(() => {
  cleanup();
});

describe('Agendamento — Cards selecionáveis e expansíveis de Data e Horário', () => {
  it('exige os avisos individualmente nas operações de entrega', () => {
    const scheduling = createDefaultScheduling();
    const errors = validateShipping({
      deliveryMethod: 'delivery',
      callBeforeDelivery: true,
      bringCardMachine: false,
      callOnArrival: true,
      scheduling: {
        ...scheduling,
        appointments: [
          {
            id: 'complete', itemIds: [], deliveryMethod: 'delivery', scheduling,
            notices: { callBeforeDelivery: false, bringCardMachine: false, callOnArrival: true },
          },
          {
            id: 'incomplete', itemIds: [], deliveryMethod: 'delivery', scheduling,
            notices: { callBeforeDelivery: true },
          },
          { id: 'pickup', itemIds: [], deliveryMethod: 'pickup', scheduling },
        ],
      },
    } as any, {} as any, false, undefined, true);

    expect(errors.shipping_appointment_complete_notices_callBeforeDelivery).toBeUndefined();
    expect(errors.shipping_appointment_complete_notices_bringCardMachine).toBeUndefined();
    expect(errors.shipping_appointment_incomplete_notices_bringCardMachine).toBe(
      'Selecione se é necessário levar máquina de cartão.'
    );
    expect(errors.shipping_appointment_incomplete_notices_callOnArrival).toBe(
      'Selecione se é necessário ligar ao chegar.'
    );
    expect(Object.keys(errors).some((key) => key.startsWith('shipping_appointment_pickup_notices_'))).toBe(false);
  });

  it('valida a distância em cada operação de entrega e ignora as retiradas', () => {
    const scheduling = createDefaultScheduling();
    const errors = validateShipping({
      deliveryMethod: 'delivery',
      distance: 12,
      scheduling: {
        ...scheduling,
        appointments: [
          { id: 'delivery1', itemIds: [], deliveryMethod: 'delivery', distance: 12, scheduling },
          { id: 'delivery2', itemIds: [], deliveryMethod: 'delivery', scheduling },
          { id: 'pickup', itemIds: [], deliveryMethod: 'pickup', scheduling },
        ],
      },
    } as any, {} as any, false, undefined, true);

    expect(errors.shipping_appointment_delivery1_distance).toBeUndefined();
    expect(errors.shipping_appointment_delivery2_distance).toBe(
      'Distância da entrega é obrigatória e deve ser maior que zero.'
    );
    expect(errors.shipping_appointment_pickup_distance).toBeUndefined();
  });

  it('valida o endereço escolhido em cada operação de entrega', () => {
    const scheduling = createDefaultScheduling();
    const errors = validateShipping({
      deliveryMethod: 'delivery',
      useCustomerAddress: true,
      scheduling: {
        ...scheduling,
        appointments: [
          {
            id: 'customer-address', itemIds: [], deliveryMethod: 'delivery', distance: 12,
            useCustomerAddress: true, scheduling,
          },
          {
            id: 'custom-address', itemIds: [], deliveryMethod: 'delivery', distance: 12,
            useCustomerAddress: false,
            deliveryAddress: { street: 'Rua B', number: '20', city: 'Curitiba' },
            scheduling,
          },
          { id: 'pickup', itemIds: [], deliveryMethod: 'pickup', useCustomerAddress: false, scheduling },
        ],
      },
    } as any, { fullAddress: { street: 'Rua A', number: '10', city: 'Colombo' } } as any, false, undefined, true);

    expect(errors['shipping_appointment_customer-address_address_street']).toBeUndefined();
    expect(errors['shipping_appointment_custom-address_address_street']).toBeUndefined();
    expect(errors.customer_street).toBeUndefined();
    expect(errors.deliveryAddress_street).toBeUndefined();
  });

  it('aponta campos faltantes do endereço customizado na operação correta, mesmo se o cliente não tiver endereço', () => {
    const scheduling = createDefaultScheduling();
    const errors = validateShipping({
      deliveryMethod: 'delivery',
      useCustomerAddress: true,
      scheduling: {
        ...scheduling,
        appointments: [{
          id: 'custom-address', itemIds: [], deliveryMethod: 'delivery', distance: 12,
          useCustomerAddress: false,
          deliveryAddress: { street: 'Rua B', number: '', city: '' },
          scheduling,
        }],
      },
    } as any, { noAddress: true } as any, false, undefined, true);

    expect(errors['shipping_appointment_custom-address_address_street']).toBeUndefined();
    expect(errors['shipping_appointment_custom-address_address_number']).toBe('Número é obrigatório.');
    expect(errors['shipping_appointment_custom-address_address_city']).toBe('Cidade é obrigatória.');
    expect(errors.customer_street).toBeUndefined();
  });

  it('não exige endereço quando a operação de entrega usa cliente marcado sem endereço', () => {
    const scheduling = createDefaultScheduling();
    const errors = validateShipping({
      deliveryMethod: 'delivery',
      scheduling: {
        ...scheduling,
        appointments: [{
          id: 'no-address', itemIds: [], deliveryMethod: 'delivery', distance: 12,
          useCustomerAddress: true, scheduling,
        }],
      },
    } as any, { noAddress: true } as any, false, undefined, true);

    expect(errors['shipping_appointment_no-address_address_street']).toBeUndefined();
    expect(errors.customer_street).toBeUndefined();
  });

  it('não exige distância quando a operação usa endereço do cliente ainda não informado', () => {
    const scheduling = createDefaultScheduling();
    const errors = validateShipping({
      deliveryMethod: 'delivery',
      scheduling: {
        ...scheduling,
        appointments: [{
          id: 'no-address', itemIds: [], deliveryMethod: 'delivery',
          useCustomerAddress: true, scheduling,
        }],
      },
    } as any, { noAddress: true } as any, false, undefined, true);

    expect(errors['shipping_appointment_no-address_address_street']).toBeUndefined();
    expect(errors['shipping_appointment_no-address_distance']).toBeUndefined();
  });

  it('retorna as mensagens exatas de validação em todos os cenários obrigatórios e destaca a borda inferior em erro', () => {
    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({ dateType: 'fixed', date: '' }),
      } as any, {} as any).shipping_date
    ).toBe('Selecione uma data específica.');

    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({ dateType: 'range', date: '2026-10-20', endDate: '' }),
      } as any, {} as any).shipping_date
    ).toBe('Preencha a data inicial e a data final.');

    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({
          dateType: 'range',
          date: '2026-10-20',
          endDate: '2026-10-19',
        }),
      } as any, {} as any).shipping_date
    ).toBe('A data final não pode ser anterior à data inicial.');

    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({
          date: '2026-10-20',
          type: 'fixed',
          startTime: '',
        }),
      } as any, {} as any).shipping_time
    ).toBe('Selecione um horário específico.');

    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({
          date: '2026-10-20',
          type: 'range',
          startTime: '10:00',
          endTime: '',
        }),
      } as any, {} as any).shipping_time
    ).toBe('Preencha o horário inicial e o horário final.');

    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({
          date: '2026-10-20',
          type: 'range',
          startTime: '14:00',
          endTime: '13:00',
        }),
      } as any, {} as any).shipping_time
    ).toBe('O horário final deve ser posterior ao horário inicial.');

    // Verifica destaque visual na borda inferior quando há erro
    render(
      <StatefulAgendamentoHarness
        initialScheduling={{ dateType: 'range', date: '2026-10-20', endDate: '2026-10-18' }}
        errors={{ shipping_date: 'A data final não pode ser anterior à data inicial.' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expandir datas programadas' }));
    const endInput = screen.getByLabelText('Data final');
    expect(endInput).toHaveAttribute('aria-invalid', 'true');
    expect(endInput.className).toContain('border-red-500');
    expect(screen.getAllByTitle('A data final não pode ser anterior à data inicial.').length).toBeGreaterThan(0);
  });

});
