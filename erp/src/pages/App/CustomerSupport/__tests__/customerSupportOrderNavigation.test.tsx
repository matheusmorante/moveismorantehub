// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CustomerOrdersTab } from '../components/infoPanel/CustomerOrdersTab';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';

const order: SupportOrderSummary = {
  id: 'f5531356-93d9-410a-991b-b444fd7152b7', orderNumber: '42', status: 'active',
  totalAmount: 100, itemsCount: 1, itemsPreview: '1x Item', createdAt: '2026-10-21T12:00:00Z',
  isCanceled: false, isCompleted: false, isActive: true,
};

function Destination() {
  const location = useLocation();
  return <output aria-label="Pedido selecionado">{location.state?.saleOrderIdToOpen}</output>;
}

function renderOrders(canViewCommercial = true, isLinked = true) {
  return render(<MemoryRouter initialEntries={['/atendimento']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/atendimento" element={<CustomerOrdersTab orders={[order]} isLinked={isLinked}
        canViewCommercial={canViewCommercial} isLoadingOrders={false} />} />
      <Route path="/sales-order" element={<Destination />} />
    </Routes>
  </MemoryRouter>);
}

afterEach(cleanup);

describe('Navegação dos pedidos da Central', () => {
  it('encaminha o identificador do cartão pelo contrato de seleção da lista de vendas', () => {
    renderOrders();
    fireEvent.click(screen.getByRole('link', { name: 'Abrir Pedido' }));
    expect(screen.getByLabelText('Pedido selecionado').textContent).toBe(order.id);
  });

  it('não oferece o atalho sem permissão comercial', () => {
    renderOrders(false);
    expect(screen.queryByRole('link', { name: 'Abrir Pedido' })).toBeNull();
    expect(screen.getByText(/não possui permissão/)).toBeTruthy();
  });

  it('não oferece pedidos sem cliente vinculado', () => {
    renderOrders(true, false);
    expect(screen.queryByRole('link', { name: 'Abrir Pedido' })).toBeNull();
    expect(screen.getByText(/Vincule um cliente/)).toBeTruthy();
  });
});
