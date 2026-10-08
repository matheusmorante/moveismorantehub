// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductFormReadinessIndicators } from './ProductFormReadinessIndicators';

const ecomStatus = {
  isLegible: false,
  checks: {
    marketplaceTitle: false,
    unitPrice: false,
    images: false,
    categories: false,
    dimensions: false,
  },
};

afterEach(cleanup);

describe('ProductFormReadinessIndicators', () => {
  it('exibe os estados atuais e direciona ao requisito clicado', () => {
    const navigateToRequirementField = vi.fn();
    render(
      <ProductFormReadinessIndicators
        formData={{ name: '', categoryIds: [], status: 'hidden' }}
        ecomStatus={ecomStatus}
        isService={false}
        navigateToRequirementField={navigateToRequirementField}
      />
    );

    expect(screen.getByText('ERP: Pendente')).toBeTruthy();
    expect(screen.getByText('Catálogo: Ocultado')).toBeTruthy();
    fireEvent.click(screen.getByText('Nome do Produto (Mínimo 2 letras)'));

    expect(navigateToRequirementField).toHaveBeenCalledWith('name');
  });

  it('oculta o requisito de dimensões para serviços', () => {
    render(
      <ProductFormReadinessIndicators
        formData={{ itemType: 'service' }}
        ecomStatus={ecomStatus}
        isService
        navigateToRequirementField={vi.fn()}
      />
    );

    expect(screen.queryByText('Ao menos uma dimensão ativa; todas as ativas > 0')).toBeNull();
  });
});
