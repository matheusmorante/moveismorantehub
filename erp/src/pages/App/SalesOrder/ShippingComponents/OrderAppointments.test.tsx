// @vitest-environment happy-dom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import type { SchedulingSessionMemory } from './Agendamento';
import { OrderAppointments } from './OrderAppointments';

vi.mock('./Agendamento', () => ({
  default: ({
    onChangeScheduling,
    title,
    modeSelector,
    groupPrimarySections,
    primarySectionExpanded,
    onTogglePrimarySection,
    scheduling,
    sessionMemoryRef,
  }: {
    onChangeScheduling: (key: string, value: string) => void;
    title?: string;
    modeSelector?: React.ReactNode;
    groupPrimarySections?: boolean;
    primarySectionExpanded?: boolean;
    onTogglePrimarySection?: () => void;
    scheduling?: Shipping['scheduling'];
    sessionMemoryRef?: React.MutableRefObject<SchedulingSessionMemory | null>;
  }) => (
    <>
      {sessionMemoryRef && !sessionMemoryRef.current && (() => {
        const date = scheduling?.date || '';
        const startTime = scheduling?.startTime || '';
        sessionMemoryRef.current = {
          initialized: true,
          lastHydratedSignature: '',
          dateMode: date ? 'custom_date' : null,
          timeMode: startTime ? 'custom_time' : null,
          customDate: date,
          customRangeStartDate: '',
          customRangeEndDate: '',
          customTime: startTime,
          customRangeStartTime: '',
          customRangeEndTime: '',
        };
      })()}
      {groupPrimarySections && (
        <button type="button" aria-expanded={primarySectionExpanded} onClick={onTogglePrimarySection}>
          {title}
        </button>
      )}
      {(!groupPrimarySections || primarySectionExpanded) && modeSelector}
      {(!groupPrimarySections || primarySectionExpanded) && (
        <button type="button" onClick={() => {
          onChangeScheduling('date', '2026-11-20');
          onChangeScheduling('startTime', '10:30');
        }}>Definir data e horário</button>
      )}
      <output data-testid="schedule-memory">{JSON.stringify(sessionMemoryRef?.current ?? null)}</output>
    </>
  ),
}));

vi.mock('./FreteDistancia', () => ({
  default: ({ title, value, onChangeValue }: { title: string; value: number; onChangeValue: (value: number) => void }) => (
    <div>
      <span>{title}</span>
      <output data-testid="operation-freight">{value}</output>
      <button type="button" onClick={() => onChangeValue(35)}>Definir frete da operação</button>
    </div>
  ),
}));

vi.mock('@/components/shared/AddressAutocompleteInput', () => ({
  AddressAutocompleteInput: ({
    value,
    onChange,
    label,
    className,
  }: {
    value?: string;
    onChange: (value: string) => void;
    label: string;
    className?: string;
  }) => (
    <label className={className}>
      {label}
      <input aria-label={label} value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  ),
}));

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({ companyAddress: 'Avenida Principal, 1, Colombo, PR' }),
  useSettings: () => ({
    companyAddress: 'Avenida Principal, 1, Colombo, PR',
    deliveryHandlingOptions: [{ label: 'Entregue montado' }],
    pickupHandlingOptions: [{ label: 'Retirada na caixa' }],
  }),
}));

const initial: Shipping = {
  value: 0, deliveryMethod: 'delivery', orderType: 'sale',
  scheduling: { date: '2026-11-18', time: '09:00', startTime: '09:00', type: 'fixed' },
};
const items = [
  { orderItemId: 'line-1', description: 'Mesa', quantity: 1 },
  { orderItemId: 'line-2', description: 'Cadeira', quantity: 2 },
] as Item[];

function Harness({ initialShipping = initial, errors = {}, sessionMemoryRef, orderItems = items, isNewSale = false, isSale = false }: { initialShipping?: Shipping; errors?: Record<string, string>; sessionMemoryRef?: React.MutableRefObject<SchedulingSessionMemory | null>; orderItems?: Item[]; isNewSale?: boolean; isSale?: boolean }) {
  const [shipping, setShipping] = useState(initialShipping);
  return <><OrderAppointments shipping={shipping} setShipping={setShipping} items={orderItems} errors={errors} sessionMemoryRef={sessionMemoryRef} isNewSale={isNewSale} isSale={isSale} />
    <output data-testid="shipping">{JSON.stringify(shipping)}</output></>;
}

