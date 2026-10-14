// @vitest-environment happy-dom
import React, { useState } from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Product, { Variation } from '../../../../types/product.type';
import { computeVariationName } from '@/pages/utils/productVariationDefaults';
import { VariationIdentificationTab } from './VariationIdentificationTab';

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('@/pages/utils/variationService', () => ({
  saveAttributeValue: vi.fn(),
}));

const parentProduct = {
  name: 'Guarda-Roupa',
  description: '',
  categoryIds: [],
} as Product;

const initialVariation = {
  id: 'variation-1',
  name: 'Guarda-Roupa Branco 6 Portas',
  title: 'Guarda-Roupa Branco 6 Portas',
  marketplaceTitle: 'Guarda-Roupa Branco 6 Portas',
  attributes: [
    { name: 'Cor', value: 'Branco' },
    { name: 'Quantidade de portas', value: '6 portas' },
  ],
} as Variation;

const Harness = () => {
  const [formData, setFormData] = useState<Variation>(initialVariation);
  const buildName = (attributes: Variation['attributes'] = []) =>
    computeVariationName(parentProduct.name, attributes);

  return (
    <>
      <output data-testid="attribute-state">{JSON.stringify(formData.attributes)}</output>
      <VariationIdentificationTab
        formData={formData}
        setFormData={setFormData}
        parentProduct={parentProduct}
        dbAttributes={[
          { id: 'attr-cor', name: 'Cor' },
          { id: 'attr-portas', name: 'Quantidade de portas' },
        ]}
        dbAttributeValues={[]}
        setIsManageAttributesOpen={vi.fn()}
        getDefaultVariationName={buildName}
        getDefaultVariationTitle={buildName}
      />
    </>
  );
};

describe('VariationIdentificationTab - nome da variação com prefixo imutável e sufixo manual', () => {
  beforeEach(() => {
    cleanup();
  });
  it('exibe o prefixo do pai bloqueado e permite alterar o sufixo manual do nome da variação', () => {
    render(<Harness />);

    // O prefixo do pai está presente e fixo
    expect(screen.getByText('Guarda-Roupa')).toBeDefined();

    // O input de sufixo reflete o complemento da variação
    const suffixInput = screen.getByLabelText('Nome da variação') as HTMLInputElement;
    expect(suffixInput.value).toBe('Branco 6 Portas');

    // Alteração manual do sufixo atualiza o nome da variação
    fireEvent.change(suffixInput, { target: { value: 'Preto 4 Portas' } });
    expect(suffixInput.value).toBe('Preto 4 Portas');
  });

  it('aplica classes responsivas no container, badge e input para telas menores', () => {
    render(<Harness />);

    const suffixInput = screen.getByLabelText('Nome da variação') as HTMLInputElement;
    const container = suffixInput.parentElement;
    expect(container).toBeDefined();

    // Container deve quebrar em coluna no mobile e alinhar em linha em telas maiores
    expect(container?.className).toContain('flex-col');
    expect(container?.className).toContain('sm:flex-row');
    expect(container?.className).toContain('min-w-0');

    // Input deve ocupar largura total flexível sem forçar overflow (min-w-0 flex-1)
    expect(suffixInput.className).toContain('min-w-0');
    expect(suffixInput.className).toContain('flex-1');
    expect(suffixInput.className).toContain('w-full');

    // Badge do prefixo do pai deve truncar com max-w-full em telas menores e até 60% em telas maiores
    const badge = screen.getByText('Guarda-Roupa');
    const badgeContainer = badge.parentElement;
    expect(badgeContainer?.className).toContain('max-w-full');
    expect(badgeContainer?.className).toContain('sm:max-w-[60%]');
    expect(badge.className).toContain('truncate');
  });

  it('não exibe campo de título no catálogo para a variação', () => {
    render(<Harness />);

    expect(screen.queryByLabelText('Título no Catálogo')).toBeNull();
    expect(screen.queryByPlaceholderText('Título exibido no catálogo digital...')).toBeNull();
  });
});
