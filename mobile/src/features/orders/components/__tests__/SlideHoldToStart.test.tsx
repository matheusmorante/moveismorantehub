import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const responderConfigs: any[] = [];

vi.mock('react-native', () => ({
  View: ({ children, onLayout, ...props }: any) => {
    if (onLayout) onLayout({ nativeEvent: { layout: { width: 300, height: 58 } } });
    return React.createElement('div', props, children);
  },
  Text: ({ children, ...props }: any) => React.createElement('span', props, children),
  Animated: {
    Value: vi.fn(() => ({
      setValue: vi.fn(),
      interpolate: vi.fn(() => ({})),
    })),
    multiply: vi.fn((a, b) => ({ a, b })),
    spring: vi.fn(() => ({
      start: (cb?: () => void) => cb && cb(),
    })),
    View: ({ children, ...props }: any) => React.createElement('div', props, children),
  },
  PanResponder: {
    create: vi.fn((config) => {
      responderConfigs.push(config);
      return { panHandlers: { _config: config } };
    }),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    absoluteFillObject: {},
  },
}));

vi.mock('lucide-react-native', () => ({
  Truck: () => null,
  CheckCircle2: () => null,
  RotateCcw: () => null,
}));

import { SlideHoldToStart } from '../SlideHoldToStart';

describe('SlideHoldToStart — Botão Deslizante com Deslize Único', () => {
  beforeEach(() => {
    responderConfigs.length = 0;
    vi.clearAllMocks();
  });

  it('dispara onComplete no primeiro deslize completo (sem exigir 2 deslizes)', () => {
    const onComplete = vi.fn();

    const element = React.createElement(SlideHoldToStart, {
      disabled: false,
      onComplete,
      actionText: 'Deslize para Iniciar Entrega »',
      direction: 'right',
    });

    const html = renderToStaticMarkup(element);

    // Verifica que o rótulo é direto e não contém "1 de 2" nem "2 de 2"
    expect(html).toContain('Deslize para Iniciar Entrega »');
    expect(html).not.toContain('1 de 2');
    expect(html).not.toContain('2 de 2');

    expect(responderConfigs.length).toBeGreaterThan(0);
    const responderConfig = responderConfigs[responderConfigs.length - 1];

    // Simula soltar o deslize alcançando > 85% do trilho
    responderConfig.onPanResponderRelease(null, { dx: 250, dy: 0 });

    // Deve ser chamado imediatamente no primeiro deslize
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('suporta onConfirm alternativamente a onComplete', () => {
    const onConfirm = vi.fn();

    const element = React.createElement(SlideHoldToStart, {
      loading: false,
      onConfirm,
      actionText: '« Deslize para CHEGUEI NO DESTINO',
      direction: 'left',
    });

    const html = renderToStaticMarkup(element);
    expect(html).toContain('CHEGUEI NO DESTINO');

    expect(responderConfigs.length).toBeGreaterThan(0);
    const responderConfig = responderConfigs[responderConfigs.length - 1];

    // Simula deslize para a esquerda (dx negativo para direction='left')
    responderConfig.onPanResponderRelease(null, { dx: -250, dy: 0 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('não dispara ação se o deslize for insuficiente (< 85%)', () => {
    const onComplete = vi.fn();

    const element = React.createElement(SlideHoldToStart, {
      disabled: false,
      onComplete,
      actionText: 'Deslize para Confirmar',
      direction: 'right',
    });

    renderToStaticMarkup(element);

    const responderConfig = responderConfigs[responderConfigs.length - 1];
    responderConfig.onPanResponderRelease(null, { dx: 50, dy: 0 });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('bloqueia interação quando loading = true', () => {
    const onComplete = vi.fn();

    const element = React.createElement(SlideHoldToStart, {
      loading: true,
      loadingLabel: 'Iniciando Rota...',
      onComplete,
      direction: 'right',
    });

    const html = renderToStaticMarkup(element);
    expect(html).toContain('Iniciando Rota...');

    const responderConfig = responderConfigs[responderConfigs.length - 1];
    expect(responderConfig.onStartShouldSetPanResponder()).toBe(false);
    expect(responderConfig.onMoveShouldSetPanResponder()).toBe(false);
  });

  it('bloqueia interação física e aplica estilo desativado quando disabled = true', () => {
    const onComplete = vi.fn();

    const element = React.createElement(SlideHoldToStart, {
      disabled: true,
      actionText: 'Deslize para INICIAR ROTA »',
      onComplete,
      direction: 'right',
    });

    const html = renderToStaticMarkup(element);
    expect(html).toContain('pointer-events="none"');
    expect(html).toContain('Deslize para INICIAR ROTA »');

    const responderConfig = responderConfigs[responderConfigs.length - 1];
    expect(responderConfig.onStartShouldSetPanResponder()).toBe(false);
    expect(responderConfig.onMoveShouldSetPanResponder()).toBe(false);

    // Tentar soltar no fim do percurso com disabled = true não dispara ação
    responderConfig.onPanResponderRelease(null, { dx: 250, dy: 0 });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
