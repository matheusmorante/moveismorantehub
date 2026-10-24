import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: ({ children }: any) => React.createElement('div', null, children),
  Text: ({ children }: any) => React.createElement('span', null, children),
  ScrollView: ({ children }: any) => React.createElement('div', null, children),
  TextInput: ({
    testID,
    accessibilityLabel,
    onChangeText: _onChangeText,
    style: _style,
    placeholderTextColor: _placeholderTextColor,
    autoCapitalize: _autoCapitalize,
    ...props
  }: any) =>
    React.createElement('input', {
      ...props,
      'data-testid': testID,
      'aria-label': accessibilityLabel,
      readOnly: true,
    }),
  TouchableOpacity: ({
    testID,
    accessibilityLabel,
    onPress: _onPress,
    style: _style,
    children,
  }: any) =>
    React.createElement(
      'button',
      { 'data-testid': testID, 'aria-label': accessibilityLabel, type: 'button' },
      children
    ),
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock('lucide-react-native', () => ({ X: () => null }));

import { InventoryResponsibleSelector } from './InventoryResponsibleSelector';

describe('seletor mobile do responsável pelo inventário', () => {
  it('exibe o responsável cadastrado na lista de colaboradores', () => {
    const employee = {
      id: 'people-employee-1',
      type: 'employees',
      full_name: 'Ana Souza',
      position: 'Estoquista',
      role: 'stockist',
    };
    const html = renderToStaticMarkup(
      <InventoryResponsibleSelector
        isDarkMode={false}
        employees={[employee]}
        selectedId={employee.id}
        isSynced
        onSelect={() => {}}
      />
    );

    expect(html).toContain('Responsável pelo Inventário');
    expect(html).toContain('Ana Souza');
    expect(html).toContain('Estoquista');
  });

  it('exibe estado de lista indisponível quando o índice de colaboradores não foi sincronizado', () => {
    const html = renderToStaticMarkup(
      <InventoryResponsibleSelector
        isDarkMode={false}
        employees={[]}
        selectedId=""
        isSynced={false}
        onRetrySync={() => {}}
        onSelect={() => {}}
      />
    );

    expect(html).toContain('A lista de responsáveis ainda não foi sincronizada');
    expect(html).toContain('inventory-responsible-retry-sync');
  });
});
