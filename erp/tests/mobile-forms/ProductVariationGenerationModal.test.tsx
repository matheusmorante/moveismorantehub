// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  fetchAttributes: vi.fn(),
}));

vi.mock('react-native', () => ({
  ActivityIndicator: () => null,
  Alert: { alert: mocks.alert },
  Modal: ({ visible, children }: any) => (visible ? <div>{children}</div> : null),
  ScrollView: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children }: any) => <span>{children}</span>,
  TouchableOpacity: ({ children, disabled, onPress, accessibilityLabel }: any) => (
    <button type="button" disabled={disabled} aria-label={accessibilityLabel} onClick={onPress}>
      {children}
    </button>
  ),
  View: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('lucide-react-native', () => {
  const Icon = () => null;
  return { Check: Icon, Eye: Icon, EyeOff: Icon, Sparkles: Icon, X: Icon };
});

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('../../../mobile/src/features/products/services/mobileAttributeService', () => ({
  fetchMobileAttributes: mocks.fetchAttributes,
}));

import { ProductVariationGenerationModal } from '../../../mobile/src/features/products/modals/ProductVariationGenerationModal';

describe('ProductVariationGenerationModal success state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAttributes.mockResolvedValue([
      {
        id: 'color',
        name: 'Cor',
        active: true,
        options: [{ id: 'blue', value: 'Azul' }],
      },
    ]);
  });

  it('keeps the modal open and clears selections after the real resolver accepts generation', async () => {
    const onClose = vi.fn();
    const onGenerate = vi.fn();

    render(
      <ProductVariationGenerationModal
        visible
        dark={false}
        onClose={onClose}
        onGenerate={onGenerate}
      />
    );

    fireEvent.click(await screen.findByText('Cor'));
    fireEvent.click(screen.getByText('Azul'));
    fireEvent.click(screen.getByText('Gerar'));

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith([
        { name: 'Cor', values: ['Azul'], showName: true },
      ]);
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Escolha ao menos um valor por característica')).toBeTruthy();
    expect(screen.getByText('Cor')).toBeTruthy();
    expect(mocks.alert).not.toHaveBeenCalled();
  });
});