const clickLastButton = (name: string | RegExp) => fireEvent.click(screen.getAllByRole('button', { name }).at(-1)!);
const openOperation = (number: number) => clickLastButton(`Editar operação ${number}`);
const expandOperationSection = (name: string | RegExp) => {
  const section = screen.getByRole('button', { name });
  if (section.getAttribute('aria-expanded') !== 'true') fireEvent.click(section);
};
const expandOperationItems = () => expandOperationSection(/Itens desta operação/);
const expandOperationAddress = () => expandOperationSection('Endereço e frete');
const expandOperationSchedule = () => expandOperationSection('Programação');
const closeOperation = () => fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
const addOperation = () => fireEvent.click(screen.getByRole('button', { name: 'Adicionar operação' }));
const selectHandling = (ariaLabel: string, option: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: ariaLabel }));
  fireEvent.click(screen.getByRole('option', { name: option }));
};

describe('agendamentos do pedido', () => {
  afterEach(cleanup);

  it('mantém os avisos editados separados em cada operação', () => {
    const withOperations = {
      ...initial,
      scheduling: {
        ...initial.scheduling,
        appointments: [
          {
            id: 'operation-1', deliveryMethod: 'delivery' as const, itemIds: ['line-1'],
            itemQuantities: { 'line-1': 1 },
            notices: { callBeforeDelivery: true, bringCardMachine: false, callOnArrival: false },
            scheduling: initial.scheduling,
          },
          {
            id: 'operation-2', deliveryMethod: 'delivery' as const, itemIds: ['line-2'],
            itemQuantities: { 'line-2': 1 },
            notices: { callBeforeDelivery: false, bringCardMachine: false, callOnArrival: true },
            scheduling: initial.scheduling,
          },
        ],
      },
    } as Shipping;
    render(<Harness initialShipping={withOperations} isSale />);

    openOperation(2);
    expect(screen.getByRole('heading', { name: 'Avisos sobre a Entrega' })).toBeTruthy();
    fireEvent.click(document.querySelector<HTMLInputElement>(
      'input[name="appointment-operation-2-callBeforeDelivery"][value="true"]'
    )!);
    closeOperation();

    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.scheduling.appointments[0].notices.callBeforeDelivery).toBe(true);
    expect(state.scheduling.appointments[1].notices).toMatchObject({
      callBeforeDelivery: true,
      bringCardMachine: false,
      callOnArrival: true,
    });
  });

  it('mantém apenas um tópico principal expandido no modal da operação', () => {
    render(<Harness />);
    openOperation(1);

    const itemsSection = screen.getByRole('button', { name: /Itens desta operação/ });
    const addressSection = screen.getByRole('button', { name: 'Endereço e frete' });
    const scheduleSection = screen.getByRole('button', { name: 'Programação' });

    expect(scheduleSection.getAttribute('aria-expanded')).toBe('true');
    expect(itemsSection.getAttribute('aria-expanded')).toBe('false');
    expect(addressSection.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(itemsSection);
    expect(itemsSection.getAttribute('aria-expanded')).toBe('true');
    expect(addressSection.getAttribute('aria-expanded')).toBe('false');
    expect(scheduleSection.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(addressSection);
    expect(addressSection.getAttribute('aria-expanded')).toBe('true');
    expect(itemsSection.getAttribute('aria-expanded')).toBe('false');
    expect(scheduleSection.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(scheduleSection);
    expect(scheduleSection.getAttribute('aria-expanded')).toBe('true');
    expect(itemsSection.getAttribute('aria-expanded')).toBe('false');
    expect(addressSection.getAttribute('aria-expanded')).toBe('false');
  });

  it('migra avisos antigos do pedido somente para a operação 1', () => {
    const withLegacyNotices = {
      ...initial,
      callBeforeDelivery: true,
      bringCardMachine: false,
      callOnArrival: true,
      scheduling: {
        ...initial.scheduling,
        appointments: [
          {
            id: 'operation-1', deliveryMethod: 'delivery' as const, itemIds: ['line-1'],
            itemQuantities: { 'line-1': 1 }, scheduling: initial.scheduling,
          },
          {
            id: 'operation-2', deliveryMethod: 'delivery' as const, itemIds: ['line-2'],
            itemQuantities: { 'line-2': 1 }, scheduling: initial.scheduling,
          },
        ],
      },
    } as Shipping;
    render(<Harness initialShipping={withLegacyNotices} isSale />);

    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.scheduling.appointments[0].notices).toMatchObject({
      callBeforeDelivery: true,
      bringCardMachine: false,
      callOnArrival: true,
    });
    expect(state.scheduling.appointments[1].notices).toBeUndefined();
    expect(state).not.toHaveProperty('callBeforeDelivery');
  });

  it('guarda modalidade e manuseio de cada parcela do item separadamente', () => {
    render(<Harness isSale />);
    openOperation(1);
    expandOperationItems();
    selectHandling('Manuseio de Cadeira', 'Entregue montado');
    fireEvent.change(screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }), { target: { value: '1' } });
    closeOperation();
    addOperation();
    fireEvent.click(screen.getByRole('radio', { name: 'Retirada' }));
    expect(screen.getByRole('heading', { name: 'Avisos sobre a Retirada' })).toBeTruthy();
    expandOperationItems();
    fireEvent.click(screen.getByRole('checkbox', { name: /Cadeira/ }));
    selectHandling('Manuseio de Cadeira', 'Retirada na caixa');
    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.scheduling.appointments[0]).toMatchObject({ deliveryMethod: 'delivery', itemHandlings: { 'line-2': { handlingType: 'Entregue montado' } } });
    expect(state.scheduling.appointments[1]).toMatchObject({ deliveryMethod: 'pickup', itemHandlings: { 'line-2': { handlingType: 'Retirada na caixa' } } });
    expect(state.deliveryMethod).toBe('delivery');
  });

  it('abre as opções de manuseio da operação em um diálogo contido na viewport', () => {
    render(<Harness />);
    openOperation(1);
    expandOperationItems();
    fireEvent.click(screen.getByRole('combobox', { name: 'Manuseio de Cadeira' }));

    const dialog = screen.getByRole('dialog', { name: 'Manuseio de Cadeira' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect((dialog as HTMLElement).style.maxHeight).toBe('calc(100dvh - 2rem)');
    expect((screen.getByRole('combobox', { name: 'Manuseio de Cadeira' }) as HTMLButtonElement)
      .getAttribute('aria-haspopup')).toBe('dialog');
    expect((screen.getByRole('listbox', { name: 'Manuseio de Cadeira' }) as HTMLElement).style.maxHeight)
      .toBe('max(6rem, calc(100dvh - 9rem))');

    fireEvent.click(screen.getByRole('option', { name: 'Entregue montado' }));
    expect(screen.queryByRole('dialog', { name: 'Manuseio de Cadeira' })).toBeNull();
  });

  it('permite atribuir um serviço a outra operação sem exigir manuseio de produto', () => {
    const service = { orderItemId: 'service', description: 'Instalação', quantity: 1, itemType: 'service' } as Item;
    render(<Harness orderItems={[...items, service]} />);
    openOperation(1);
    expandOperationItems();
    fireEvent.click(screen.getByRole('checkbox', { name: /Instalação/ }));
    closeOperation();
    addOperation();
    fireEvent.click(screen.getByRole('radio', { name: 'Entrega' }));
    expandOperationItems();
    fireEvent.click(screen.getByRole('checkbox', { name: /Instalação/ }));
    expect(screen.queryByRole('combobox', { name: 'Manuseio de Instalação' })).toBeNull();
    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.scheduling.appointments[1]).toMatchObject({
      deliveryMethod: 'delivery', itemIds: ['service'], itemQuantities: { service: 1 },
    });
  });

  it('ao mudar retirada imediata para entrega, pede uma programação de entrega', () => {
    const pickup = { ...initial, deliveryMethod: 'pickup', scheduling: { ...initial.scheduling, immediatePickup: true, notInformed: true } } as Shipping;
    render(<Harness initialShipping={pickup} />);
    openOperation(1);
    fireEvent.click(screen.getByRole('radio', { name: 'Entrega' }));
    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.deliveryMethod).toBe('delivery');
    expect(state.scheduling).toMatchObject({ immediatePickup: false, notInformed: false, date: '', startTime: '' });
  });

  it('limpa a memória visual da programação ao alternar uma segunda operação para pendente', () => {
    const scheduled = {
      ...initial,
      scheduling: {
        ...initial.scheduling,
        appointments: [
          {
            id: 'operation-1', deliveryMethod: 'delivery' as const, itemIds: ['line-1'],
            itemQuantities: { 'line-1': 1 },
            scheduling: { ...initial.scheduling, date: '2026-11-18', startTime: '09:00' },
          },
          {
            id: 'operation-2', deliveryMethod: 'pickup' as const, itemIds: ['line-2'],
            itemQuantities: { 'line-2': 1 },
            scheduling: { ...initial.scheduling, date: '2026-11-19', startTime: '14:00' },
          },
        ],
      },
    } as Shipping;

    render(<Harness initialShipping={scheduled} />);
    openOperation(2);
    expect(JSON.parse(screen.getByTestId('schedule-memory').textContent!)).toMatchObject({
      customDate: '2026-11-19', customTime: '14:00',
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Agendar depois' }));
    expect(JSON.parse(screen.getByTestId('schedule-memory').textContent!)).toMatchObject({
      dateMode: null, timeMode: null, customDate: '', customTime: '',
    });
    expect(JSON.parse(screen.getByTestId('shipping').textContent!).scheduling.appointments[1].scheduling)
      .toMatchObject({ pendingScheduling: true, date: '', startTime: '', endTime: '' });

    fireEvent.click(screen.getByRole('radio', { name: 'Agendar' }));
    expect(JSON.parse(screen.getByTestId('schedule-memory').textContent!)).toMatchObject({
      dateMode: null, timeMode: null, customDate: '', customTime: '',
    });
    expect(JSON.parse(screen.getByTestId('shipping').textContent!).scheduling.appointments[1].scheduling)
      .toMatchObject({ pendingScheduling: false, date: '', startTime: '', endTime: '' });
  });

  it('guarda o frete na operação de entrega, atualiza o card e oculta o campo na retirada', () => {
    render(<Harness />);
    openOperation(1);
    expandOperationAddress();
    expect(screen.getByText('Frete')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Definir frete da operação' }));
    closeOperation();

    expect(screen.getAllByText(/Frete R\$ 35,00/)).toHaveLength(2);
    expect(JSON.parse(screen.getByTestId('shipping').textContent!).value).toBe(35);

    openOperation(1);
    fireEvent.click(screen.getByRole('radio', { name: 'Retirada' }));
    expect(screen.queryByText('Frete')).toBeNull();
    expect(JSON.parse(screen.getByTestId('shipping').textContent!).value).toBe(0);
  });

  it('marca como pendente o endereço ausente e mostra o erro no tópico da operação', () => {
    render(<Harness errors={{
      shipping_appointment_principal_address_street: 'Rua é obrigatória.',
    }} />);

    expect(screen.getAllByText('Falta preencher').length).toBeGreaterThan(0);
    openOperation(1);
    expandOperationAddress();

    const addressLegend = screen.getByText('Endereço', { exact: true });
    expect(addressLegend.getAttribute('title')).toBe('Rua é obrigatória.');
    expect(addressLegend.className).toContain('text-red-600');
  });

  it('salva endereço diferente somente na operação editada', async () => {
    const twoOperations = {
      ...initial,
      scheduling: {
        ...initial.scheduling,
        appointments: [
          {
            id: 'first', deliveryMethod: 'delivery' as const, itemIds: ['line-1'],
            itemQuantities: { 'line-1': 1 }, useCustomerAddress: true, scheduling: initial.scheduling,
          },
          {
            id: 'second', deliveryMethod: 'delivery' as const, itemIds: ['line-2'],
            itemQuantities: { 'line-2': 2 }, useCustomerAddress: true, scheduling: initial.scheduling,
          },
        ],
      },
    } as Shipping;
    render(<Harness initialShipping={twoOperations} />);
    openOperation(2);
    expandOperationAddress();

    fireEvent.click(screen.getByRole('radio', { name: 'Usar endereço diferente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar endereço' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Rua/Avenida' }), { target: { value: 'Rua da Operação' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: 123'), { target: { value: '25' } });
    fireEvent.change(screen.getByPlaceholderText('Nome da cidade'), { target: { value: 'Colombo' } });
    expect((screen.getByRole('textbox', { name: 'Rua/Avenida' }) as HTMLInputElement).value).toBe('Rua da Operação');
    expect((screen.getByPlaceholderText('Ex: 123') as HTMLInputElement).value).toBe('25');
    expect((screen.getByPlaceholderText('Nome da cidade') as HTMLInputElement).value).toBe('Colombo');
    fireEvent.click(screen.getByRole('button', { name: /^Adicionar$/ }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Adicionar endereço' })).toBeNull());

    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.scheduling.appointments[0]).toMatchObject({ useCustomerAddress: true });
    expect(state.scheduling.appointments[0].deliveryAddress).toBeUndefined();
    expect(state.scheduling.appointments[1]).toMatchObject({
      useCustomerAddress: false,
      deliveryAddress: { street: 'Rua da Operação', number: '25', city: 'Colombo' },
    });
  });

  it('só exibe frete depois da operação nova ser definida como entrega', () => {
    render(<Harness isNewSale />);
    addOperation();
    expect(screen.queryByText('Frete')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Entrega' }));
    expandOperationAddress();
    expect(screen.getByText('Frete')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Retirada' }));
    expect(screen.queryByText('Frete')).toBeNull();
  });

  it('mantém quantidade e manuseio visíveis, porém desativados, para item não selecionado', () => {
    const partial = {
      ...initial,
      scheduling: {
        ...initial.scheduling,
        appointments: [{
          id: 'principal',
          deliveryMethod: 'delivery' as const,
          itemIds: ['line-1'],
          itemQuantities: { 'line-1': 1 },
          itemHandlings: { 'line-1': { handlingType: '', assemblyResponsible: '' } },
          scheduling: initial.scheduling,
        }],
      },
    } as Shipping;
    render(<Harness initialShipping={partial} />);
    openOperation(1);
    expandOperationItems();

    const appointmentItemsTable = screen.getAllByRole('table')
      .find((table) => table.className.includes('md:table'));
    expect(appointmentItemsTable).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Manuseio' })).toBeTruthy();
    const handlingLabels = Array.from(appointmentItemsTable!.querySelectorAll('td span'))
      .filter((label) => label.textContent?.trim().startsWith('Manuseio'));
    expect(handlingLabels).toHaveLength(2);
    expect(handlingLabels.every((label) => label.className.includes('md:hidden'))).toBe(true);
    const quantityInput = screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }) as HTMLInputElement;
    expect(quantityInput.disabled).toBe(true);
    expect(quantityInput.value).toBe('');
    expect((screen.getByRole('combobox', { name: 'Manuseio de Cadeira' }) as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox', { name: /Cadeira/ }) as HTMLInputElement).disabled).toBe(false);
    expect(quantityInput.closest('td')?.className).toContain('md:align-bottom');
    expect(quantityInput.closest('td')?.className).toContain('md:pb-0');
    const handlingCell = screen.getByRole('combobox', { name: 'Manuseio de Cadeira' }).closest('td');
    expect(handlingCell?.className).toContain('md:align-bottom');
    expect(handlingCell?.className).toContain('md:pb-0');
  });

  it('isola itens e programação de cada agendamento e espelha o primeiro na raiz', () => {
    render(<Harness />);
    openOperation(1);
    expandOperationItems();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }), { target: { value: '1' } });
    closeOperation();
    addOperation();
    expandOperationItems();
    fireEvent.click(screen.getByRole('checkbox', { name: /Cadeira/ }));
    expandOperationSchedule();
    fireEvent.click(screen.getByRole('button', { name: /Definir data e horário/ }));

    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.scheduling.date).toBe('2026-11-18');
    expect(state.scheduling.startTime).toBe('09:00');
    expect(state.scheduling.appointments[0].itemIds).toEqual(['line-1', 'line-2']);
    expect(state.scheduling.appointments[0].itemQuantities).toEqual({ 'line-1': 1, 'line-2': 1 });
    expect(state.scheduling.appointments[0].scheduling.date).toBe('2026-11-18');
    expect(state.scheduling.appointments[1].itemIds).toEqual(['line-2']);
    expect(state.scheduling.appointments[1].itemQuantities).toEqual({ 'line-2': 1 });
    expect(state.scheduling.appointments[1].scheduling).toMatchObject({ date: '2026-11-20', startTime: '10:30', time: '10:30' });

    closeOperation();
    openOperation(1);
    expandOperationSchedule();
    fireEvent.click(screen.getByRole('button', { name: /Definir data e horário/ }));
    const edited = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(edited.scheduling).toMatchObject({ date: '2026-11-20', startTime: '10:30', time: '10:30' });
    expect(edited.scheduling.appointments[1]).toEqual(state.scheduling.appointments[1]);
  });

  it('impede alocar mais unidades do que o pedido e libera unidades ao remover um agendamento', () => {
    render(<Harness />);
    openOperation(1);
    expandOperationItems();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }), { target: { value: '1' } });
    closeOperation();
    addOperation();
    expandOperationItems();
    expect((screen.getByRole('checkbox', { name: /Mesa/ }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /Cadeira/ }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }), { target: { value: '99' } });
    expect((screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }) as HTMLInputElement).value).toBe('1');
    closeOperation();
    clickLastButton(/Remover operação 2/);
    openOperation(1);
    expandOperationItems();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }), { target: { value: '2' } });
    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.scheduling.appointments[0].itemQuantities['line-2']).toBe(2);
  });

  it('disponibiliza apenas as unidades que ainda não foram atribuídas a outro agendamento', () => {
    render(<Harness />);
    openOperation(1);
    expandOperationItems();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }), { target: { value: '1' } });
    closeOperation();
    addOperation();
    expandOperationItems();
    expect((screen.getByRole('checkbox', { name: /Cadeira/ }) as HTMLInputElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('checkbox', { name: /Cadeira/ }));
    closeOperation();
    addOperation();
    expandOperationItems();
    expect((screen.getByRole('checkbox', { name: /Cadeira/ }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getAllByText('Todas as unidades já estão em outras operações').length).toBeGreaterThan(0);
    closeOperation();
    openOperation(2);
    expandOperationItems();
    fireEvent.click(screen.getByRole('checkbox', { name: /Cadeira/ }));
    closeOperation();
    openOperation(3);
    expandOperationItems();
    expect((screen.getByRole('checkbox', { name: /Cadeira/ }) as HTMLInputElement).disabled).toBe(false);
  });

  it.each(['quantity', 'selection'])('preserva as quantidades implícitas legadas ao editar %s', (action) => {
    const legacy = { ...initial, scheduling: { ...initial.scheduling, appointments: [
      { id: 'legacy', itemIds: ['line-1', 'line-2'], scheduling: initial.scheduling },
    ] } } as Shipping;
    render(<Harness initialShipping={legacy} errors={{ shipping_appointment_legacy_items: 'Quantidade inválida' }} />);
    openOperation(1);
    expandOperationItems();
    expect(screen.getByRole('checkbox', { name: /Cadeira/ }).getAttribute('title')).toBe('Quantidade inválida');
    if (action === 'quantity') {
      fireEvent.change(screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }), { target: { value: '1' } });
    } else {
      fireEvent.click(screen.getByRole('checkbox', { name: /Cadeira/ }));
    }
    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.scheduling.appointments[0].itemQuantities).toEqual(
      action === 'quantity' ? { 'line-1': 1, 'line-2': 1 } : { 'line-1': 1 }
    );
  });

  it('ao remover o primeiro, promove o próximo e limpa a memória da data anterior', () => {
    const memory = { current: { initialized: true } as SchedulingSessionMemory | null };
    render(<Harness sessionMemoryRef={memory} />);
    openOperation(1);
    expandOperationItems();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Quantidade de Cadeira/ }), { target: { value: '1' } });
    closeOperation();
    addOperation();
    expandOperationItems();
    fireEvent.click(screen.getByRole('checkbox', { name: /Cadeira/ }));
    expandOperationSchedule();
    fireEvent.click(screen.getByRole('button', { name: /Definir data e horário/ }));
    closeOperation();
    clickLastButton(/Remover operação 1/);
    const state = JSON.parse(screen.getByTestId('shipping').textContent!);
    expect(state.scheduling.appointments).toHaveLength(1);
    expect(state.scheduling).toMatchObject({ date: '2026-11-20', startTime: '10:30' });
    expect(state.scheduling.appointments[0].itemQuantities).toEqual({ 'line-2': 1 });
    expect(memory.current).toBeNull();
  });
});
