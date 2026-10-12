// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Order from '../../../types/order.type';
import PostOrderActionsModal from './PostOrderActionsModal';

vi.mock('./orderActionsConfig', () => ({
  buttons: [
    { key: 'issueNfe', label: 'Emitir nota fiscal de saída', icon: 'bi-receipt', color: '' },
    {
      key: 'printReturnOS',
      label: (order: Order) =>
        order.returnMethod === 'store_collection'
          ? 'Imprimir OS de Coleta da Devolução'
          : 'Imprimir Comprovante de Devolução',
      icon: 'bi-printer',
      color: '',
    },
    { key: 'sendReturnOSCustomer', label: 'Enviar pedido de devolução ao cliente', icon: 'bi-whatsapp', color: '' },
    { key: 'sendReturnOSTeam', label: 'Enviar dados da coleta da devolução para equipe', icon: 'bi-send', color: '' },
  ],
  actionsMap: {},
}));
vi.mock('../../../utils/orderHistoryService', () => ({ updateOrder: vi.fn() }));
vi.mock('../../../utils/nfe/orderFiscalBadgeService', () => ({
  fetchOrderFiscalBadgeStatuses: vi.fn().mockResolvedValue({}),
}));
vi.mock('./NfeEmissionModal', () => ({ NfeEmissionModal: () => null }));
vi.mock('./nfe-modal/NfeEnvironmentChoiceModal', () => ({
  NfeEnvironmentChoiceModal: () => null,
}));

const returnOrder = {
  id: undefined,
  orderType: 'return',
  status: 'scheduled',
  returnMethod: 'store_collection',
  linkedOrderCode: '000123',
  items: [],
} as unknown as Order;

describe('ações após cadastro do pedido de devolução', () => {
  afterEach(cleanup);

  it('exibe impressão e WhatsApp, sem oferecer emissão manual da NFD no modal', async () => {
    render(<PostOrderActionsModal order={returnOrder} onClose={vi.fn()} />);

    expect(
      await screen.findByRole('heading', { name: 'Ações após cadastro' })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Imprimir OS de Coleta da Devolução' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar pedido de devolução ao cliente' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Enviar dados da coleta da devolução para equipe' })
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /emitir.*nota fiscal/i })).toBeNull();
  });

  it('não oferece ação de coleta da equipe quando o cliente já entregou na loja', async () => {
    render(
      <PostOrderActionsModal
        order={{ ...returnOrder, status: 'fulfilled', returnMethod: 'store_delivery' } as Order}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Ações após cadastro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Imprimir Comprovante de Devolução' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /coleta.*equipe/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar pedido de devolução ao cliente' })).toBeTruthy();
  });

  it('não oferece envios de WhatsApp para um artefato de teste', async () => {
    render(
      <PostOrderActionsModal
        order={
          {
            ...returnOrder,
            is_test: true,
          } as Order
        }
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Ações após cadastro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Imprimir OS de Coleta da Devolução' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Enviar pedido de devolução ao cliente' })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Enviar dados da coleta da devolução para equipe' })
    ).toBeNull();
  });
});
