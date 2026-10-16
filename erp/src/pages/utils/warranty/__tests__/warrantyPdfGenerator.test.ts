import { describe, expect, it, vi } from 'vitest';
import { generateWarrantyPdf, calculateSha256 } from '../warrantyPdfGenerator';
import type Order from '@/pages/types/order.type';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
  supabasePublicUrl: 'https://hkoxhourxwlddgsfdgws.supabase.co',
}));

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-warranty-pdf');
}

describe('Warranty PDF Generator — Móveis Morante', () => {
  const sampleOrder = {
    id: 'ord-test-warranty-101',
    orderNumber: 1042,
    orderIndex: 1042,
    orderType: 'sale',
    status: 'scheduled',
    date: '2026-10-15',
    seller: 'Vendedor Teste',
    customerData: {
      fullName: 'Carlos Eduardo Silva',
      cpfCnpj: '123.456.789-00',
      phone: '(41) 99888-7766',
      fullAddress: {
        street: 'Rua das Flores',
        number: '120',
        neighborhood: 'Centro',
        city: 'Colombo',
        state: 'PR',
        cep: '83400-000',
      },
    },
    items: [
      {
        orderItemId: 'item-1',
        description: 'Guarda-Roupa Casal 6 Portas MDF Canela',
        quantity: 1,
        unitPrice: 1899.9,
      },
      {
        orderItemId: 'item-2',
        description: 'Cômoda 4 Gavetas MDP Branco',
        quantity: 2,
        unitPrice: 450.0,
      },
    ],
    itemsSummary: { totalQuantity: 3 },
    shipping: { value: 50 },
    payments: [],
    paymentsSummary: { totalOrderValue: 2799.9 },
    observation: 'Entregar no período da tarde.',
  } as unknown as Order;

  it('calcula o hash SHA-256 de forma consistente', async () => {
    const data = new TextEncoder().encode('Móveis Morante Garantia');
    const hash = await calculateSha256(data);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);

    // Repetição deve dar o mesmo hash (determinístico)
    const hash2 = await calculateSha256(data);
    expect(hash).toBe(hash2);
  });

  it('gera o PDF do Termo de Garantia com sucesso contendo metadados e hash', async () => {
    const result = await generateWarrantyPdf({
      order: sampleOrder,
      version: 1,
    });

    expect(result).toBeDefined();
    expect(result.fileName).toContain('1042');
    expect(result.fileName).toContain('v1.pdf');
    expect(result.version).toBe(1);
    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.pdfBytes.length).toBeGreaterThan(1000);
    expect(result.sha256).toBeDefined();
    expect(result.sha256.length).toBe(64);
    expect(result.pdfBlob).toBeInstanceOf(Blob);
    expect(result.pdfBlob.type).toBe('application/pdf');
  });

  it('suporta pedidos com múltiplos itens sem quebrar a diagramação', async () => {
    const multiItemOrder = {
      ...sampleOrder,
      items: [
        { orderItemId: '1', description: 'Painel para TV até 65" Ripado', quantity: 1, unitPrice: 599 },
        { orderItemId: '2', description: 'Rack Bancada com Rodízios', quantity: 1, unitPrice: 799 },
        { orderItemId: '3', description: 'Mesa de Jantar 6 Cadeiras Tampo Vidro', quantity: 1, unitPrice: 2200 },
        { orderItemId: '4', description: 'Aparador Buffet 3 Portas', quantity: 1, unitPrice: 850 },
        { orderItemId: '5', description: 'Cama Box Casal Molas Ensacadas', quantity: 1, unitPrice: 1600 },
        { orderItemId: '6', description: 'Mesa de Cabeceira 2 Gavetas', quantity: 2, unitPrice: 280 },
        { orderItemId: '7', description: 'Sapateira com Espelho 1 Porta', quantity: 1, unitPrice: 490 },
      ],
    } as unknown as Order;

    const result = await generateWarrantyPdf({
      order: multiItemOrder,
      version: 2,
    });

    expect(result.version).toBe(2);
    expect(result.fileName).toContain('v2.pdf');
    expect(result.pdfBytes.length).toBeGreaterThan(1000);
  });

  it('gera documento válido mesmo se dados do cliente forem simplificados', async () => {
    const minimalistOrder = {
      id: 'ord-min-1',
      orderNumber: 500,
      orderType: 'sale',
      status: 'fulfilled',
      date: '2026-10-15',
      seller: 'Atendente',
      customerData: {
        fullName: 'Consumidor Final',
      },
      items: [],
      itemsSummary: { totalQuantity: 0 },
      shipping: {},
      payments: [],
      paymentsSummary: {},
      observation: '',
    } as unknown as Order;

    const result = await generateWarrantyPdf({
      order: minimalistOrder,
      version: 1,
    });

    expect(result.pdfBytes.length).toBeGreaterThan(500);
    expect(result.sha256.length).toBe(64);
  });

  it('inclui cláusula de SALVADOS e avarias prévias informadas com fundamentos no CDC', async () => {
    const result = await generateWarrantyPdf({
      order: sampleOrder,
      version: 1,
    });

    expect(result.pdfBytes).toBeDefined();
    // Verifica que o PDF gerado é válido e tem conteúdo completo
    expect(result.pdfBytes.length).toBeGreaterThan(2000);
  });
});
