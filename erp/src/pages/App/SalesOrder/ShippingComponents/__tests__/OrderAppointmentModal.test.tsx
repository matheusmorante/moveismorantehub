// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import { createEmptySchedulingSessionMemory } from '../agendamento/agendamentoSessionMemory';
import { OrderAppointmentModal } from '../OrderAppointmentModal';
import type { Appointment } from '../orderAppointmentsNormalization';

vi.mock('../MapRoute', () => ({
  default: () => <div data-testid="map-route" />,
}));
vi.mock('../AppointmentAddressDialog', () => ({
  AppointmentAddressDialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../FreteDistancia', () => ({
  default: () => <div data-testid="frete-distancia" />,
}));
vi.mock('../Agendamento', () => ({
  default: ({ modeSelector }: { modeSelector?: React.ReactNode }) => (
    <div data-testid="agendamento">{modeSelector}</div>
  ),
}));
vi.mock('../AppointmentNotices', () => ({
  AppointmentNotices: ({ deliveryMethod }: { deliveryMethod: string }) => (
    <div data-testid="appointment-notices">{deliveryMethod}</div>
  ),
}));

afterEach(cleanup);

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'op-1',
    deliveryMethod: 'delivery',
    itemIds: ['item-1'],
    itemQuantities: { 'item-1': 1 },
    itemHandlings: { 'item-1': { handlingType: '', assemblyResponsible: '' } },
    scheduling: { date: '2026-11-23', time: '09:00', startTime: '09:00', type: 'fixed' },
    notices: {},
    ...overrides,
  };
}

const baseShipping: Shipping = {
  value: 0,
  deliveryMethod: 'delivery',
  orderType: 'sale',
  scheduling: { date: '2026-11-23', time: '09:00', startTime: '09:00', type: 'fixed' },
};

const baseItems = [{ orderItemId: 'item-1', description: 'Mesa', quantity: 1 }] as Item[];

describe('OrderAppointmentModal', () => {
  it('navega entre etapas e bloqueia avanço sem modalidade', () => {
    const onStepChange = vi.fn();
    const memory = { current: null };
    const { rerender } = render(
      <OrderAppointmentModal
        appointment={makeAppointment({ deliveryMethod: '' })}
        index={0}
        mode="add"
        appointments={[makeAppointment({ deliveryMethod: '' })]}
        shipping={baseShipping}
        selectableItems={baseItems}
        errors={{}}
        isNewSaleFlow
        isSale
        cardMachineRequired={false}
        requestedStep="method"
        schedulingMemory={memory}
        onStepChange={onStepChange}
        onClose={vi.fn()}
        onClearMemory={vi.fn()}
        updateAppointments={vi.fn()}
        autoCalculateAppointmentDistance={vi.fn()}
      />,
    );

    expect((screen.getByRole('button', { name: 'Avançar para Itens' }) as HTMLButtonElement).disabled).toBe(true);

    rerender(
      <OrderAppointmentModal
        appointment={makeAppointment({ deliveryMethod: 'delivery' })}
        index={0}
        mode="edit"
        appointments={[makeAppointment({ deliveryMethod: 'delivery' })]}
        shipping={baseShipping}
        selectableItems={baseItems}
        errors={{}}
        isNewSaleFlow={false}
        isSale
        cardMachineRequired={false}
        requestedStep="method"
        schedulingMemory={memory}
        onStepChange={onStepChange}
        onClose={vi.fn()}
        onClearMemory={vi.fn()}
        updateAppointments={vi.fn()}
        autoCalculateAppointmentDistance={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Avançar para Itens' }));
    expect(onStepChange).toHaveBeenCalledWith('op-1', 'items');
  });

  it('limpa rota ao trocar para retirada e ativa retirada imediata no agendamento', () => {
    let current = [makeAppointment({ deliveryMethod: 'delivery', destinationCoords: [-25, -49] })];
    const updateAppointments = vi.fn((fn: (list: Appointment[]) => Appointment[]) => {
      current = fn(current);
    });
    const onClearMemory = vi.fn();
    const memory = { current: createEmptySchedulingSessionMemory() };

    const { rerender } = render(
      <OrderAppointmentModal
        appointment={current[0]}
        index={0}
        mode="edit"
        appointments={current}
        shipping={baseShipping}
        selectableItems={baseItems}
        errors={{}}
        isNewSaleFlow={false}
        isSale
        cardMachineRequired={false}
        requestedStep="method"
        schedulingMemory={memory}
        onStepChange={vi.fn()}
        onClose={vi.fn()}
        onClearMemory={onClearMemory}
        updateAppointments={updateAppointments}
        autoCalculateAppointmentDistance={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Retirada' }));
    expect(onClearMemory).toHaveBeenCalledOnce();
    expect(updateAppointments).toHaveBeenCalledWith(expect.any(Function), { clearRoute: true });
    expect(current[0].deliveryMethod).toBe('pickup');
    expect(current[0].destinationCoords).toBeUndefined();

    rerender(
      <OrderAppointmentModal
        appointment={current[0]}
        index={0}
        mode="edit"
        appointments={current}
        shipping={baseShipping}
        selectableItems={baseItems}
        errors={{}}
        isNewSaleFlow={false}
        isSale
        cardMachineRequired={false}
        requestedStep="schedule"
        schedulingMemory={memory}
        onStepChange={vi.fn()}
        onClose={vi.fn()}
        onClearMemory={onClearMemory}
        updateAppointments={updateAppointments}
        autoCalculateAppointmentDistance={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Retirada imediata' }));
    expect(memory.current).toBeNull();
    expect(current[0].scheduling.immediatePickup).toBe(true);
    expect(current[0].scheduling.dateType).toBe('fixed');
  });
});
