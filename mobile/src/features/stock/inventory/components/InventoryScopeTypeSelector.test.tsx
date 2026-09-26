import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: 'div', Text: 'span',
  TouchableOpacity: ({ testID: _testID, ...props }: any) => React.createElement('button', props),
  TextInput: ({ testID: _testID, placeholderTextColor: _placeholderTextColor, onChangeText, ...props }: any) =>
    React.createElement('input', { ...props, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChangeText?.(event.target.value) }),
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock('lucide-react-native', () => ({
  Package: () => null, Users: () => null, Filter: () => null, X: () => null, Search: () => null,
}));

import { InventoryScopeTypeSelector } from './InventoryScopeTypeSelector';
import { filterScopeSuppliers } from './filterScopeSuppliers';

describe('seleção de fornecedor no inventário', () => {
  const suppliers = [
    { id: '1', full_name: 'Fábrica São José' },
    { id: '2', full_name: 'Móveis Alfa' },
  ];

  it('exibe o campo de pesquisa ao abrir o modo por fornecedor', () => {
    const html = renderToStaticMarkup(<InventoryScopeTypeSelector
      isDarkMode={false} suppliers={suppliers} expandedType="supplier"
      onToggleExpand={() => {}} selectedSupplierId={null} onSelectSupplier={() => {}}
      customProducts={[]} onOpenSearch={() => {}} onRemoveCustomProduct={() => {}}
      onConfirmType={() => {}}
    />);

    expect(html).toContain('placeholder="Pesquisar fornecedor"');
    expect(html).toContain('Fábrica São José');
  });

  it('pesquisa nomes sem depender de maiúsculas ou acentos', () => {
    expect(filterScopeSuppliers(suppliers, 'sao jose')).toEqual([suppliers[0]]);
    expect(filterScopeSuppliers(suppliers, 'ALFA')).toEqual([suppliers[1]]);
    expect(filterScopeSuppliers(suppliers, 'inexistente')).toEqual([]);
  });
});
