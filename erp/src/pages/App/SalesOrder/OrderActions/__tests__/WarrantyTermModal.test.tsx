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

describe('WarrantyTermModal Component — Móveis Morante (Modelo 2)', () => {
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

  it('renderiza a Página 1 (Capa Modelo 2) com logo, título e slogan oficial caligráfico', async () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);

    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} />);

    // Topo do leitor
    expect(screen.getByText(/Termo de Garantia — Pedido #/i)).toBeDefined();

    // Capa (Página 1):
    expect(screen.getAllByText('TERMO DE GARANTIA').length).toBeGreaterThan(0);
    expect(screen.getByText('TERMO DE')).toBeDefined();
    // Subtítulo removido a pedido do usuário
    expect(screen.queryByText('Qualidade, confiança e tranquilidade para você.')).toBeNull();

    // Slogan em 2 linhas com escrita à mão no lugar do antigo subtítulo
    expect(screen.getByText('Mais que uma compra,')).toBeDefined();
    expect(screen.getByText('uma parceria!')).toBeDefined();

    // Título Principal em destaque gigante
    expect(screen.getAllByText('GARANTIA').length).toBeGreaterThan(0);
    // Título MÓVEIS MORANTE abaixo da logo removido da capa a pedido do usuário (já está na logo)
    const coverPage = document.querySelector('[data-page="1"]');
    expect(coverPage?.querySelector('h2')).toBeNull();

    // Slogan 'Móveis para uma vida melhor' removido a pedido do usuário
    expect(screen.queryByText('Móveis para uma vida melhor')).toBeNull();

    // Rótulos de benefícios (selos) removidos a pedido do usuário para destacar o slogan
    expect(screen.queryByText('PRODUTOS')).toBeNull();
    expect(screen.queryByText('SELECIONADOS')).toBeNull();
    expect(screen.queryByText('SATISFAÇÃO')).toBeNull();
    expect(screen.queryByText('GARANTIDA')).toBeNull();
    expect(screen.queryByText('SUPORTE')).toBeNull();
    expect(screen.queryByText('ESPECIALIZADO')).toBeNull();
    expect(screen.queryByText('COMPRA')).toBeNull();
    expect(screen.queryByText('SEGURA')).toBeNull();

    // Cards removidos não devem estar na capa
    expect(screen.queryByText('Atendimento Especializado')).toBeNull();
    expect(screen.queryByText('Benefícios e Compromissos Morante')).toBeNull();
    expect(screen.queryByText(/Consulte abaixo as orientações completas/i)).toBeNull();

    // Carimbo Oficial do Certificado Digital / Assinatura Digital ICP-Brasil
    expect(screen.getByTestId('warranty-digital-signature-stamp')).toBeDefined();
    expect(screen.getByText('Documento Assinado Digitalmente')).toBeDefined();
    expect(screen.getByText('ICP-Brasil / A1')).toBeDefined();
    expect(screen.getAllByText(/44\.512\.248\/0001-07/).length).toBeGreaterThan(1);

    // Dados do pedido e cliente no documento
    expect(screen.getAllByText('Ana Beatriz Ramos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(41) 99876-5432').length).toBeGreaterThan(0);
  });

  it('navega para a Página 2 com itens do pedido e tópicos 1 a 4 (incluindo regra de manuseio e arrasto)', async () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);

    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} />);

    // Navega para a Página 2 pelo botão da barra flutuante
    const pag2Btn = screen.getByTitle(/Ir para a página 2/i);
    fireEvent.click(pag2Btn);

    // Página 2:
    expect(screen.getByText(/Mesa de Centro Ripada Nogal/i)).toBeDefined();
    expect(screen.getByText(/Objetivo deste Termo e Compromisso de Atendimento \(Arts\. 6º, III e 50 do CDC\)/i)).toBeDefined();
    expect(screen.getAllByText(/Prazo Legal de 90 Dias para Bens Duráveis/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/O Que a Garantia da Loja Cobre \(Arts\. 18, 20 e 24 do CDC\)/i)).toBeDefined();
    expect(screen.getByText(/Cuidados Essenciais e Situações Não Cobertas pela Garantia/i)).toBeDefined();

    // Citação explícita do CDC no alerta de manuseio e movimentação (culpa exclusiva do consumidor):
    expect(screen.getByText(/NUNCA o empurre ou arraste pelo chão/i)).toBeDefined();
    expect(screen.getByText(/ERGUENDO-O EM 2 OU MAIS PESSOAS/i)).toBeDefined();
    expect(screen.getAllByText(/Arts\. 12, § 3º, inciso III e 14, § 3º, inciso II do CDC/i).length).toBeGreaterThan(0);
  });

  it('navega para a Página 3 com tópicos 5 a 9 (incluindo SALVADOS) e bloco final "FALE COM A GENTE" com fundamentação no CDC', async () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);

    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} />);

    // Navega para a Página 3
    const nextBtn = screen.getByTitle(/Próxima página/i);
    fireEvent.click(nextBtn); // vai para pág 2
    fireEvent.click(nextBtn); // vai para pág 3

    expect(screen.getByTitle('Página atual: 3')).toBeDefined();

    // Tópico 5: Produtos de Salvados e Avarias Previamente Informadas
    expect(
      screen.getByText(/Produtos de Salvados e Avarias Previamente Informadas \(Arts\. 6º, III, 18, 26 e 31 do CDC\)/i)
    ).toBeDefined();
    expect(screen.getAllByText('SALVADOS').length).toBeGreaterThan(0);
    expect(screen.getByText(/A garantia não cobre a correção dessas avarias específicas previamente informadas/i)).toBeDefined();
    expect(screen.getByText(/defeitos não informados previamente, defeitos ocultos \(vícios ocultos\)/i)).toBeDefined();
    expect(screen.getByText(/A classificação do produto como Salvado e a concessão de desconto não eliminam/i)).toBeDefined();

    // Tópicos 6 a 9 com citações expressas ao CDC:
    expect(screen.getByText(/Cuidados Específicos com Móveis em MDF e MDP \(Arts\. 6º, III e 31 do CDC\)/i)).toBeDefined();
    expect(screen.getByText(/Como Solicitar Assistência Técnica e Suspensão de Prazos \(Art\. 26, § 2º, I do CDC\)/i)).toBeDefined();
    expect(screen.getByText(/Responsabilidade pelos Custos de Coleta, Transporte e Reparo \(Arts\. 18, 40 e 50 do CDC\)/i)).toBeDefined();
    expect(screen.getByText(/Direitos Assegurados pelo Código de Defesa do Consumidor \(Art\. 18, § 1º do CDC\)/i)).toBeDefined();

    // Bloco final: "Canais Oficiais de Atendimento" (exclusivo para contato, horário e endereço)
    expect(screen.getByText('Canais Oficiais de Atendimento')).toBeDefined();
    expect(screen.getAllByText('(41) 99749-3547').length).toBeGreaterThan(0); // WhatsApp
    expect(screen.getByText('(41) 99224-4631')).toBeDefined(); // Telefone ligação
    expect(screen.getByText(/Seg-Sex: 8h às 18h \| Sáb: 8h às 13h/i)).toBeDefined();
    expect(screen.getAllByText(/R. Cascavel, 306 - Guaraituba, Colombo - PR/i).length).toBeGreaterThan(0);

    // Identificação institucional redundante e campo de assinatura removidos do container final a pedido do usuário
    expect(screen.queryByText(/Documento oficial emitido em/i)).toBeNull();
    expect(screen.queryByText(/Garantia & Pós-Venda/i)).toBeNull();
  });

  it('permite alternar entre as 3 páginas com paginação mediana e controles de zoom', async () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);

    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} />);

    // Página 1 inicial
    expect(screen.getByTitle('Página atual: 1')).toBeDefined();
    expect(screen.getByTitle(/Ir para a página 2/i)).toBeDefined();
    expect(screen.getByTitle(/Ir para a página 3/i)).toBeDefined();

    // Teste de Zoom (apenas um campo de porcentagem)
    const zoomInBtn = screen.getByTitle(/Aumentar Zoom/i);
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('115%')).toBeDefined();

    const zoomResetBtn = screen.getByTitle(/Redefinir zoom para 100%/i);
    fireEvent.click(zoomResetBtn);
    expect(screen.getAllByText('100%').length).toBe(1); // Exatamente UM campo de porcentagem no controle

    // Navega para a página 2
    const pag2Btn = screen.getByTitle(/Ir para a página 2/i);
    fireEvent.click(pag2Btn);
    expect(screen.getByTitle('Página atual: 2')).toBeDefined();
    expect(screen.getByTitle(/Ir para a página 1/i)).toBeDefined();
    expect(screen.getByTitle(/Ir para a página 3/i)).toBeDefined();

    // Navega para a página 3
    const pag3Btn = screen.getByTitle(/Ir para a página 3/i);
    fireEvent.click(pag3Btn);
    expect(screen.getByTitle('Página atual: 3')).toBeDefined();
    expect(screen.getByTitle(/Ir para a página 2/i)).toBeDefined();
    expect(screen.getByTitle(/Ir para a página 1/i)).toBeDefined();
  });

  it('dispara o fluxo de impressão ao clicar no botão Imprimir', async () => {
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

    const printBtn = screen.getByText(/^Imprimir$/i);
    fireEvent.click(printBtn);

    await waitFor(() => {
      expect(mockPrint).toHaveBeenCalled();
    });
  });

  it('dispara o envio pelo WhatsApp com o telefone cadastrado ao clicar no botão', async () => {
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

    const whatsAppBtn = screen.getByText(/Enviar pelo WhatsApp/i);
    fireEvent.click(whatsAppBtn);

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientPhone: '(41) 99876-5432',
        })
      );
    });
  });

  it('permite navegar entre as 3 páginas com as teclas ArrowRight e ArrowLeft', () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);
    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={vi.fn()} />);

    expect(screen.getByTitle('Página atual: 1')).toBeDefined();

    // ArrowRight: 1 -> 2
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTitle('Página atual: 2')).toBeDefined();

    // ArrowRight: 2 -> 3
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTitle('Página atual: 3')).toBeDefined();

    // ArrowLeft: 3 -> 2
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTitle('Página atual: 2')).toBeDefined();

    // ArrowLeft: 2 -> 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTitle('Página atual: 1')).toBeDefined();
  });

  it('fecha o modal ao pressionar a tecla Escape', () => {
    vi.spyOn(warrantyService, 'fetchWarrantyTermsByOrderId').mockResolvedValue([]);
    const handleClose = vi.fn();
    render(<WarrantyTermModal order={sampleOrder} isOpen onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });
});
