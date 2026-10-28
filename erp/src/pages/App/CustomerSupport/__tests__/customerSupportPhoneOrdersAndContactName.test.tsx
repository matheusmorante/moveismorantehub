// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConversationItem } from '../components/ConversationItem';
import { CustomerInfoPanel } from '../components/CustomerInfoPanel';
import { CustomerOrderRecordsView } from '../components/infoPanel/CustomerOrderRecordsView';
import type { WhatsAppConversation } from '../types';
import * as supportOrdersService from '@/pages/utils/customerSupport/supportOrdersService';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'usr-1',
      role: 'admin',
      permissions: [
        'viewCustomerCommercialInfo',
        'viewOrders',
        'viewBudgets',
        'viewDeliverySchedule',
        'viewAssistanceOrders',
        'viewReturns',
      ],
    },
  }),
}));

vi.mock('@/pages/utils/accessRoles', () => ({
  getProfileRoles: () => ['admin', 'manager'],
}));

vi.mock('@/pages/utils/permissionService', () => ({
  canPerform: () => true,
}));

afterEach(cleanup);

describe('Central de Atendimento — Nome do WhatsApp e Pedidos por Telefone', () => {
  const baseConversation: WhatsAppConversation = {
    id: 'conv-123',
    businessPhoneNumberId: 'biz-1',
    contactPhone: '5511999998888',
    contactWaId: '5511999998888',
    contactName: 'Maria do WhatsApp',
    customerId: 'cust-erp-456',
    customerLinkStatus: 'auto_matched',
    customer: {
      id: 'cust-erp-456',
      fullName: 'Empresa Alpha Ltda (Nome ERP)',
      phone: '11999998888',
    },
    orders: [{ id: 'order-1' } as any],
    unreadCount: 0,
    status: 'open',
    lastMessageText: 'Olá, gostaria de saber do meu pedido',
    lastMessageAt: '2026-10-28T10:00:00Z',
    lastCustomerMessageAt: '2026-10-28T10:00:00Z',
    isArchived: false,
    internalNotes: null,
    tags: [],
    assignedTo: null,
    createdAt: '2026-10-28T09:00:00Z',
    updatedAt: '2026-10-28T10:00:00Z',
  };

  it('exibe o nome do perfil do WhatsApp no ConversationItem, e não o nome do cliente ERP/pedido', () => {
    render(
      <ConversationItem
        conversation={baseConversation}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );

    // O nome na lista de conversas deve ser o nome que a pessoa colocou no WhatsApp
    expect(screen.getByText('Maria do WhatsApp')).toBeTruthy();
    expect(screen.queryByText('Empresa Alpha Ltda (Nome ERP)')).toBeNull();
  });

  it('exibe o nome do perfil do WhatsApp e iniciais no CustomerInfoPanel, e não o nome do ERP', () => {
    render(
      <MemoryRouter>
        <CustomerInfoPanel
          conversation={baseConversation}
          isOpen={true}
          onClose={vi.fn()}
          onConversationUpdated={vi.fn()}
          onJumpToMessage={vi.fn()}
        />
      </MemoryRouter>
    );

    // No cabeçalho do perfil do contato deve constar o nome do WhatsApp
    expect(screen.getByRole('heading', { name: 'Maria do WhatsApp' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Empresa Alpha Ltda (Nome ERP)' })).toBeNull();
    // Iniciais no avatar
    expect(screen.getByText('MD')).toBeTruthy();
  });

  it('permite acessar os atalhos de Pedidos mesmo quando a conversa NÃO está vinculada ao cliente ERP', () => {
    const unlinkedConversation: WhatsAppConversation = {
      ...baseConversation,
      customerId: null,
      customerLinkStatus: 'unlinked',
      customer: null,
    };

    render(
      <MemoryRouter>
        <CustomerInfoPanel
          conversation={unlinkedConversation}
          isOpen={true}
          onClose={vi.fn()}
          onConversationUpdated={vi.fn()}
          onJumpToMessage={vi.fn()}
        />
      </MemoryRouter>
    );

    // Mesmo não vinculado, tendo permissão comercial, os atalhos comerciais aparecem
    expect(screen.getByRole('button', { name: /Pedidos/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Orçamentos/i })).toBeTruthy();
  });

  it('CustomerOrderRecordsView carrega e exibe pedidos pelo telefone mesmo com isLinked=false e mostra customerName do snapshot', async () => {
    const mockOrder: supportOrdersService.SupportOrderSummary = {
      id: 'ord-snapshot-999',
      orderNumber: 'PED-7788',
      customerName: 'Maria Silva (Snapshot)',
      status: 'active',
      totalAmount: 1250.5,
      itemsCount: 1,
      itemsPreview: '1x Sofá Retrátil',
      createdAt: '2026-10-28T11:00:00Z',
      isCanceled: false,
      isCompleted: false,
      isActive: true,
    };

    const spyGetRecords = vi.spyOn(supportOrdersService, 'getCustomerOrderRecordsPage').mockResolvedValue({
      records: [mockOrder],
      page: 1,
      pageSize: 15,
      total: 1,
    });

    render(
      <MemoryRouter>
        <CustomerOrderRecordsView
          contactPhone="5511999998888"
          orderGroup="sales"
          isLinked={false}
          canViewCommercial={true}
          selectedRecord={null}
          onSelectRecord={vi.fn()}
        />
      </MemoryRouter>
    );

    // Confirma que chamou a consulta pelo telefone do contato mesmo com isLinked=false
    await waitFor(() => {
      expect(spyGetRecords).toHaveBeenCalledWith(
        expect.anything(),
        '5511999998888',
        'sales',
        expect.objectContaining({ page: 1, pageSize: 15 })
      );
    });

    // O pedido e o nome gravado no snapshot devem estar visíveis
    await waitFor(() => {
      expect(screen.getByText(/#PED-7788/)).toBeTruthy();
      expect(screen.getByText('Maria Silva (Snapshot)')).toBeTruthy();
    });

    spyGetRecords.mockRestore();
  });
});
