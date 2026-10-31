// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DeliverySchedule from '../index';

const fixtures = vi.hoisted(() => ({
  schedule: {
    '2026-10-26': Array.from({ length: 10 }, (_, index) => ({ id: `first-${index + 1}` })),
    '2026-10-27': Array.from({ length: 9 }, (_, index) => ({ id: `second-${index + 1}` })),
  },
  pending: [{ id: 'pending' }],
  types: ['delivery', 'pickup', 'assistance'],
}));

vi.mock('../useDeliverySchedule', () => ({
  useDeliverySchedule: () => ({
    schedule: fixtures.schedule, pendingOrders: fixtures.pending, loading: false,
    filter: 'default', setFilter: vi.fn(), scheduleType: 'delivery', setScheduleType: vi.fn(),
    typeFilter: fixtures.types, setTypeFilter: vi.fn(), selectedOrder: null,
    openOrderDetails: vi.fn(), closeOrderDetails: vi.fn(), handleShare: vi.fn(),
    startDate: '', setStartDate: vi.fn(), endDate: '', setEndDate: vi.fn(),
  }),
}));
vi.mock('../ScheduleCardView/Index', () => ({
  default: ({ schedule, pendingOrders }: { schedule: Record<string, { id: string }[]>; pendingOrders: { id: string }[] }) => (
    <div>
      {pendingOrders.map((order) => <span key={order.id}>{order.id}</span>)}
      {Object.entries(schedule).flatMap(([date, orders]) => orders.map((order) => <span key={order.id}>{date}: {order.id}</span>))}
    </div>
  ),
}));
vi.mock('../OrderDetailsModal', () => ({ default: () => null }));
vi.mock('../ShowroomAssemblyModal', () => ({ default: () => null }));
vi.mock('../../SalesOrder/modals/OrderEditModal', () => ({ default: () => null }));
vi.mock('../../SalesOrder/modals/AssistanceOrderModal', () => ({ default: () => null }));

afterEach(cleanup);

describe('DeliverySchedule', () => {
  it('renders all scheduled orders across dates without pagination and keeps pending orders available', () => {
    render(<MemoryRouter initialEntries={['/delivery-schedule']}><DeliverySchedule /></MemoryRouter>);
    expect(screen.getByText('2026-10-26: first-1')).toBeTruthy();
    expect(screen.getByText('2026-10-27: second-5')).toBeTruthy();
    expect(screen.getByText('2026-10-27: second-6')).toBeTruthy();
    expect(screen.getByText('2026-10-27: second-9')).toBeTruthy();
    expect(screen.getByText('pending')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Página 2' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Registros por página' })).toBeNull();
    expect(screen.queryByText('15 por página')).toBeNull();
  });
});
