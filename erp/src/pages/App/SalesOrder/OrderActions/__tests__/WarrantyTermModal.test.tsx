// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WarrantyTermModal } from '../WarrantyTermModal';
import type Order from '@/pages/types/order.type';
import * as warrantyService from '@/pages/utils/warranty/warrantyTermService';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
  supabasePublicUrl: 'https://hkoxhourxwlddgsfdgws.supabase.co',
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAdministrator: true,
    isRealAdministrator: true,
  }),
}));

describe('WarrantyTermModal Component — Ações de Termo de Garantia', () => {
  const sampleOrder = {
    id: 'ord-modal-test-1',
    orderNumber: 3045,
    orderIndex: 3045,
    orderType: 'sale',
    status: 'scheduled',
    date: '2026-10-15',
    seller: 'Vendedor Loja',
    customerData: {
      fullName: 'Ana Beatriz Ramos',
      phone: '(41) 99876-5432',
      cpfCnpj: '111.222.333-44',
    },
    items: [
      { orderItemId: 'item-1', description: 'Mesa de Centro Ripada Nogal', quantity: 1, unitPrice: 380 },
    ],
    itemsSummary: { totalQuantity: 1 },
    shipping: {},
    payments: [],
    paymentsSummary: {},
    observation: '',
  } as unknown as Order;

  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o modal de ações do Termo de Garantia sem a tela de preview A4', async () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);

    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} />);

    // Header do modal
    expect(screen.getByRole('heading', { name: 'Termo de Garantia' })).toBeDefined();
    expect(screen.getByText(/Pedido #.*3045.*Ana Beatriz Ramos/i)).toBeDefined();

    // Botões de ação principais
    expect(screen.getByText('Imprimir Termo de Garantia')).toBeDefined();
    expect(screen.getByText('Enviar para o Cliente')).toBeDefined();
    expect(screen.getByText('Enviar para o cliente diretamente (Cloud WhatsApp)')).toBeDefined();

    // NÃO deve renderizar elementos da antiga tela de preview A4
    expect(screen.queryByTitle(/Aumentar Zoom/i)).toBeNull();
    expect(screen.queryByTitle(/Redefinir zoom/i)).toBeNull();
    expect(screen.queryByTitle(/Ir para a página 2/i)).toBeNull();
    expect(screen.queryByText('TERMO DE')).toBeNull();
    expect(screen.queryByText(/Mais que uma compra/i)).toBeNull();
    expect(screen.queryByTestId('warranty-digital-signature-stamp')).toBeNull();
  });

  it('dispara o fluxo de impressão ao clicar em Imprimir Termo de Garantia', async () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);
    const mockPrint = vi.spyOn(warrantyService, 'printWarrantyTermDocument').mockImplementation(() => {});
    vi.spyOn(warrantyService, 'generateAndSaveWarrantyTerm').mockResolvedValue({
      record: {
        id: 'rec-1',
        order_id: sampleOrder.id!,
        document_version: 1,
        file_name: 'termo.pdf',
        file_url: 'https://example.com/termo.pdf',
        file_hash_sha256: 'hash123',
        delivery_status: 'not_sent',
        generated_at: new Date().toISOString(),
      },
      generatedPdf: {
        pdfBytes: new Uint8Array([1, 2, 3]),
        pdfBlob: new Blob(),
        pdfUrl: 'blob:test',
        sha256: 'hash123',
        fileName: 'termo.pdf',
        version: 1,
      },
    });

    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} />);

    const printBtn = screen.getByText('Imprimir Termo de Garantia');
    fireEvent.click(printBtn);

    await waitFor(() => {
      expect(mockPrint).toHaveBeenCalled();
    });
  });

  it('dispara o envio pelo WhatsApp com o telefone cadastrado ao clicar em Enviar para o Cliente', async () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);
    const mockSend = vi.spyOn(warrantyService, 'sendWarrantyTermWhatsApp').mockResolvedValue({
      success: true,
      message: 'Mensagem enviada com sucesso!',
      mode: 'wame',
    });
    vi.spyOn(warrantyService, 'generateAndSaveWarrantyTerm').mockResolvedValue({
      record: {
        id: 'rec-1',
        order_id: sampleOrder.id!,
        document_version: 1,
        file_name: 'termo.pdf',
        file_url: 'https://example.com/termo.pdf',
        file_hash_sha256: 'hash123',
        delivery_status: 'sent',
        generated_at: new Date().toISOString(),
      },
      generatedPdf: {
        pdfBytes: new Uint8Array([1, 2, 3]),
        pdfBlob: new Blob(),
        pdfUrl: 'blob:test',
        sha256: 'hash123',
        fileName: 'termo.pdf',
        version: 1,
      },
    });

    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} />);

    const whatsAppBtn = screen.getByText('Enviar para o Cliente');
    fireEvent.click(whatsAppBtn);

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientPhone: '(41) 99876-5432',
        })
      );
    });
  });

  it('dispara o envio direto via Meta Cloud API para administradores', async () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);
    const mockDirectMeta = vi.spyOn(warrantyService, 'sendDirectWarrantyTermViaMetaApi').mockResolvedValue(true);
    vi.spyOn(warrantyService, 'generateAndSaveWarrantyTerm').mockResolvedValue({
      record: {
        id: 'rec-1',
        order_id: sampleOrder.id!,
        document_version: 1,
        file_name: 'termo.pdf',
        file_url: 'https://example.com/termo.pdf',
        file_hash_sha256: 'hash123',
        delivery_status: 'sent',
        generated_at: new Date().toISOString(),
      },
      generatedPdf: {
        pdfBytes: new Uint8Array([1, 2, 3]),
        pdfBlob: new Blob(),
        pdfUrl: 'blob:test',
        sha256: 'hash123',
        fileName: 'termo.pdf',
        version: 1,
      },
    });

    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} isAdministrator={true} />);

    const cloudMetaBtn = screen.getByText('Enviar para o cliente diretamente (Cloud WhatsApp)');
    fireEvent.click(cloudMetaBtn);

    await waitFor(() => {
      expect(mockDirectMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientPhone: '(41) 99876-5432',
        })
      );
    });
  });

  it('desativa o botão de Cloud WhatsApp API para usuários não administradores', () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);
    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} isAdministrator={false} />);

    const cloudMetaBtn = screen.getByText('Enviar para o cliente diretamente (Cloud WhatsApp)').closest('button');
    expect(cloudMetaBtn?.disabled).toBe(true);
  });

  it('fecha o modal ao pressionar a tecla Escape', () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);
    const handleClose = vi.fn();
    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('fecha o modal ao clicar no botão Fechar ou no botão X', () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);
    const handleClose = vi.fn();
    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={handleClose} />);

    const closeBtn = screen.getByText(/^Fechar$/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const xBtn = screen.getByTitle('Fechar');
    fireEvent.click(xBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
