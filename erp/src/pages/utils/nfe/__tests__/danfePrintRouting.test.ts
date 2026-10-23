// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  printDanfe: vi.fn(),
}));

vi.mock('../../printing/printService', () => ({
  printDanfe: mocks.printDanfe,
}));

import { openDanfePrintWindow } from '../danfeGenerator';
import type { DanfeData } from '../danfe.types';
import { generateNfeAccessKey } from '../nfeAccessKey';

const baseData = (model: '55' | '65'): DanfeData => {
  const accessKey = generateNfeAccessKey({
    ufCode: '41',
    yearMonth: '2610',
    cnpj: '44512248000107',
    model,
    series: '1',
    number: '1',
    emissionType: '1',
    randomCode: '12345678',
  }).accessKey;

  return {
    order: {} as DanfeData['order'],
    settings: { companyName: 'Emitente de teste' } as DanfeData['settings'],
    accessKey,
    nfeNumber: 1,
    series: '1',
    protocolNumber: '141260000123456',
    protocolDate: '22/10/2026 10:00:00',
    model,
    environment: 1,
    status: 'autorizada',
    fiscalDetails: {
      issuer: {
        name: 'Emitente de teste',
        taxId: '44512248000107',
        stateRegistration: '1234567890',
        street: 'Rua Teste',
        number: '10',
        district: 'Centro',
        municipality: 'Curitiba',
        state: 'PR',
        postalCode: '80000000',
      },
      general: {
        accessKey,
        stateCode: '41',
        emissionType: '1',
        model,
        environment: '1',
        number: '1',
        series: '1',
        issueDate: '2026-10-22T10:00:00-03:00',
        total: '10.00',
        consultationUrl: 'https://www.fazenda.pr.gov.br/nfce/consulta',
        additionalInfo: '',
        qrCode: `https://www.fazenda.pr.gov.br/nfce/qrcode?p=${accessKey}|2|1|1|${'A'.repeat(40)}`,
      },
      recipient: { name: 'Consumidor final', taxId: '' },
      items: [{ code: 'SKU-1', description: 'Produto de teste', quantity: '1', unit: 'UN', unitValue: '10.00', total: '10.00' }],
      summary: { products: '10.00', invoiceTotal: '10.00' },
      totals: [],
      payments: [{ method: 'Dinheiro', value: '10.00' }],
    } as unknown as NonNullable<DanfeData['fiscalDetails']>,
  };
};

const createPrintWindow = (): Window => ({
  document: { open: vi.fn(), write: vi.fn(), close: vi.fn() } as unknown as Document,
  focus: vi.fn(),
  close: vi.fn(),
  closed: false,
}) as unknown as Window;

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('roteamento de impressão do DANFE', () => {
  it('imprime NF-e modelo 55 pela janela preparada no clique', async () => {
    const printWindow = createPrintWindow();
    vi.spyOn(window, 'open').mockReturnValue(printWindow);
    mocks.printDanfe.mockResolvedValue({ success: true });
    await openDanfePrintWindow(baseData('55'));

    expect(window.open).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(mocks.printDanfe).toHaveBeenCalledOnce());
    expect(mocks.printDanfe).toHaveBeenCalledWith(expect.objectContaining({ model: '55' }), printWindow);
  });

  it('imprime NFC-e modelo 65 em A4 por padrão, sem abrir o seletor', async () => {
    const printWindow = createPrintWindow();
    vi.spyOn(window, 'open').mockReturnValue(printWindow);
    mocks.printDanfe.mockResolvedValueOnce({ success: true });

    await openDanfePrintWindow(baseData('65'));

    expect(mocks.printDanfe).toHaveBeenCalledWith(
      expect.objectContaining({ model: '65', printFormat: 'a4' }),
      printWindow
    );
  });

  it('encaminha cupom térmico quando 80 mm é informado explicitamente', async () => {
    const printWindow = createPrintWindow();
    vi.spyOn(window, 'open').mockReturnValue(printWindow);
    mocks.printDanfe.mockResolvedValueOnce({ success: true });

    await openDanfePrintWindow(baseData('65'), 'thermal_80mm');

    expect(mocks.printDanfe).toHaveBeenCalledWith(
      expect.objectContaining({ model: '65', printFormat: 'thermal_80mm' }),
      printWindow
    );
  });
});
