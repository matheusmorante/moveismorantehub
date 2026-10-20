import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

let capturedSlideProps: any = null;

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
  Check: () => null,
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

describe('DeliveryPreparationStep — Ativação Condicional do Botão Iniciar Rota', () => {
  const defaultProps = {
    customer: { fullName: 'João da Silva' },
    fullAddress: 'Rua das Flores, 123',
    checklist: [
      { id: 'item-1', label: 'Carregado: 1x Cadeira' },
      { id: 'item-2', label: 'Carregado: Máquina de cartão' },
      { id: 'item-3', label: 'Ligar antes de sair' },
    ],
    checked: {},
    onToggleChecklist: vi.fn(),
    responsibles: [{ name: 'Carlos Motorista' }],
    onAddResponsible: vi.fn(),
    onRemoveResponsible: vi.fn(),
    onStartDelivery: vi.fn(),
    saving: false,
    isDarkMode: false,
  };

  it('mantém o botão de deslizar DESATIVADO quando nenhum item do checklist foi checado', () => {
    capturedSlideProps = null;
    const element = React.createElement(DeliveryPreparationStep, {
      ...defaultProps,
      checked: {},
    });

    renderToStaticMarkup(element);

    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(true);
  });

  it('mantém o botão DESATIVADO quando apenas parte do checklist foi checada', () => {
    capturedSlideProps = null;
    const element = React.createElement(DeliveryPreparationStep, {
      ...defaultProps,
      checked: {
        'item-1': true,
        'item-2': true,
      },
    });

    renderToStaticMarkup(element);

    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(true);
  });

  it('ATIVA o botão de deslizar quando TODOS os itens do checklist estão checados', () => {
    capturedSlideProps = null;
    const element = React.createElement(DeliveryPreparationStep, {
      ...defaultProps,
      checked: {
        'item-1': true,
        'item-2': true,
        'item-3': true,
      },
    });

    renderToStaticMarkup(element);

    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(false);
  });

  it('mantém o botão DESATIVADO se saving = true, mesmo com checklist todo checado', () => {
    capturedSlideProps = null;
    const element = React.createElement(DeliveryPreparationStep, {
      ...defaultProps,
      saving: true,
      checked: {
        'item-1': true,
        'item-2': true,
        'item-3': true,
      },
    });

    renderToStaticMarkup(element);

    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(true);
  });

  it('ativa o botão se o checklist for vazio e saving for false', () => {
    capturedSlideProps = null;
    const element = React.createElement(DeliveryPreparationStep, {
      ...defaultProps,
      checklist: [],
      checked: {},
    });

    renderToStaticMarkup(element);

    expect(capturedSlideProps).not.toBeNull();
    expect(capturedSlideProps.disabled).toBe(false);
  });
});
