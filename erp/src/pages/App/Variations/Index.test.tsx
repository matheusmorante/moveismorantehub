// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import type { default as VariationType, CharacteristicGroup } from '../../types/variation.type';
import Variations from './Index';
import { useVariations } from './hooks/useVariations';

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: vi.fn(),
}));
vi.mock('./hooks/useVariations', () => ({ useVariations: vi.fn() }));
vi.mock('./components/AttributeCard', () => ({
  AttributeCard: ({ attribute }: { attribute: VariationType }) => <article>{attribute.name}</article>,
}));
vi.mock('./modals/CharacteristicGroupFormPanel', () => ({
  CharacteristicGroupFormPanel: ({
    group,
    characteristics,
  }: {
    group: CharacteristicGroup;
    characteristics: readonly VariationType[];
  }) => (
    <div role="dialog" aria-label={`Editar grupo ${group.name}`}>
      {characteristics.filter((item) => item.groupId === group.id).map((item) => item.name)}
    </div>
  ),
}));
vi.mock('./modals/VariationFormModal', () => ({
  VariationFormModal: ({ variation }: { variation: VariationType }) => (
    <div role="dialog" aria-label={`Editar característica ${variation.name}`} />
  ),
}));

describe('Variations initial characteristic focus', () => {
  const color: VariationType = {
    id: 'color-id',
    name: 'Cor',
    options: [{ id: 'blue', value: 'Azul' }],
    active: true,
    groupId: 'colors',
  };
  const group: CharacteristicGroup = { id: 'colors', name: 'Cores' };

  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({
      data: { groups: [group], categories: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useVariations).mockReturnValue({
      variations: [color],
      loading: false,
      error: null,
      refresh: vi.fn(),
      handleDelete: vi.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('expands Cor’s group and opens both group and characteristic editors', async () => {
    render(
      <Variations
        focusAttributeName="Cor"
        autoOpenAttributeName="Cor"
        onClose={vi.fn()}
      />
    );

    const groupDialog = await screen.findByRole('dialog', { name: 'Editar grupo Cores' });
    expect(groupDialog.textContent).toContain('Cor');
    expect(screen.getByRole('dialog', { name: 'Editar característica Cor' })).toBeDefined();
    expect(screen.getAllByRole('dialog').map((dialog) => dialog.getAttribute('aria-label'))).toEqual([
      'Editar grupo Cores',
      'Editar característica Cor',
    ]);
  });
});
