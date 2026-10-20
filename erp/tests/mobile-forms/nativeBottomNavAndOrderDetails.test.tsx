import React from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: (props: any) => <div {...props} />,
  Text: (props: any) => <span {...props} />,
  TouchableOpacity: ({ onPress, children, testID, accessibilityLabel, ...props }: any) => (
    <button onClick={onPress} data-testid={testID} aria-label={accessibilityLabel} {...props}>
      {children}
    </button>
  ),
  Modal: ({ visible, children }: any) => (visible ? <div data-testid="modal-root">{children}</div> : null),
  ScrollView: (props: any) => <div {...props} />,
  Image: (props: any) => <img alt="" {...props} />,
  Platform: { OS: 'web' },
  StatusBar: { currentHeight: 24 },
  StyleSheet: { create: (v: any) => v },
  Alert: { alert: vi.fn() },
  Animated: {
    Value: class {
      val: number;
      constructor(val: number) {
        this.val = val;
      }
      setValue(v: number) {
        this.val = v;
      }
    },
    spring: () => ({ start: (cb?: any) => cb?.() }),
    multiply: (a: any) => a,
    View: (props: any) => <div {...props} />,
  },
  PanResponder: {
    create: () => ({ panHandlers: {} }),
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 30, bottom: 20, left: 0, right: 0 }),
}));

vi.mock('lucide-react-native', () =>
  Object.fromEntries(
    [
      'ShoppingBag',
      'Package',
      'Calendar',
      'BarChart3',
      'Wallet',
      'Sparkles',
      'Route',
      'MoreHorizontal',
      'X',
      'ChevronRight',
      'Truck',
      'CheckCircle2',
      'RotateCcw',
      'AlertTriangle',
    ].map((name) => [name, (props: any) => <span data-testid={`icon-${name}`} {...props} />])
  )
);

