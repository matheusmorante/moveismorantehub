// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispatchAppNotification: vi.fn(),
  getOrderAssemblyKinds: vi.fn(() => []),
  notifyNewAssemblies: vi.fn(),
  notifyNewSaleAndAssemblies: vi.fn(),
  detectOrderChangedAreas: vi.fn(() => ['items']),
  formatOrderChangeNotification: vi.fn(() => ({
    title: 'Pedido alterado',
    message: 'Itens',
    type: 'order_edited',
  })),
  shouldNotifyOrderChange: vi.fn(() => true),
}));

vi.mock('@/pages/utils/pushNotificationService', () => ({
  dispatchAppNotification: mocks.dispatchAppNotification,
}));
vi.mock('@/pages/utils/orderEventNotificationService', () => ({
  getOrderAssemblyKinds: mocks.getOrderAssemblyKinds,
  notifyNewAssemblies: mocks.notifyNewAssemblies,
  notifyNewSaleAndAssemblies: mocks.notifyNewSaleAndAssemblies,
}));
vi.mock('@/pages/utils/orderChangeDetector', () => ({
  detectOrderChangedAreas: mocks.detectOrderChangedAreas,
  formatOrderChangeNotification: mocks.formatOrderChangeNotification,
  shouldNotifyOrderChange: mocks.shouldNotifyOrderChange,
}));
vi.mock('@/pages/utils/orderCode', () => ({ formatOrderCode: vi.fn(() => '123') }));

import {
  dispatchOrderCreationNotifications,
  dispatchOrderUpdateNotifications,
} from '../orderNotificationDispatcher';

describe('notificações de orçamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não dispara notificações de venda quando cadastra orçamento', () => {
    dispatchOrderCreationNotifications('orcamento-1', {
      orderType: 'budget',
      status: 'quoted',
    } as any);

    expect(mocks.notifyNewSaleAndAssemblies).not.toHaveBeenCalled();
    expect(mocks.notifyNewAssemblies).not.toHaveBeenCalled();
    expect(mocks.dispatchAppNotification).not.toHaveBeenCalled();
  });

  it('não dispara notificações de venda ao editar orçamento', () => {
    const budget = { orderType: 'budget', status: 'quoted' };
    dispatchOrderUpdateNotifications('orcamento-1', budget, budget as any, 'quoted', 'quoted');

    expect(mocks.notifyNewSaleAndAssemblies).not.toHaveBeenCalled();
    expect(mocks.notifyNewAssemblies).not.toHaveBeenCalled();
    expect(mocks.dispatchAppNotification).not.toHaveBeenCalled();
  });
});
