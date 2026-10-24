import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: 'div',
  Text: 'span',
  TouchableOpacity: ({ testID: _testID, ...props }: any) => React.createElement('button', props),
  TextInput: ({
    testID: _testID,
    placeholderTextColor: _placeholderTextColor,
    onChangeText,
    ...props
  }: any) =>
    React.createElement('input', {
      ...props,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChangeText?.(event.target.value),
    }),
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock('lucide-react-native', () => ({
  Package: () => null,
  Users: () => null,
  Filter: () => null,
  X: () => null,
  Search: () => null,
}));

import { InventoryScopeTypeSelector } from './InventoryScopeTypeSelector';
import { filterScopeSuppliers } from './filterScopeSuppliers';

describe('seleção de escopo no inventário', () => {
  it('exibe as opções de Estoque Completo: Etapas por Fornecedor e Seleção Personalizada', () => {
    const html = renderToStaticMarkup(
      <InventoryScopeTypeSelector
        isDarkMode={false}
        expandedType={null}
        onToggleExpand={() => {}}
        customProducts={[]}
        onOpenSearch={() => {}}
        onRemoveCustomProduct={() => {}}
        onConfirmType={() => {}}
      />
    );

    expect(html).toContain('Estoque Completo: Etapas por Fornecedor');
    expect(html).toContain('Seleção Personalizada');
    expect(html).not.toContain('Por Fornecedor');
  });

  it('mantém os itens copiados no escopo personalizado sem permitir trocar ou editar a seleção', () => {
    const product = { id: 'product-1', variation_id: 'variation-1', name: 'Variação atual', stock: 4 };
    const html = renderToStaticMarkup(
      <InventoryScopeTypeSelector
        isDarkMode={false}
        expandedType="custom"
        lockedCustomSelection
        onToggleExpand={() => {}}
        customProducts={[product]}
        onOpenSearch={() => {}}
        onRemoveCustomProduct={() => {}}
        onConfirmType={() => {}}
      />
    );

    expect(html).toContain('Variação atual');
    expect(html).toContain('Continuar com 1 item(ns)');
    expect(html).not.toContain('Estoque Completo');
    expect(html).not.toContain('Adicionar produto ou variação');
    expect(html).not.toContain('Remover Variação atual');
  });

  it('pesquisa nomes de fornecedores no helper sem depender de maiúsculas ou acentos', () => {
    const suppliers = [
      { id: '1', full_name: 'Fábrica São José' },
      { id: '2', full_name: 'Móveis Alfa' },
    ];
    expect(filterScopeSuppliers(suppliers, 'sao jose')).toEqual([suppliers[0]]);
    expect(filterScopeSuppliers(suppliers, 'ALFA')).toEqual([suppliers[1]]);
    expect(filterScopeSuppliers(suppliers, 'inexistente')).toEqual([]);
  });
});
