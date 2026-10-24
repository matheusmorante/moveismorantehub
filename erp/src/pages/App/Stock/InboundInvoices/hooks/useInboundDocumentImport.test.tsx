// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInboundDocumentImport } from './useInboundDocumentImport';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

const mocks = vi.hoisted(() => ({ save: vi.fn(), exists: vi.fn(), parse: vi.fn(), persons: vi.fn(), mappings: vi.fn(), details: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/inboundNfe/inboundInvoicesService', () => ({ saveInboundInvoice: mocks.save, checkInboundInvoiceKeyExists: mocks.exists }));
vi.mock('@/pages/utils/inboundNfe/inboundXmlParser', () => ({ parseInboundNfeXml: mocks.parse }));
vi.mock('@/pages/utils/personService', () => ({ fetchPersons: mocks.persons }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({ findProductSupplierCodes: mocks.mappings }));
vi.mock('@/pages/utils/inboundNfe/inboundItemProductResolver', () => ({ resolveLinkedProductDetails: mocks.details }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn(), info: vi.fn() } }));

const key = '41261012ABC34501DE35550010000001061705367136';
const invoice = (): InboundInvoice => ({
  id: 'inbound', nfeKey: key.toLowerCase().replace(/(.{4})/g, '$1 '), nfeNumber: '106', series: '1',
  issuedAt: '2026-10-15T12:00:00Z', emitterCnpj: '12.abc.345/01de-35', emitterName: 'Fornecedor',
  recipientCnpj: '44.512.248/0001-07', recipientName: 'MOVEIS MORANTE LTDA', totalProducts: 20, totalFreight: 0,
  totalIpi: 0, totalInvoice: 20, model: '55', environment: 2, status: 'pending', itemsCount: 1,
  items: [{ itemNumber: 1, productCode: 'sku', productDescription: 'Mesa', ncm: '94036000', cfop: '5102', unit: 'UN', quantity: 1, unitCost: 20, totalCost: 20 }],
});
const file = (name = 'nota.xml', contents = '<nfe/>') => {
  const selected = new File([contents], name, { type: name.endsWith('.xml') ? 'text/xml' : 'text/plain' });
  Object.defineProperty(selected, 'text', { value: vi.fn().mockResolvedValue(contents) });
  return selected;
};
const mount = (initialFile?: File) => {
  const onClose = vi.fn(); const onImportSuccess = vi.fn();
  return { ...renderHook(() => useInboundDocumentImport({ isOpen: true, onClose, onImportSuccess, initialFile })), onClose, onImportSuccess };
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.parse.mockImplementation(() => invoice()); mocks.exists.mockResolvedValue(null);
  mocks.persons.mockResolvedValue([]); mocks.mappings.mockResolvedValue(new Map());
  mocks.save.mockImplementation(async (value) => value);
});

describe('proprietário da importação de notas de entrada', () => {
  it('recusa arquivo inválido antes de ler ou interpretar', async () => {
    const { result } = mount(); const selected = file('nota.txt');
    await act(async () => { await result.current.handleFile(selected); });
    expect(selected.text).not.toHaveBeenCalled(); expect(mocks.parse).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('XML oficial'));
    expect(result.current.isLoading).toBe(false);
  });
  it.each(['', '   '])('recusa texto vazio %j antes de interpretar', async (xml) => {
    const { result } = mount();
    await act(async () => { await result.current.handleXmlString(xml); });
    expect(mocks.parse).not.toHaveBeenCalled(); expect(mocks.exists).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
  });
  it.each([
    { model: '65' }, { itemsCount: 2 }, { totalInvoice: -1 }, { nfeKey: 'inválida' },
  ])('bloqueia nota inválida antes dos serviços %j', async (invalid) => {
    mocks.parse.mockReturnValue({ ...invoice(), ...invalid });
    const { result, onClose } = mount();
    await act(async () => { await result.current.handleXmlString('<nfe/>'); });
    expect(mocks.exists).not.toHaveBeenCalled(); expect(mocks.persons).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled(); expect(mocks.error).toHaveBeenCalled();
  });
  it('normaliza a chave e preserva os itens fiscais ao vincular fornecedor/produto', async () => {
    mocks.persons.mockResolvedValue([{ id: 'supplier', fullName: 'Fornecedor', cpfCnpj: '12ABC34501DE35' }]);
    mocks.mappings.mockResolvedValue(new Map([['SKU', { productId: 'product', productVariationId: 'variation' }]]));
    mocks.details.mockResolvedValue({ linkedProductCode: 'ERP-1', productErpName: 'Mesa vinculada' });
    const { result, onImportSuccess, onClose } = mount(); const selected = file();
    await act(async () => { await result.current.handleFile(selected); });
    expect(mocks.parse).toHaveBeenCalledWith('<nfe/>'); expect(mocks.exists).toHaveBeenCalledWith(key);
    expect(mocks.mappings).toHaveBeenCalledWith('supplier', ['sku']);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ nfeKey: key, environment: 2, supplierId: 'supplier', items: [expect.objectContaining({ productCode: 'sku', quantity: 1, unitCost: 20, matchedProductId: 'product', matchedVariationId: 'variation' })] }));
    expect(onImportSuccess).toHaveBeenCalledTimes(1); expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('protege arquivo e texto durante a leitura e a gravação pendentes', async () => {
    let finishRead!: (value: string) => void; let finishSave!: (value: InboundInvoice) => void;
    const selected = file(); vi.mocked(selected.text).mockImplementation(() => new Promise((resolve) => { finishRead = resolve; }));
    mocks.save.mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));
    const { result, onImportSuccess } = mount(); let first!: Promise<void>;
    await act(async () => { first = result.current.handleFile(selected); await result.current.handleXmlString('<other/>'); });
    expect(mocks.parse).not.toHaveBeenCalled();
    await act(async () => { finishRead('<nfe/>'); });
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.handleFile(file()); await result.current.handleXmlString('<other/>'); });
    expect(mocks.parse).toHaveBeenCalledTimes(1); expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { finishSave(invoice()); await first; });
    expect(onImportSuccess).toHaveBeenCalledTimes(1); expect(result.current.isLoading).toBe(false);
  });
  it('informa que a nota já está cadastrada sem alterações e libera nova tentativa', async () => {
    mocks.exists.mockResolvedValueOnce(invoice());
    const { result, onImportSuccess, onClose } = mount();
    await act(async () => { await result.current.handleXmlString('<nfe/>'); });
    expect(result.current.duplicateAlertOpen).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(onImportSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.handleXmlString('<next/>'); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it('libera o formulário após falha na gravação', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.save.mockRejectedValueOnce(new Error('Falha simulada'));
    const { result, onClose } = mount();
    await act(async () => { await result.current.handleXmlString('<nfe/>'); });
    expect(result.current.isLoading).toBe(false); expect(onClose).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('Falha simulada');
    await act(async () => { await result.current.handleXmlString('<retry/>'); });
    expect(mocks.save).toHaveBeenCalledTimes(2); expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('o arquivo inicial também passa pelo resolver antes da leitura', async () => {
    const selected = file('nota.txt'); mount(selected);
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(selected.text).not.toHaveBeenCalled(); expect(mocks.parse).not.toHaveBeenCalled();
  });
});
