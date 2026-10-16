// @vitest-environment happy-dom
import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Agendamento from '../Agendamento';
import Shipping from '@/pages/types/Shipping.type';
import { ValidationErrors } from '@/pages/utils/validations';
import {
  getSaoPauloDayInfo,
  validateShipping,
  validateShippingScheduling,
} from '../../../../../../../shared-utils/commercialOrderRules';
import { buildOrderPersistencePayload } from '@/pages/utils/orderPersistencePayload';
import { mapOrderFromDatabase } from '@/pages/utils/orderMapper';

afterEach(() => {
  cleanup();
});

const createDefaultScheduling = (
  overrides: Partial<Shipping['scheduling']> = {}
): Shipping['scheduling'] => ({
  date: '',
  endDate: '',
  dateType: 'fixed',
  time: '',
  startTime: '',
  endTime: '',
  type: 'fixed',
  ...overrides,
});

const StatefulAgendamentoHarness = ({
  initialScheduling,
  errors = {},
}: {
  initialScheduling?: Partial<Shipping['scheduling']>;
  errors?: ValidationErrors;
}) => {
  const [scheduling, setScheduling] = useState<Shipping['scheduling']>(() =>
    createDefaultScheduling(initialScheduling)
  );

  const handleChangeScheduling = (
    key: keyof Shipping['scheduling'],
    value: string | Date | boolean
  ) => {
    setScheduling((prev) => {
      const next = { ...prev, [key]: value };
      if (next.type === 'fixed') {
        next.time = next.startTime || '';
      } else {
        const start = next.startTime || '';
        const end = next.endTime || '';
        next.time = start && end ? `${start} às ${end}` : '';
      }
      return next;
    });
  };

  return (
    <div>
      <Agendamento
        scheduling={scheduling}
        onChangeScheduling={handleChangeScheduling}
        errors={errors}
      />
      <output data-testid="raw-scheduling-json">{JSON.stringify(scheduling)}</output>
    </div>
  );
};

