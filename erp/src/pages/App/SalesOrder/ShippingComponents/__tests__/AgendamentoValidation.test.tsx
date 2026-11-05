// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { validateShipping } from '../../../../../../../shared-utils/commercialOrderRules';
import { createDefaultScheduling, StatefulAgendamentoHarness } from './AgendamentoTestUtils';

afterEach(() => {
  cleanup();
});

describe('Agendamento — Cards selecionáveis e expansíveis de Data e Horário', () => {
  it('retorna as mensagens exatas de validação em todos os cenários obrigatórios e destaca a borda inferior em erro', () => {
    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({ dateType: 'fixed', date: '' }),
      }).shipping_date
    ).toBe('Selecione uma data específica.');

    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({ dateType: 'range', date: '2026-10-20', endDate: '' }),
      }).shipping_date
    ).toBe('Preencha a data inicial e a data final.');

    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({
          dateType: 'range',
          date: '2026-10-20',
          endDate: '2026-10-19',
        }),
      }).shipping_date
    ).toBe('A data final não pode ser anterior à data inicial.');

    expect(
      validateShipping({
        deliveryMethod: 'delivery',
        scheduling: createDefaultScheduling({
          date: '2026-10-20',
          type: 'fixed',
          startTime: '',
        }),
      }).shipping_time
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
      }).shipping_time
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
      }).shipping_time
    ).toBe('O horário final deve ser posterior ao horário inicial.');

    // Verifica destaque visual na borda inferior quando há erro
    render(
      <StatefulAgendamentoHarness
        initialScheduling={{ dateType: 'range', date: '2026-10-20', endDate: '2026-10-18' }}
        errors={{ shipping_date: 'A data final não pode ser anterior à data inicial.' }}
      />
    );

    const endInput = screen.getByLabelText('Data final');
    expect(endInput).toHaveAttribute('aria-invalid', 'true');
    expect(endInput.className).toContain('border-red-500');
    expect(
      screen.getByText('A data final não pode ser anterior à data inicial.')
    ).toBeInTheDocument();
  });

});
