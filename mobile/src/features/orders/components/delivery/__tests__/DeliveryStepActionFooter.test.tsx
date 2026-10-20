import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockInsets = { top: 0, bottom: 34, left: 0, right: 0 };

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => {
    // Flatten style array to inspect paddingBottom
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style || {};
    return React.createElement('div', { ...props, style: flatStyle }, children);
  },
  Text: ({ children, ...props }: any) => React.createElement('span', props, children),
  Animated: {
    Value: vi.fn(() => ({
      setValue: vi.fn(),
      interpolate: vi.fn(() => ({})),
    })),
    multiply: vi.fn((a, b) => ({ a, b })),
    spring: vi.fn(() => ({ start: (cb?: () => void) => cb && cb() })),
    View: ({ children, ...props }: any) => React.createElement('div', props, children),
  },
  PanResponder: {
    create: vi.fn(() => ({ panHandlers: {} })),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Truck: () => null,
  CheckCircle2: () => null,
  RotateCcw: () => null,
}));

import { DeliveryStepActionFooter } from '../DeliveryStepActionFooter';

describe('DeliveryStepActionFooter — Rodapé Fixo Ancorado na Zona Segura', () => {
  beforeEach(() => {
    mockInsets.bottom = 34;
  });

  it('respeita os insets de safe area da parte inferior do dispositivo', () => {
    mockInsets.bottom = 48; // Dispositivo com barra de 3 botões

    const html = renderToStaticMarkup(
      <DeliveryStepActionFooter
        currentStep={1}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={true}
        onStartDelivery={vi.fn()}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToRoute={vi.fn()}
      />
    );

    expect(html).toContain('padding-bottom:48px');
  });

  it('usa fallback de padding mínimo de 12px quando inset.bottom for 0', () => {
    mockInsets.bottom = 0;

    const html = renderToStaticMarkup(
      <DeliveryStepActionFooter
        currentStep={1}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={true}
        onStartDelivery={vi.fn()}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToRoute={vi.fn()}
      />
    );

    expect(html).toContain('padding-bottom:12px');
  });

  it('renderiza o slider de Iniciar Rota na Etapa 1', () => {
    const html = renderToStaticMarkup(
      <DeliveryStepActionFooter
        currentStep={1}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={true}
        onStartDelivery={vi.fn()}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToRoute={vi.fn()}
      />
    );

    expect(html).toContain('Deslize para INICIAR ROTA');
    expect(html).not.toContain('CHEGUEI NO DESTINO');
    expect(html).not.toContain('FINALIZAR');
  });

  it('renderiza slider para a esquerda (Cheguei no Destino) e para a direita (Voltar ao Preparo) na Etapa 2', () => {
    const html = renderToStaticMarkup(
      <DeliveryStepActionFooter
        currentStep={2}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={true}
        onStartDelivery={vi.fn()}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToRoute={vi.fn()}
      />
    );

    expect(html).toContain('Deslize para CHEGUEI NO DESTINO');
    expect(html).toContain('Deslize para VOLTAR AO PREPARO');
  });

  it('renderiza slider para a esquerda (Finalizar) e para a direita (Voltar para Em Rota) na Etapa 3', () => {
    const html = renderToStaticMarkup(
      <DeliveryStepActionFooter
        currentStep={3}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={true}
        onStartDelivery={vi.fn()}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToRoute={vi.fn()}
      />
    );

    expect(html).toContain('Deslize para FINALIZAR');
    expect(html).toContain('Deslize para VOLTAR PARA EM ROTA');
  });

  it('exibe alerta de pagamentos pendentes na Etapa 3 quando não confirmados', () => {
    const html = renderToStaticMarkup(
      <DeliveryStepActionFooter
        currentStep={3}
        isDarkMode={false}
        loading={false}
        isChecklistComplete={true}
        paymentsConfirmed={false}
        onStartDelivery={vi.fn()}
        onArriveAtDestination={vi.fn()}
        onStepBackToPreparation={vi.fn()}
        onFinishDelivery={vi.fn()}
        onStepBackToRoute={vi.fn()}
      />
    );

    expect(html).toContain('Confirme todos os pagamentos acima para liberar a finalização');
  });
});