describe('Agendamento — Cards selecionáveis e expansíveis de Data e Horário', () => {
  it('inicia compacto em nova programação com Resumo da programação definido como "Não definido"', () => {
    render(<StatefulAgendamentoHarness />);

    expect(screen.getByText('Data programada')).toBeInTheDocument();
    expect(screen.getByText('Horário programado')).toBeInTheDocument();
    expect(screen.getByText('Resumo da programação')).toBeInTheDocument();

    // Nomenclaturas exatas
    expect(screen.getByText('Hoje')).toBeInTheDocument();
    expect(screen.getByText('Amanhã')).toBeInTheDocument();
    expect(screen.getByText('Data específica')).toBeInTheDocument();
    expect(screen.getByText('Período de data específico')).toBeInTheDocument();
    expect(screen.getByText('Manhã')).toBeInTheDocument();
    expect(screen.getByText('Tarde')).toBeInTheDocument();
    expect(screen.getByText('Horário específico')).toBeInTheDocument();
    expect(screen.getByText('Período de horário específico')).toBeInTheDocument();

    // Campos internos devem iniciar recolhidos
    expect(screen.queryByLabelText('Data desejada')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Data inicial')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Data final')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Horário desejado')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Horário inicial')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Horário final')).not.toBeInTheDocument();

    expect(screen.getByTestId('scheduling-summary-date')).toHaveTextContent('Não definido');
    expect(screen.getByTestId('scheduling-summary-time')).toHaveTextContent('Não definido');
  });

  it('calcula Hoje e Amanhã dinamicamente no fuso America/Sao_Paulo, incluindo virada de meia-noite', () => {
    // 2026-10-16T01:30:00Z = 2026-10-15 22:30 em America/Sao_Paulo (quinta-feira)
    const beforeMidnightSp = new Date('2026-10-16T01:30:00.000Z');
    const todayBefore = getSaoPauloDayInfo(0, beforeMidnightSp);
    const tomorrowBefore = getSaoPauloDayInfo(1, beforeMidnightSp);

    expect(todayBefore.isoDate).toBe('2026-10-15');
    expect(todayBefore.formattedDate).toBe('15/10/2026');
    expect(todayBefore.weekday).toBe('quinta-feira');
    expect(tomorrowBefore.isoDate).toBe('2026-10-16');
    expect(tomorrowBefore.formattedDate).toBe('16/10/2026');
    expect(tomorrowBefore.weekday).toBe('sexta-feira');

    // 2026-10-16T03:05:00Z = 2026-10-16 00:05 em America/Sao_Paulo (sexta-feira)
    const afterMidnightSp = new Date('2026-10-16T03:05:00.000Z');
    const todayAfter = getSaoPauloDayInfo(0, afterMidnightSp);
    const tomorrowAfter = getSaoPauloDayInfo(1, afterMidnightSp);

    expect(todayAfter.isoDate).toBe('2026-10-16');
    expect(todayAfter.weekday).toBe('sexta-feira');
    expect(tomorrowAfter.isoDate).toBe('2026-10-17');
    expect(tomorrowAfter.weekday).toBe('sábado');
  });

  it('seleciona Hoje e Amanhã destacando o card em verde e atualizando o resumo e payload', () => {
    render(<StatefulAgendamentoHarness />);
    const todayInfo = getSaoPauloDayInfo(0);
    const tomorrowInfo = getSaoPauloDayInfo(1);

    expect(
      screen.getByText(`(${todayInfo.weekday}, ${todayInfo.formattedDate})`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`(${tomorrowInfo.weekday}, ${tomorrowInfo.formattedDate})`)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hoje/i }));
    expect(screen.getByTestId('card-check-today')).toBeInTheDocument();
    expect(screen.getByTestId('scheduling-summary-date')).toHaveTextContent(
      `Hoje, ${todayInfo.formattedDate}`
    );

    let saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(saved.date).toBe(todayInfo.isoDate);
    expect(saved.dateType).toBe('fixed');
    expect(saved.endDate).toBe('');

    fireEvent.click(screen.getByRole('button', { name: /Amanhã/i }));
    expect(screen.queryByTestId('card-check-today')).not.toBeInTheDocument();
    expect(screen.getByTestId('card-check-tomorrow')).toBeInTheDocument();
    expect(screen.getByTestId('scheduling-summary-date')).toHaveTextContent(
      `Amanhã, ${tomorrowInfo.formattedDate}`
    );

    saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(saved.date).toBe(tomorrowInfo.isoDate);
    expect(saved.dateType).toBe('fixed');
    expect(saved.endDate).toBe('');
  });

  it('expande Data específica em amarelo enquanto vazio e muda para verde quando preenchido', () => {
    render(<StatefulAgendamentoHarness />);

    const customDateBtn = screen.getByRole('button', { name: /Data específica/i });
    expect(customDateBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(customDateBtn);
    expect(customDateBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('card-check-custom-date')).toBeInTheDocument();

    const cardContainer = screen.getByTestId('card-container-custom-date');
    const cardTitle = screen.getByText('Data específica');
    const fieldLabel = screen.getByText('Data desejada');
    const input = screen.getByLabelText('Data desejada') as HTMLInputElement;

    // Selecionado porém vazio -> amarelo (amber)
    expect(cardContainer.className).toContain('border-amber-500');
    expect(cardContainer.className).toContain('bg-amber-50/40');
    expect(cardTitle.className).toContain('text-amber-700');
    expect(fieldLabel.className).toContain('text-amber-700');

    expect(input.value).toBe('');
    expect(input.className).toContain('border-0');
    expect(input.className).toContain('border-b-2');
    expect(input.className).toContain('rounded-none');
    expect(screen.getByTestId('scheduling-summary-date')).toHaveTextContent('Não definido');

    // Preenchido -> verde (emerald)
    fireEvent.change(input, { target: { value: '2026-10-20' } });
    expect(cardContainer.className).toContain('border-emerald-500');
    expect(cardContainer.className).toContain('bg-emerald-50/40');
    expect(cardTitle.className).toContain('text-emerald-700');
    expect(fieldLabel.className).toContain('text-emerald-700');
    expect(screen.getByTestId('scheduling-summary-date')).toHaveTextContent('20/10/2026');

    const saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(saved.date).toBe('2026-10-20');
    expect(saved.dateType).toBe('fixed');
    expect(saved.endDate).toBe('');
  });

  it('expande Período de data específico em amarelo até que todos os campos estejam preenchidos e então muda para verde', () => {
    render(<StatefulAgendamentoHarness />);

    fireEvent.click(screen.getByRole('button', { name: /Período de data específico/i }));
    const cardContainer = screen.getByTestId('card-container-custom-date-range');
    const cardTitle = screen.getByText('Período de data específico');
    const startLabel = screen.getByText('Data inicial');
    const endLabel = screen.getByText('Data final');
    const startInput = screen.getByLabelText('Data inicial') as HTMLInputElement;
    const endInput = screen.getByLabelText('Data final') as HTMLInputElement;

    expect(startInput.value).toBe('');
    expect(endInput.value).toBe('');

    // Vazio -> amarelo
    expect(cardContainer.className).toContain('border-amber-500');
    expect(cardTitle.className).toContain('text-amber-700');
    expect(startLabel.className).toContain('text-amber-700');
    expect(endLabel.className).toContain('text-amber-700');

    // Apenas Data inicial preenchida -> continua amarelo
    fireEvent.change(startInput, { target: { value: '2026-10-20' } });
    expect(cardContainer.className).toContain('border-amber-500');
    expect(cardTitle.className).toContain('text-amber-700');
    expect(startLabel.className).toContain('text-amber-700');
    expect(endLabel.className).toContain('text-amber-700');
    expect(screen.getByTestId('scheduling-summary-date')).toHaveTextContent('Não definido');

    // Data final anterior à inicial -> resumo permanece Não definido e validação reprova
    fireEvent.change(endInput, { target: { value: '2026-10-18' } });
    expect(screen.getByTestId('scheduling-summary-date')).toHaveTextContent('Não definido');

    const invalidSaved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(validateShippingScheduling(invalidSaved).shipping_date).toBe(
      'A data final não pode ser anterior à data inicial.'
    );

    // Ambos preenchidos com data final válida -> verde
    fireEvent.change(endInput, { target: { value: '2026-10-22' } });
    expect(cardContainer.className).toContain('border-emerald-500');
    expect(cardContainer.className).toContain('bg-emerald-50/40');
    expect(cardTitle.className).toContain('text-emerald-700');
    expect(startLabel.className).toContain('text-emerald-700');
    expect(endLabel.className).toContain('text-emerald-700');
    expect(screen.getByTestId('scheduling-summary-date')).toHaveTextContent(
      '20/10/2026 a 22/10/2026'
    );
    const validSaved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(validateShippingScheduling(validSaved).shipping_date).toBeUndefined();
  });

  it('seleciona Manhã e Tarde definindo intervalos 09:00 às 12:00 e 13:00 às 18:00', () => {
    render(<StatefulAgendamentoHarness />);

    fireEvent.click(screen.getByRole('button', { name: /^Manhã/i }));
    expect(screen.getByTestId('card-check-morning')).toBeInTheDocument();
    expect(screen.getByTestId('scheduling-summary-time')).toHaveTextContent('09:00 às 12:00');

    let saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(saved.type).toBe('range');
    expect(saved.startTime).toBe('09:00');
    expect(saved.endTime).toBe('12:00');
    expect(saved.time).toBe('09:00 às 12:00');

    fireEvent.click(screen.getByRole('button', { name: /^Tarde/i }));
    expect(screen.queryByTestId('card-check-morning')).not.toBeInTheDocument();
    expect(screen.getByTestId('card-check-afternoon')).toBeInTheDocument();
    expect(screen.getByTestId('scheduling-summary-time')).toHaveTextContent('13:00 às 18:00');

    saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(saved.type).toBe('range');
    expect(saved.startTime).toBe('13:00');
    expect(saved.endTime).toBe('18:00');
    expect(saved.time).toBe('13:00 às 18:00');
  });

  it('expande Horário específico e Período de horário específico em amarelo enquanto incompletos e muda para verde quando preenchidos', () => {
    render(<StatefulAgendamentoHarness />);

    fireEvent.click(screen.getByRole('button', { name: /^Horário específico$/i }));
    const customTimeContainer = screen.getByTestId('card-container-custom-time');
    const customTimeTitle = screen.getByText('Horário específico');
    const customTimeLabel = screen.getByText('Horário desejado');
    const customTimeInput = screen.getByLabelText('Horário desejado') as HTMLInputElement;

    expect(customTimeInput.value).toBe('');
    expect(customTimeInput.className).toContain('border-b-2');
    expect(customTimeContainer.className).toContain('border-amber-500');
    expect(customTimeTitle.className).toContain('text-amber-700');
    expect(customTimeLabel.className).toContain('text-amber-700');

    fireEvent.change(customTimeInput, { target: { value: '14:30' } });
    expect(customTimeContainer.className).toContain('border-emerald-500');
    expect(customTimeTitle.className).toContain('text-emerald-700');
    expect(customTimeLabel.className).toContain('text-emerald-700');
    expect(screen.getByTestId('scheduling-summary-time')).toHaveTextContent('14:30');

    let saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(saved.type).toBe('fixed');
    expect(saved.startTime).toBe('14:30');
    expect(saved.endTime).toBe('');
    expect(saved.time).toBe('14:30');

    // Alterna para Período de horário específico
    fireEvent.click(screen.getByRole('button', { name: /Período de horário específico/i }));
    expect(screen.queryByLabelText('Horário desejado')).not.toBeInTheDocument();

    const rangeContainer = screen.getByTestId('card-container-custom-time-range');
    const rangeTitle = screen.getByText('Período de horário específico');
    const startLabel = screen.getByText('Horário inicial');
    const endLabel = screen.getByText('Horário final');
    const startInput = screen.getByLabelText('Horário inicial') as HTMLInputElement;
    const endInput = screen.getByLabelText('Horário final') as HTMLInputElement;

    // Vazio -> amarelo
    expect(rangeContainer.className).toContain('border-amber-500');
    expect(rangeTitle.className).toContain('text-amber-700');
    expect(startLabel.className).toContain('text-amber-700');
    expect(endLabel.className).toContain('text-amber-700');

    // Apenas Horário inicial preenchido -> continua amarelo
    fireEvent.change(startInput, { target: { value: '10:00' } });
    expect(rangeContainer.className).toContain('border-amber-500');
    expect(rangeTitle.className).toContain('text-amber-700');
    expect(startLabel.className).toContain('text-amber-700');
    expect(endLabel.className).toContain('text-amber-700');

    fireEvent.change(endInput, { target: { value: '10:00' } });
    expect(screen.getByTestId('scheduling-summary-time')).toHaveTextContent('Não definido');

    saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(validateShippingScheduling(saved).shipping_time).toBe(
      'O horário final deve ser posterior ao horário inicial.'
    );

    fireEvent.change(endInput, { target: { value: '11:30' } });
    expect(rangeContainer.className).toContain('border-emerald-500');
    expect(rangeTitle.className).toContain('text-emerald-700');
    expect(startLabel.className).toContain('text-emerald-700');
    expect(endLabel.className).toContain('text-emerald-700');
    expect(screen.getByTestId('scheduling-summary-time')).toHaveTextContent('10:00 às 11:30');
    saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(validateShippingScheduling(saved).shipping_time).toBeUndefined();
  });

  it('preserva valores digitados em memória durante a sessão ao alternar entre opções, mas envia apenas a opção ativa', () => {
    render(<StatefulAgendamentoHarness />);
    const todayInfo = getSaoPauloDayInfo(0);

    fireEvent.click(screen.getByRole('button', { name: /Data específica/i }));
    fireEvent.change(screen.getByLabelText('Data desejada'), { target: { value: '2026-11-12' } });

    // Alterna para Hoje -> payload deve refletir apenas Hoje
    fireEvent.click(screen.getByRole('button', { name: /Hoje/i }));
    let saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(saved.date).toBe(todayInfo.isoDate);

    // Volta para Data específica -> valor digitado anteriormente continua preservado em memória
    fireEvent.click(screen.getByRole('button', { name: /Data específica/i }));
    expect((screen.getByLabelText('Data desejada') as HTMLInputElement).value).toBe('2026-11-12');
    saved = JSON.parse(screen.getByTestId('raw-scheduling-json').textContent || '{}');
    expect(saved.date).toBe('2026-11-12');
  });

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

  it('abre pedidos existentes selecionando e expandindo automaticamente a modalidade correspondente', () => {
    const todayIso = getSaoPauloDayInfo(0).isoDate;

    // 1. Data única salva (mesmo coincidindo com hoje) + turno Manhã (09:00 às 12:00)
    const { unmount: unmount1 } = render(
      <StatefulAgendamentoHarness
        initialScheduling={{
          date: todayIso,
          dateType: 'fixed',
          type: 'range',
          startTime: '09:00',
          endTime: '12:00',
          time: '09:00 às 12:00',
        }}
      />
    );
    expect(screen.getByTestId('card-check-custom-date')).toBeInTheDocument();
    expect((screen.getByLabelText('Data desejada') as HTMLInputElement).value).toBe(todayIso);
    expect(screen.getByTestId('card-check-morning')).toBeInTheDocument();
    unmount1();

    // 2. Período de datas salvo + turno Tarde (13:00 às 18:00)
    const { unmount: unmount2 } = render(
      <StatefulAgendamentoHarness
        initialScheduling={{
          date: '2026-10-20',
          endDate: '2026-10-25',
          dateType: 'range',
          type: 'range',
          startTime: '13:00',
          endTime: '18:00',
          time: '13:00 às 18:00',
        }}
      />
    );
    expect(screen.getByTestId('card-check-custom-date-range')).toBeInTheDocument();
    expect((screen.getByLabelText('Data inicial') as HTMLInputElement).value).toBe('2026-10-20');
    expect((screen.getByLabelText('Data final') as HTMLInputElement).value).toBe('2026-10-25');
    expect(screen.getByTestId('card-check-afternoon')).toBeInTheDocument();
    unmount2();

    // 3. Horário único salvo
    const { unmount: unmount3 } = render(
      <StatefulAgendamentoHarness
        initialScheduling={{
          date: '2026-10-20',
          dateType: 'fixed',
          type: 'fixed',
          startTime: '16:15',
          endTime: '',
          time: '16:15',
        }}
      />
    );
    expect(screen.getByTestId('card-check-custom-time')).toBeInTheDocument();
    expect((screen.getByLabelText('Horário desejado') as HTMLInputElement).value).toBe('16:15');
    unmount3();

    // 4. Outro intervalo de horário salvo
    render(
      <StatefulAgendamentoHarness
        initialScheduling={{
          date: '2026-10-20',
          dateType: 'fixed',
          type: 'range',
          startTime: '10:00',
          endTime: '11:30',
          time: '10:00 às 11:30',
        }}
      />
    );
    expect(screen.getByTestId('card-check-custom-time-range')).toBeInTheDocument();
    expect((screen.getByLabelText('Horário inicial') as HTMLInputElement).value).toBe('10:00');
    expect((screen.getByLabelText('Horário final') as HTMLInputElement).value).toBe('11:30');
  });

  it('mantém compatibilidade de persistência e mapeamento do banco para data/horário fixo e período', () => {
    const fixedTimeOrder: any = {
      orderType: 'sale',
      status: 'scheduled',
      date: '2026-10-15T12:00:00.000Z',
      items: [],
      itemsSummary: { totalQuantity: 1, itemsSubtotal: 100, totalFixedDiscount: 0, itemsTotalValue: 100, totalItemsCost: 50 },
      payments: [],
      paymentsSummary: { totalOrderValue: 100, totalPaid: 0, remainingBalance: 100 },
      customerData: { fullName: 'Cliente Teste', phone: '41999999999', fullAddress: {} },
      shipping: {
        value: 0,
        deliveryMethod: 'delivery',
        orderType: 'Entrega',
        scheduling: {
          date: '2026-10-20',
          endDate: '',
          dateType: 'fixed',
          type: 'fixed',
          startTime: '14:30',
          endTime: '',
          time: '14:30',
        },
      },
    };

    const record = buildOrderPersistencePayload(fixedTimeOrder);
    expect(record.scheduled_date).toBe('2026-10-20');
    expect(record.scheduled_start_time).toBe('14:30');
    expect(record.scheduled_end_time).toBeNull();

    const mappedBack = mapOrderFromDatabase({
      ...record,
      id: 'order-1',
      order_number: '101',
      created_at: '2026-10-15T12:00:00.000Z',
    });
    expect(mappedBack.shipping?.scheduling.date).toBe('2026-10-20');
    expect(mappedBack.shipping?.scheduling.dateType).toBe('fixed');
    expect(mappedBack.shipping?.scheduling.type).toBe('fixed');
    expect(mappedBack.shipping?.scheduling.startTime).toBe('14:30');
    expect(mappedBack.shipping?.scheduling.endTime).toBe('');
    expect(mappedBack.shipping?.scheduling.time).toBe('14:30');
  });
});