vi.mock('../../../mobile/src/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

vi.mock('../../../mobile/src/features/orders/components/delivery/DeliveryStartConfirmModal', () => ({
  DeliveryStartConfirmModal: ({ visible, onConfirm, onCancel, testID }: any) =>
    visible ? (
      <div data-testid={testID || 'start-confirm-modal'}>
        <button onClick={onConfirm} data-testid="confirm-start-btn">Confirmar Início</button>
        <button onClick={onCancel} data-testid="cancel-start-btn">Voltar</button>
      </div>
    ) : null,
}));

vi.mock('../../../mobile/src/features/orders/components/delivery/UnattendedModal', () => ({
  UnattendedModal: ({ visible, onConfirm, onClose }: any) =>
    visible ? (
      <div data-testid="unattended-modal">
        <button onClick={() => onConfirm('Ausente', 'Não atendeu', [])} data-testid="confirm-unattended-btn">
          Confirmar Insucesso
        </button>
        <button onClick={onClose} data-testid="close-unattended-btn">Fechar</button>
      </div>
    ) : null,
}));

vi.mock('../../../mobile/src/features/orders/components/delivery/CancelDeliveryConfirmModal', () => ({
  CancelDeliveryConfirmModal: ({ visible, onConfirm, onClose }: any) =>
    visible ? (
      <div data-testid="cancel-modal">
        <button onClick={onConfirm} data-testid="confirm-cancel-btn">Confirmar Cancelamento</button>
        <button onClick={onClose} data-testid="close-cancel-btn">Fechar</button>
      </div>
    ) : null,
}));

import { useNativeBottomNav } from '../../../mobile/src/features/dashboard/components/bottom-nav/useNativeBottomNav';
import { getOrderDetailsStatusConfig } from '../../../mobile/src/components/modals/order-details/orderDetailsPresentation';
import { OrderDetailsModalHeader } from '../../../mobile/src/components/modals/order-details/OrderDetailsModalHeader';
import { DeliveryPreparationModals } from '../../../mobile/src/features/orders/screens/delivery-preparation/DeliveryPreparationModals';
import { DeliveryStepActionFooter } from '../../../mobile/src/features/orders/components/delivery/DeliveryStepActionFooter';
import { DeliveryArrivalStep } from '../../../mobile/src/features/orders/components/delivery/arrival/DeliveryArrivalStep';

describe('NativeBottomNav — useNativeBottomNav hook', () => {
  it('separa corretamente abas primárias (4) e overflow (restantes) quando há mais de 5 abas ativas', () => {
    const { result } = renderHook(() =>
      useNativeBottomNav({
        currentTab: 'pedidos',
        canSeeReports: true,
        canSeeProducts: true,
        canSeeFinance: true,
        isAdmin: true,
        WEB_URL: 'https://hub.morante.com.br',
      })
    );

    expect(result.current.hasOverflow).toBe(true);
    expect(result.current.primaryTabs).toHaveLength(4);
    expect(result.current.overflowTabs.length).toBeGreaterThan(0);
    expect(result.current.bottomInset).toBe(20);
    expect(result.current.totalNavHeight).toBe(78);
  });

  it('identifica corretamente aba ativa para rotas compostas de operações e logística', () => {
    const { result } = renderHook(() =>
      useNativeBottomNav({
        currentTab: 'montagens',
        canSeeReports: false,
        canSeeProducts: false,
        canSeeFinance: false,
        isAdmin: false,
        WEB_URL: 'https://hub.morante.com.br',
      })
    );

    // entregas cobre entregas e montagens
    expect(result.current.isTabActive('entregas')).toBe(true);
    expect(result.current.isTabActive('pedidos')).toBe(false);
  });

  it('desabilita a aba do Assistente quando o usuário não é administrador', () => {
    const { result } = renderHook(() =>
      useNativeBottomNav({
        currentTab: 'pedidos',
        canSeeReports: false,
        canSeeProducts: false,
        canSeeFinance: false,
        isAdmin: false,
        WEB_URL: 'https://hub.morante.com.br',
      })
    );

    const agentTab = [...result.current.primaryTabs, ...result.current.overflowTabs].find(
      (t) => t.key === 'agente'
    );
    expect(agentTab).toBeDefined();
    expect(agentTab?.disabled).toBe(true);
  });
});

describe('OrderDetailsModal — Presentation & Header', () => {
  it('mapeia status de entrega e cancelamento para configurações visuais adequadas', () => {
    const cancelledConfig = getOrderDetailsStatusConfig({ status: 'cancelled' }, 'cancelled', false);
    expect(cancelledConfig.statusColor).toBe('#dc2626');
    expect(cancelledConfig.statusLabel.toLowerCase()).toContain('cancel');

    const fulfilledConfig = getOrderDetailsStatusConfig({ status: 'fulfilled' }, 'fulfilled', false);
    expect(fulfilledConfig.statusColor).toBe('#16a34a');
    expect(fulfilledConfig.statusLabel).toBe('Atendido');

    const scheduledConfig = getOrderDetailsStatusConfig({ status: 'scheduled' }, 'scheduled', false);
    expect(scheduledConfig.statusColor).toBe('#d97706');
    expect(scheduledConfig.statusLabel).toBe('Agendado');
  });

  it('renderiza OrderDetailsModalHeader com código do pedido e botão de fechar funcional', () => {
    const onClose = vi.fn();
    const dummyOrder = {
      id: 'ord-123',
      order_number: 1042,
      seller: 'Carlos Silva',
      created_at: '2026-10-20T10:00:00Z',
      status: 'scheduled',
    };

    render(
      <OrderDetailsModalHeader
        order={dummyOrder}
        isDarkMode={false}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Detalhes do Pedido')).toBeDefined();
    expect(screen.getByText('#001042')).toBeDefined();
    expect(screen.getByText('Carlos Silva')).toBeDefined();

    const closeBtn = screen.getByRole('button', { name: /fechar detalhes do pedido/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('DeliveryPreparationModals — Desacoplamento dos modais', () => {
  it('gerencia visibilidade e callbacks dos 3 modais do fluxo de entrega', () => {
    const onConfirmStartRoute = vi.fn();
    const onCloseStartConfirmModal = vi.fn();
    const onConfirmUnattended = vi.fn();
    const onCloseUnattendedModal = vi.fn();
    const onConfirmCancelDelivery = vi.fn();
    const onCloseCancelModal = vi.fn();

    const { rerender } = render(
      <DeliveryPreparationModals
        order={{ id: 'ord-1' }}
        customer={{ fullName: 'João da Silva' }}
        responsibles={[]}
        saving={false}
        cancelling={false}
        isDarkMode={false}
        showStartConfirmModal={true}
        onCloseStartConfirmModal={onCloseStartConfirmModal}
        onConfirmStartRoute={onConfirmStartRoute}
        showUnattendedModal={false}
        onCloseUnattendedModal={onCloseUnattendedModal}
        onConfirmUnattended={onConfirmUnattended}
        showCancelModal={false}
        onCloseCancelModal={onCloseCancelModal}
        onConfirmCancelDelivery={onConfirmCancelDelivery}
      />
    );

    expect(screen.getByTestId('start-confirm-modal')).toBeDefined();
    fireEvent.click(screen.getByTestId('confirm-start-btn'));
    expect(onConfirmStartRoute).toHaveBeenCalledTimes(1);

    // Abre o modal de cancelamento
    rerender(
      <DeliveryPreparationModals
        order={{ id: 'ord-1' }}
        customer={{ fullName: 'João da Silva' }}
        responsibles={[]}
        saving={false}
        cancelling={false}
        isDarkMode={false}
        showStartConfirmModal={false}
        onCloseStartConfirmModal={onCloseStartConfirmModal}
        onConfirmStartRoute={onConfirmStartRoute}
        showUnattendedModal={false}
        onCloseUnattendedModal={onCloseUnattendedModal}
        onConfirmUnattended={onConfirmUnattended}
        showCancelModal={true}
        onCloseCancelModal={onCloseCancelModal}
        onConfirmCancelDelivery={onConfirmCancelDelivery}
      />
    );

    expect(screen.getByTestId('cancel-modal')).toBeDefined();
    fireEvent.click(screen.getByTestId('confirm-cancel-btn'));
    expect(onConfirmCancelDelivery).toHaveBeenCalledTimes(1);
  });
});

describe('DeliveryStepActionFooter — Ações de Deslizamento para 4 Etapas', () => {
  it('Etapa 1: Inicia o botão de iniciar rota na direita para arrastar para a esquerda (direction=left e «)', () => {
    const onStartDelivery = vi.fn();

    render(
      <DeliveryStepActionFooter
        currentStep={1}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={true}
        onStartDelivery={onStartDelivery}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onStartService={vi.fn()}
        onStepBackToRoute={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToArrival={vi.fn()}
      />
    );

    // O texto deve possuir o chevron apontando para a esquerda "«"
    expect(screen.getByText('« Deslize para INICIAR ROTA')).toBeDefined();
  });

  it('Etapa 2: Exibe botões de avançar para destino e voltar ao preparo', () => {
    render(
      <DeliveryStepActionFooter
        currentStep={2}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={true}
        onStartDelivery={vi.fn()}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onStartService={vi.fn()}
        onStepBackToRoute={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToArrival={vi.fn()}
      />
    );

    expect(screen.getByText('« Deslize para CHEGUEI NO DESTINO')).toBeDefined();
    expect(screen.getByText('Deslize para VOLTAR AO PREPARO »')).toBeDefined();
  });

  it('Etapa 3 (Chegada): Exibe botão de iniciar atendimento e voltar para em rota', () => {
    render(
      <DeliveryStepActionFooter
        currentStep={3}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={true}
        onStartDelivery={vi.fn()}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onStartService={vi.fn()}
        onStepBackToRoute={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToArrival={vi.fn()}
      />
    );

    expect(screen.getByText('« Deslize para INICIAR ATENDIMENTO')).toBeDefined();
    expect(screen.getByText('Deslize para VOLTAR PARA EM ROTA »')).toBeDefined();
  });

  it('Etapa 4 (Atendimento): Exibe botão de finalizar e voltar à chegada', () => {
    render(
      <DeliveryStepActionFooter
        currentStep={4}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={true}
        onStartDelivery={vi.fn()}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onStartService={vi.fn()}
        onStepBackToRoute={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToArrival={vi.fn()}
      />
    );

    expect(screen.getByText('« Deslize para FINALIZAR')).toBeDefined();
    expect(screen.getByText('Deslize para VOLTAR À CHEGADA »')).toBeDefined();
  });
});

describe('DeliveryArrivalStep — Etapa Chegada com Botão de Insucesso', () => {
  it('renderiza exclusivamente o botão "Não foi possível entregar" e aciona onOpenUnattendedModal', () => {
    const onOpenModal = vi.fn();
    render(
      <DeliveryArrivalStep
        isDarkMode={false}
        onOpenUnattendedModal={onOpenModal}
      />
    );

    const button = screen.getByRole('button', { name: /Não foi possível entregar/i });
    expect(button).toBeDefined();
    expect(screen.getByText('Não foi possível entregar')).toBeDefined();

    fireEvent.click(button);
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
