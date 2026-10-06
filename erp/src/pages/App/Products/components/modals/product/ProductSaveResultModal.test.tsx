// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ProductSaveResultModal } from './ProductSaveResultModal';
import type Product from '@/pages/types/product.type';
import * as productService from '@/pages/utils/productService';

vi.mock('@/pages/utils/productService', () => ({
  saveProduct: vi.fn().mockResolvedValue('prod-123'),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const defaultChecks = {
  checksErp: { description: true, unitPrice: true, categories: true, supplier: true },
  checksEcom: { marketplaceTitle: true, description: true, dimensions: true, categories: true, images: true },
  erpLegible: true,
  ecomLegible: true,
};

describe('ProductSaveResultModal - Regra de Origem de Estoque Salvados e Usados', () => {
  it('renderiza o botão ERP desabilitado, cinza e semi-transparente para produto Salvados', () => {
    const salvadoProduct: Product = {
      id: 'prod-salvado-1',
      name: 'Sofá Salvados',
      description: 'Sofá Salvados',
      categoryIds: ['cat-1'],
      unitPrice: 500,
      unit: 'UN',
      active: false,
      productKind: 'salvado',
      status: 'hidden',
    };

    const handleClose = vi.fn();
    const handleCloseForm = vi.fn();
    const setFormData = vi.fn();

    render(
      <ProductSaveResultModal
        saveResult={{
          ...defaultChecks,
          product: salvadoProduct,
        }}
        onCloseModal={handleClose}
        onCloseForm={handleCloseForm}
        setFormData={setFormData}
      />
    );

    // 1. O botão do canal ERP deve estar desabilitado
    const erpButton = screen.getByRole('button', {
      name: /Ativar no ERP: Desativado para produtos com origem Salvados ou Usados/i,
    }) as HTMLButtonElement;

    expect(erpButton).toBeDefined();
    expect(erpButton.disabled).toBe(true);

    // 2. Deve ter classes de cinza, translúcido e cursor bloqueado
    expect(erpButton.className).toContain('opacity-50');
    expect(erpButton.className).toContain('cursor-not-allowed');
    expect(erpButton.className).toContain('grayscale');
    expect(erpButton.className).toContain('bg-slate-200');

    // 3. Ao clicar, nenhuma ação deve ser disparada
    fireEvent.click(erpButton);
    expect(productService.saveProduct).not.toHaveBeenCalled();

    // 4. Badge do ERP deve mostrar Desativado
    expect(screen.getByText('Desativado')).toBeDefined();
  });

  it('renderiza o botão ERP desabilitado, cinza e semi-transparente para produto Usados', () => {
    const usadoProduct: Product = {
      id: 'prod-usado-1',
      name: 'Armário Usado',
      description: 'Armário Usado',
      categoryIds: ['cat-1'],
      unitPrice: 300,
      unit: 'UN',
      active: false,
      productKind: 'usado',
      status: 'hidden',
    };

    const handleClose = vi.fn();
    const handleCloseForm = vi.fn();
    const setFormData = vi.fn();

    render(
      <ProductSaveResultModal
        saveResult={{
          ...defaultChecks,
          product: usadoProduct,
        }}
        onCloseModal={handleClose}
        onCloseForm={handleCloseForm}
        setFormData={setFormData}
      />
    );

    const erpButton = screen.getByRole('button', {
      name: /Ativar no ERP: Desativado para produtos com origem Salvados ou Usados/i,
    }) as HTMLButtonElement;

    expect(erpButton).toBeDefined();
    expect(erpButton.disabled).toBe(true);
    expect(erpButton.className).toContain('opacity-50');
    expect(erpButton.className).toContain('cursor-not-allowed');
    expect(erpButton.className).toContain('grayscale');

    fireEvent.click(erpButton);
    expect(productService.saveProduct).not.toHaveBeenCalled();

    expect(screen.getByText('Desativado')).toBeDefined();
  });

  it('permite alternar ativação do ERP normalmente para produto Convencional (Normal)', async () => {
    const normalProduct: Product = {
      id: 'prod-normal-1',
      name: 'Mesa Nova',
      description: 'Mesa Nova',
      categoryIds: ['cat-1'],
      unitPrice: 800,
      unit: 'UN',
      active: true,
      productKind: 'normal',
      status: 'hidden',
    };

    const handleClose = vi.fn();
    const handleCloseForm = vi.fn();
    const setFormData = vi.fn();

    render(
      <ProductSaveResultModal
        saveResult={{
          ...defaultChecks,
          product: normalProduct,
        }}
        onCloseModal={handleClose}
        onCloseForm={handleCloseForm}
        setFormData={setFormData}
      />
    );

    const erpButton = screen.getByRole('button', {
      name: /Desativar no ERP/i,
    }) as HTMLButtonElement;

    expect(erpButton.disabled).toBe(false);
    expect(erpButton.className).not.toContain('opacity-50');
    expect(erpButton.className).not.toContain('cursor-not-allowed');

    fireEvent.click(erpButton);
    expect(productService.saveProduct).toHaveBeenCalledTimes(1);
  });
});
