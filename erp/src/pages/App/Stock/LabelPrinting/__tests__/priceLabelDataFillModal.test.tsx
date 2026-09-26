// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PriceLabelDataFillModal } from '../components/modals/PriceLabelDataFillModal';
import * as catalogService from '../services/priceLabelCatalogService';
import { toast } from 'react-toastify';

vi.mock('../services/priceLabelCatalogService', () => ({
  searchProductsForLabel: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PriceLabelDataFillModal - Comportamento e Desacoplamento da UI', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onApplyProductTitle: vi.fn(),
    title: 'COLCHÃO D28',
    setTitle: vi.fn(),
    normalPrice: '499,00',
    setNormalPrice: vi.fn(),
    promoPrice: '399',
    setPromoPrice: vi.fn(),
    centsText: ',00',
    setCentsText: vi.fn(),
    currencySymbol: 'R$',
    setCurrencySymbol: vi.fn(),
    installments: '10x de 39,90',
    setInstallments: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catalogService.searchProductsForLabel).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('não renderiza conteúdo quando isOpen é false', () => {
    const { container } = render(
      <PriceLabelDataFillModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza o modal aberto na aba de busca por padrão', () => {
    render(<PriceLabelDataFillModal {...defaultProps} />);

    expect(screen.getByText('Produto Modelo & Dados')).toBeDefined();
    expect(screen.getByPlaceholderText('Digite o nome, código ou SKU do produto...')).toBeDefined();
    expect(screen.getByText('Puxar Produto da Lista')).toBeDefined();
    expect(screen.getByText('Preenchimento Manual')).toBeDefined();
  });

  it('executa busca com debounce chamando searchProductsForLabel sem Supabase na UI', async () => {
    const mockProducts: catalogService.PriceLabelCatalogProduct[] = [
      {
        id: 'p-1',
        name: 'SOFÁ RETRÁTIL 3 LUGARES',
        code: 'SOF-001',
        unit_price: 1899.0,
        promo_price: 1499.0,
        images: ['https://example.com/sofa.jpg'],
      },
    ];

    vi.mocked(catalogService.searchProductsForLabel).mockResolvedValue(mockProducts);

    render(<PriceLabelDataFillModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Digite o nome, código ou SKU do produto...');
    fireEvent.change(searchInput, { target: { value: 'sofa' } });

    await waitFor(() => {
      expect(catalogService.searchProductsForLabel).toHaveBeenCalledWith('sofa');
    }, { timeout: 1500 });

    await waitFor(() => {
      expect(screen.getByText('SOFÁ RETRÁTIL 3 LUGARES')).toBeDefined();
      expect(screen.getByText('CÓD: SOF-001')).toBeDefined();
      expect(screen.getByText('Puxar')).toBeDefined();
    }, { timeout: 1500 });
  });

  it('dispara onApplyProductTitle ao clicar em um produto retornado', async () => {
    const mockProducts: catalogService.PriceLabelCatalogProduct[] = [
      {
        id: 'p-2',
        name: 'MESA DE JANTAR 6 CADEIRAS',
        code: 'MES-002',
        unit_price: 1200.0,
      },
    ];

    vi.mocked(catalogService.searchProductsForLabel).mockResolvedValue(mockProducts);

    render(<PriceLabelDataFillModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Digite o nome, código ou SKU do produto...');
    fireEvent.change(searchInput, { target: { value: 'mesa' } });

    await waitFor(() => {
      expect(screen.getByText('MESA DE JANTAR 6 CADEIRAS')).toBeDefined();
    }, { timeout: 1500 });

    const productCard = screen.getByText('MESA DE JANTAR 6 CADEIRAS').closest('div[class*="cursor-pointer"]');
    expect(productCard).not.toBeNull();

    fireEvent.click(productCard!);
    expect(defaultProps.onApplyProductTitle).toHaveBeenCalledWith('MESA DE JANTAR 6 CADEIRAS');
  });

  it('alterna para aba Preenchimento Manual e sincroniza campos digitados', () => {
    render(<PriceLabelDataFillModal {...defaultProps} />);

    // Clica na aba Preenchimento Manual
    const manualTabBtn = screen.getByText('Preenchimento Manual');
    fireEvent.click(manualTabBtn);

    // Verifica campos manuais
    const titleInput = screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...');
    expect(titleInput).toBeDefined();

    fireEvent.change(titleInput, { target: { value: 'novo colchao super' } });
    expect(defaultProps.setTitle).toHaveBeenCalledWith('NOVO COLCHAO SUPER');

    const normalPriceInput = screen.getByPlaceholderText('Ex: 499,00');
    fireEvent.change(normalPriceInput, { target: { value: '599,00' } });
    expect(defaultProps.setNormalPrice).toHaveBeenCalledWith('599,00');

    const promoPriceInput = screen.getByPlaceholderText('Ex: 299');
    fireEvent.change(promoPriceInput, { target: { value: '450' } });
    expect(defaultProps.setPromoPrice).toHaveBeenCalledWith('450');

    const installmentsInput = screen.getByPlaceholderText('Ex: Em até 10x sem juros no cartão');
    fireEvent.change(installmentsInput, { target: { value: '12x sem juros' } });
    expect(defaultProps.setInstallments).toHaveBeenCalledWith('12x sem juros');
  });

  it('fecha o modal e notifica sucesso ao clicar em Aplicar na Etiqueta', () => {
    render(<PriceLabelDataFillModal {...defaultProps} />);

    // Vai para manual
    fireEvent.click(screen.getByText('Preenchimento Manual'));

    const applyBtn = screen.getByText('Aplicar na Etiqueta');
    fireEvent.click(applyBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Campos atualizados na etiqueta!');
  });

  it('fecha o modal ao clicar no botão X do cabeçalho', () => {
    const { container } = render(<PriceLabelDataFillModal {...defaultProps} />);

    const closeBtn = container.querySelector('button i.bi-x-lg')?.closest('button');
    expect(closeBtn).toBeDefined();

    fireEvent.click(closeBtn!);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
