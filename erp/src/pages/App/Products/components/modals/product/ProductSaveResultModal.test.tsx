// @vitest-environment happy-dom
import React from 'react';
import { act, render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ProductSaveResultModal } from './ProductSaveResultModal';
import type Product from '@/pages/types/product.type';
import * as productService from '@/pages/utils/productService';
import * as characteristicGroupService from '@/pages/utils/characteristicGroupService';
import * as technicalFieldService from '@/pages/App/Products/services/technicalFieldService';

vi.mock('@/pages/utils/productService', () => ({
  saveProduct: vi.fn().mockResolvedValue('prod-123'),
}));
vi.mock('@/pages/App/Products/services/technicalFieldService', () => ({
  fetchTechnicalFieldDefinitions: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/pages/utils/characteristicGroupService', () => ({
  fetchCharacteristicGroups: vi.fn().mockResolvedValue({ groups: [], categories: [] }),
}));
beforeEach(() => {
  vi.mocked(productService.saveProduct).mockReset().mockImplementation(async (product) => product.id!);
  vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockReset().mockResolvedValue([]);
  vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockReset().mockResolvedValue({ groups: [], categories: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

const defaultChecks = {
  checksErp: { description: true, unitPrice: true, categories: true, supplier: true },
  checksEcom: { marketplaceTitle: true, description: true, dimensions: true, categories: true, images: true },
  erpLegible: true,
  ecomLegible: true,
};

describe('ProductSaveResultModal - Regra de Origem de Estoque Salvados e Usados', () => {
  it('conclusão aguarda callback e recusa explícita preserva cadastro salvo para retomar', async () => {
    let finish!: (value: boolean) => void;
    const callback = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; })).mockResolvedValueOnce(true);
    const close = vi.fn(), closeForm = vi.fn();
    const product = { id: 'product-1', name: 'Mesa', active: true, status: 'hidden' } as Product;
    render(<ProductSaveResultModal saveResult={{ ...defaultChecks, product }} onSuccess={callback} onCloseModal={close} onCloseForm={closeForm} setFormData={vi.fn()} />);
    fireEvent.click(screen.getByText('Concluir')); await waitFor(() => expect(callback).toHaveBeenCalledOnce()); expect(screen.getByRole('status')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.click(screen.getByLabelText('Fechar modal')); expect(close).not.toHaveBeenCalled(); expect(closeForm).not.toHaveBeenCalled();
    await act(async () => { finish(false); }); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Produto salvo'));
    expect(close).not.toHaveBeenCalled(); expect(productService.saveProduct).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Concluir')); await waitFor(() => expect(closeForm).toHaveBeenCalledOnce()); expect(callback).toHaveBeenCalledTimes(2);
  });
  it('renderiza o botão ERP desabilitado, cinza e semi-transparente para produto Salvados', () => {
    const salvadoProduct: Product = {
      itemType: 'product',
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
      itemType: 'product',
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
      itemType: 'product',
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
    await waitFor(() => expect(productService.saveProduct).toHaveBeenCalledTimes(1));
  });
  it.each(['erp', 'catalog'] as const)('canal %s passa pelo resolver e compartilha trava com conclusão', async (channel) => {
    let saved!: (id: string) => void;
    vi.mocked(productService.saveProduct).mockReturnValueOnce(new Promise<string>((resolve) => { saved = resolve; }));
    const close = vi.fn(), finish = vi.fn(), setFormData = vi.fn();
    const product = channel === 'catalog'
      ? {
          id: 'product-1', name: 'Mesa', description: 'Mesa de madeira', active: true,
          status: 'hidden', unitPrice: 500, categoryIds: ['cat-1'],
          images: ['https://example.test/mesa.jpg'], width: 80, height: 90, depth: 50,
          weight: 20,
          variations: [],
        } as unknown as Product
      : { id: 'product-1', name: 'Mesa', active: true, status: 'hidden', unitPrice: 0, variations: [] } as unknown as Product;
    render(<ProductSaveResultModal saveResult={{ ...defaultChecks, product }} onSuccess={finish} onCloseModal={close} onCloseForm={close} setFormData={setFormData} />);
    const channelButton = await screen.findByRole('button', { name: channel === 'erp' ? 'Desativar no ERP' : 'Publicar no Catálogo' });
    await waitFor(() => expect((channelButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(channelButton);
    await waitFor(() => expect(productService.saveProduct).toHaveBeenCalledOnce()); expect(setFormData).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Concluir')); fireEvent.keyDown(window, { key: 'Escape' }); expect(finish).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
    expect(productService.saveProduct).toHaveBeenCalledWith(expect.objectContaining(channel === 'erp' ? { active: false, unitPrice: 0 } : { status: 'published', unitPrice: 500 }));
    await act(async () => { saved('product-1'); }); await waitFor(() => expect(setFormData).toHaveBeenCalledOnce());
  });

  it('bloqueia publicação sem característica obrigatória da categoria, mas permite concluir o cadastro', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      {
        id: 'finish', name: 'Acabamento', dataType: 'text', options: [],
        isRequired: false, requiredCategoryIds: ['cat-1'],
      },
    ]);
    const product = {
      id: 'category-product', name: 'Mesa', description: 'Mesa de madeira', active: true,
      status: 'hidden', unitPrice: 500, categoryIds: ['cat-1'],
      images: ['https://example.test/mesa.jpg'], width: 80, height: 90, depth: 50,
      weight: 20,
      technicalValues: {}, variations: [],
    } as unknown as Product;
    const onSuccess = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <ProductSaveResultModal
        saveResult={{ ...defaultChecks, product }}
        onSuccess={onSuccess}
        onCloseModal={vi.fn()}
        onCloseForm={onClose}
        setFormData={vi.fn()}
      />
    );

    expect(await screen.findByText('Características obrigatórias: Acabamento')).toBeDefined();
    const publishButton = screen.getByRole('button', { name: 'Publicar no Catálogo' }) as HTMLButtonElement;
    expect(publishButton.disabled).toBe(true);
    fireEvent.click(publishButton);
    expect(productService.saveProduct).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('não inclui Quantidade de portas entre os requisitos de publicação', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      {
        id: 'door-quantity', name: 'Quantidade de portas', dataType: 'integer', options: [],
        groupId: 'doors', categoryIds: ['cat-1'], requiredProductCategoryIds: ['cat-1'], isRequired: false,
      },
    ]);
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'doors', name: 'Portas', description: '', isDefault: false,
      }],
      categories: [{ id: 'cat-1', name: 'Guarda-roupas' }],
    } as any);
    const product = {
      id: 'active-group-product', name: 'Guarda-roupa', description: 'Guarda-roupa', active: true,
      status: 'hidden', unitPrice: 500, categoryIds: ['cat-1'],
      images: ['https://example.test/guarda-roupa.jpg'], width: 80, height: 180, depth: 50,
      weight: 60,
      selectedCharacteristicGroupIds: ['doors'], activeCharacteristicGroupIds: ['doors'],
      selectedCharacteristicIds: [], variations: [],
    } as unknown as Product;

    render(
      <ProductSaveResultModal
        saveResult={{ ...defaultChecks, product }}
        onCloseModal={vi.fn()}
        onCloseForm={vi.fn()}
        setFormData={vi.fn()}
      />
    );

    const missingRequirements = await screen.findByText(/Características obrigatórias:/);
    expect(missingRequirements.textContent).not.toContain('Quantidade de portas');
  });

  it('bloqueia somente a publicação quando não consegue consultar os requisitos da categoria', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockRejectedValueOnce(
      new Error('offline')
    );
    const product = {
      id: 'category-offline-product', name: 'Mesa', description: 'Mesa de madeira', active: true,
      status: 'hidden', unitPrice: 500, categoryIds: ['cat-1'],
      images: ['https://example.test/mesa.jpg'], width: 80, height: 90, depth: 50,
      variations: [],
    } as unknown as Product;

    render(
      <ProductSaveResultModal
        saveResult={{ ...defaultChecks, product }}
        onCloseModal={vi.fn()}
        onCloseForm={vi.fn()}
        setFormData={vi.fn()}
      />
    );

    expect(await screen.findByText('Características da categoria não verificadas')).toBeDefined();
    expect((screen.getByRole('button', { name: 'Publicar no Catálogo' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Desativar no ERP' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it.each(['invalidId', 'invalidNumber', 'timeout', 'wrongAck'] as const)('canal com %s não publica alteração não confirmada', async (kind) => {
    if (kind === 'timeout') { vi.useFakeTimers(); vi.mocked(productService.saveProduct).mockReturnValueOnce(new Promise(() => {})); }
    if (kind === 'wrongAck') vi.mocked(productService.saveProduct).mockResolvedValueOnce('other');
    const product = { id: kind === 'invalidId' ? '' : 'product-1', name: 'Mesa', active: true, status: 'hidden', unitPrice: kind === 'invalidNumber' ? -1 : 0 } as Product;
    const setFormData = vi.fn(); render(<ProductSaveResultModal saveResult={{ ...defaultChecks, product }} onCloseModal={vi.fn()} onCloseForm={vi.fn()} setFormData={setFormData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Desativar no ERP' }));
    if (kind === 'timeout') await act(async () => { await vi.advanceTimersByTimeAsync(20001); }); else await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(setFormData).not.toHaveBeenCalled();
    if (kind.startsWith('invalid')) expect(productService.saveProduct).not.toHaveBeenCalled();
    else { expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); fireEvent.click(screen.getByRole('button', { name: 'Desativar no ERP' })); expect(productService.saveProduct).toHaveBeenCalledOnce(); }
  });
});
