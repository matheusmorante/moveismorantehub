import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

let capturedSlideProps: any = null;

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

vi.mock('react-native', () => ({
  View: ({ children, ...props }: any) => React.createElement('div', props, children),
  Text: ({ children, ...props }: any) => React.createElement('span', props, children),
  TouchableOpacity: ({ children, onPress, ...props }: any) =>
    React.createElement('button', { ...props, onClick: onPress }, children),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Check: () => React.createElement('span', { 'data-testid': 'check-icon' }, '✓'),
  ClipboardCheck: () => null,
}));

vi.mock('../SlideHoldToStart', () => ({
  SlideHoldToStart: (props: any) => {
    capturedSlideProps = props;
    return React.createElement('div', {
      'data-testid': 'slide-button',
      'data-disabled': String(props.disabled),
    });
  },
}));

vi.mock('../delivery/preparation/DeliveryDestinationInfoCard', () => ({
  DeliveryDestinationInfoCard: () => null,
}));

vi.mock('../delivery/preparation/DeliveryResponsiblesSection', () => ({
  DeliveryResponsiblesSection: () => null,
}));

import { DeliveryPreparationStep } from '../delivery/DeliveryPreparationStep';
import { DeliveryStepActionFooter } from '../delivery/DeliveryStepActionFooter';
import { isDeliveryChecklistComplete } from '../../screens/delivery-preparation/deliveryFlowStepRules';

describe('DeliveryPreparationStep & DeliveryStepActionFooter — Checklist e Ativação do Botão Iniciar Rota', () => {
  const checklist = [
    { id: 'item-1', label: 'Carregado: 1x Cadeira' },
    { id: 'item-2', label: 'Carregado: Máquina de cartão' },
    { id: 'item-3', label: 'Ligar antes de sair' },
  ];

  const defaultProps = {
    customer: { fullName: 'João da Silva' },
    fullAddress: 'Rua das Flores, 123',
    checklist,
    checked: {},
    onToggleChecklist: vi.fn(),
    responsibles: [{ name: 'Carlos Motorista' }],
    onAddResponsible: vi.fn(),
    onRemoveResponsible: vi.fn(),
    isDarkMode: false,
  };

  const renderStepWithFooter = (
    checkedMap: Record<string, boolean>,
    customChecklist = checklist,
    saving = false
  ) => {
    capturedSlideProps = null;
    const isChecklistComplete = isDeliveryChecklistComplete(customChecklist, checkedMap);
    return renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(DeliveryPreparationStep, {
          ...defaultProps,
          checklist: customChecklist,
          checked: checkedMap,
          saving,
        }),
        React.createElement(DeliveryStepActionFooter, {
          currentStep: 1,
          isDarkMode: false,
          loading: saving,
          isChecklistComplete,
          paymentsConfirmed: false,
          onStartDelivery: vi.fn(),
          onArriveAtDestination: vi.fn(),
          onStepBackToPreparation: vi.fn(),
          onStartService: vi.fn(),
          onStepBackToRoute: vi.fn(),
          onFinishDelivery: vi.fn(),
          onStepBackToArrival: vi.fn(),
        })
      )
    );
  };

  it('mantém o botão de deslizar DESATIVADO quando nenhum item do checklist foi checado', () => {
    const html = renderStepWithFooter({});

    expect(html).toContain('Carregado: 1x Cadeira');
    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(true);
  });

  it('mantém o botão DESATIVADO quando apenas parte do checklist foi checada', () => {
    renderStepWithFooter({
      'item-1': true,
      'item-2': true,
    });

    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(true);
  });

  it('ATIVA o botão de deslizar quando TODOS os itens do checklist estão checados', () => {
    renderStepWithFooter({
      'item-1': true,
      'item-2': true,
      'item-3': true,
    });

    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(false);
  });

  it('mantém o botão DESATIVADO se saving = true, mesmo com checklist todo checado', () => {
    renderStepWithFooter(
      {
        'item-1': true,
        'item-2': true,
        'item-3': true,
      },
      checklist,
      true
    );

    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(true);
  });

  it('ativa o botão se o checklist for vazio e saving for false', () => {
    renderStepWithFooter({}, [], false);

    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(false);
  });
});
