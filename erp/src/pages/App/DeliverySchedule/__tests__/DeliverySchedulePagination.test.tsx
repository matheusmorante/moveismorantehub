// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('DeliverySchedule pagination', () => {
  it('paginates scheduled orders across dates while keeping pending orders available', async () => {
    render(<MemoryRouter initialEntries={['/delivery-schedule']}><DeliverySchedule /></MemoryRouter>);
    expect(screen.getByText('2026-10-26: first-1')).toBeTruthy();
    expect(screen.getByText('2026-10-27: second-5')).toBeTruthy();
    expect(screen.queryByText('2026-10-27: second-6')).toBeNull();
    expect(screen.getByText('pending')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(screen.queryByText('2026-10-26: first-1')).toBeNull();
    expect(screen.getByText('2026-10-27: second-6')).toBeTruthy();
    expect(screen.getByText('pending')).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox', { name: 'Registros por página' }), { target: { value: '30' } });
    await waitFor(() => expect(screen.getByText('2026-10-26: first-1')).toBeTruthy());
    expect(screen.getByText('2026-10-27: second-9')).toBeTruthy();
  });
});
