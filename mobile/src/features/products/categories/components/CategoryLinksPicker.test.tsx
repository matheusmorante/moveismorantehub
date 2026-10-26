import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rows: [] as Array<{
    disabled?: boolean;
    accessibilityState?: { checked?: boolean; disabled?: boolean };
    onPress?: () => void;
  }>,
}));

vi.mock('react-native', () => {
  const view = ({ children }: any) => React.createElement('div', null, children);
  const text = ({ children }: any) => React.createElement('span', null, children);

  return {
    View: view,
    Text: text,
    StyleSheet: { create: (styles: unknown) => styles },
    TouchableOpacity: ({ children, disabled, accessibilityState, onPress }: any) => {
      mocks.rows.push({ disabled, accessibilityState, onPress });
      return React.createElement('button', { disabled, onClick: onPress }, children);
    },
  };
});

vi.mock('lucide-react-native', () => ({ Check: () => null }));

import { CategoryLinksPicker } from './CategoryLinksPicker';

describe('CategoryLinksPicker', () => {
  beforeEach(() => {
    mocks.rows.length = 0;
  });

  it('bloqueia os vínculos e expõe o estado desativado durante o salvamento', () => {
    renderToStaticMarkup(
      <CategoryLinksPicker
        isEnv={false}
        dark={false}
        categories={[]}
        environments={[{ id: 'env-1', name: 'SALA' }]}
        selectedLinks={['env-1']}
        onToggleLink={vi.fn()}
        disabled
      />
    );

    expect(mocks.rows).toEqual([
      {
        disabled: true,
        accessibilityState: { checked: true, disabled: true },
        onPress: expect.any(Function),
      },
    ]);
  });

  it('mantém a seleção disponível fora do salvamento', () => {
    renderToStaticMarkup(
      <CategoryLinksPicker
        isEnv
        dark={false}
        categories={[{ id: 'cat-1', name: 'SOFÁ' }]}
        environments={[]}
        selectedLinks={[]}
        onToggleLink={vi.fn()}
      />
    );

    expect(mocks.rows[0]).toMatchObject({
      disabled: false,
      accessibilityState: { checked: false, disabled: false },
    });
  });
});
