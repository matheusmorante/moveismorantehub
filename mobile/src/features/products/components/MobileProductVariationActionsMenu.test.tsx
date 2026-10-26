import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  presses: [] as Array<{ label: string; onPress?: () => void; disabled?: boolean }>,
}));

vi.mock('react-native', () => {
  const nodeText = (node: any): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(nodeText).join('');
    if (node && typeof node === 'object' && 'props' in node) return nodeText(node.props.children);
    return '';
  };
  const view = ({ children }: any) => React.createElement('div', null, children);
  const text = ({ children }: any) => React.createElement('span', null, children);

  return {
    Alert: { alert: mocks.alert },
    Modal: ({ visible, children }: any) => (visible ? view({ children }) : null),
    StyleSheet: { create: (styles: unknown) => styles },
    Text: text,
    TouchableOpacity: ({ children, onPress, disabled }: any) => {
      mocks.presses.push({ label: nodeText(children), onPress, disabled });
      return React.createElement('button', { onClick: onPress, disabled }, children);
    },
    TouchableWithoutFeedback: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    View: view,
  };
});

vi.mock('lucide-react-native', () => {
  const icon = () => null;
  return {
    ArrowLeftRight: icon,
    Copy: icon,
    Edit3: icon,
    GitMerge: icon,
    QrCode: icon,
    Receipt: icon,
    Tag: icon,
    Trash2: icon,
    X: icon,
  };
});

import { MobileProductVariationActionsMenu } from './MobileProductVariationActionsMenu';

type MenuProps = React.ComponentProps<typeof MobileProductVariationActionsMenu>;

const renderMenu = (overrides: Partial<MenuProps> = {}) => {
  mocks.presses.length = 0;
  mocks.alert.mockClear();
  const props: MenuProps = {
    visible: true,
    dark: false,
    variationName: 'Camiseta Azul',
    onClose: vi.fn(),
    hasSupplier: true,
    hasValidAttributes: true,
    ...overrides,
  };
  const html = renderToStaticMarkup(<MobileProductVariationActionsMenu {...props} />);
  const press = (label: string) => {
    const action = mocks.presses.find((item) => item.label === label);
    if (!action?.onPress) throw new Error(`Ação não encontrada: ${label}`);
    return action.onPress;
  };
  return { html, props, press };
};

describe('MobileProductVariationActionsMenu', () => {
  beforeEach(() => {
    mocks.presses.length = 0;
    mocks.alert.mockReset();
  });

  it('renderiza as ações disponíveis da variação simples', () => {
    const { html } = renderMenu({
      onPrintLabel: vi.fn(),
      onEdit: vi.fn(),
      onDuplicate: vi.fn(),
      onMoveToAnotherFamily: vi.fn(),
      onMergeWithAnotherVariation: vi.fn(),
      onShowOrders: vi.fn(),
      onPrintPriceLabel: vi.fn(),
      onMoveProductToTrash: vi.fn(),
      canMoveProductToTrash: true,
    });

    expect(html).toContain('Camiseta Azul');
    expect(html).toContain('Imprimir Etiqueta de Identificação');
    expect(html).toContain('Editar Produto');
    expect(html).toContain('Duplicar');
    expect(html).toContain('Mover para Outro Pai');
    expect(html).toContain('Mesclar Variação');
    expect(html).toContain('Pedidos Vinculados');
    expect(html).toContain('Etiqueta de Preço');
    expect(html).toContain('Mover para lixeira');
  });

  it('duplica o produto pai pelo menu da variação única após fechar o menu', () => {
    const onDuplicate = vi.fn();
    const { press, props } = renderMenu({ onDuplicate });

    press('Duplicar')();

    expect(props.onClose).toHaveBeenCalledOnce();
    expect(onDuplicate).toHaveBeenCalledOnce();
  });

  it('informa o ERP equivalente quando mover não pode prosseguir sem fornecedor ou característica', () => {
    const onMove = vi.fn();
    const missingSupplier = renderMenu({
      hasSupplier: false,
      onMoveToAnotherFamily: onMove,
    });

    missingSupplier.press('Mover para Outro Pai')();
    expect(mocks.alert).toHaveBeenCalledWith(
      'Fornecedor obrigatório',
      'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
    );
    expect(onMove).not.toHaveBeenCalled();
    expect(missingSupplier.props.onClose).toHaveBeenCalledOnce();

    const missingAttribute = renderMenu({
      hasValidAttributes: false,
      onMoveToAnotherFamily: onMove,
    });
    missingAttribute.press('Mover para Outro Pai')();
    expect(mocks.alert).toHaveBeenCalledWith(
      'Característica obrigatória',
      'Este produto deve ter uma característica e um valor definidos.'
    );
    expect(onMove).not.toHaveBeenCalled();
  });

  it('exige fornecedor para mesclar, mas não exige atributo válido', () => {
    const onMerge = vi.fn();
    const missingSupplier = renderMenu({
      hasSupplier: false,
      onMergeWithAnotherVariation: onMerge,
    });

    missingSupplier.press('Mesclar Variação')();
    expect(mocks.alert).toHaveBeenCalledWith(
      'Fornecedor obrigatório',
      'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
    );
    expect(onMerge).not.toHaveBeenCalled();

    const validSupplier = renderMenu({
      hasValidAttributes: false,
      onMergeWithAnotherVariation: onMerge,
    });
    validSupplier.press('Mesclar Variação')();
    expect(onMerge).toHaveBeenCalledOnce();
    expect(validSupplier.props.onClose).toHaveBeenCalledOnce();
  });

  it('mantém bloqueios de lixeira acessíveis e retira ações operacionais da variação mesclada', () => {
    const blocked = renderMenu({
      onMoveProductToTrash: vi.fn(),
      canMoveProductToTrash: false,
      trashBlockReason: 'Há operações históricas vinculadas.',
    });
    const trashAction = mocks.presses.find((item) => item.label === 'Mover para lixeira');
    expect(trashAction?.disabled).toBe(true);
    expect(blocked.html).toContain('Há operações históricas vinculadas.');

    const merged = renderMenu({
      isMerged: true,
      onMoveToAnotherFamily: vi.fn(),
      onMergeWithAnotherVariation: vi.fn(),
      onShowOrders: vi.fn(),
      onPrintPriceLabel: vi.fn(),
      onMoveProductToTrash: vi.fn(),
    });
    expect(merged.html).toContain('mantida apenas para histórico');
    expect(merged.html).not.toContain('Mover para Outro Pai');
    expect(merged.html).not.toContain('Mesclar Variação');
    expect(merged.html).not.toContain('Pedidos Vinculados');
    expect(merged.html).not.toContain('Etiqueta de Preço');
    expect(merged.html).not.toContain('Mover para lixeira');
  });
});
