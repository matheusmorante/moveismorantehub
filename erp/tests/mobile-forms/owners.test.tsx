import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ alert: vi.fn(), consult: vi.fn(), saveDraft: vi.fn(), fetchInvoices: vi.fn(), confirmFinancial: vi.fn(), fetchProducts: vi.fn(), saveComposition: vi.fn() }));
vi.mock('react-native', () => ({
  Modal: ({ children }: any) => <div>{children}</div>, View: 'div', Text: 'span', ActivityIndicator: 'span', KeyboardAvoidingView: 'div', ScrollView: 'div',
  TouchableOpacity: ({ onPress, children, disabled }: any) => <button onClick={onPress} disabled={disabled}>{children}</button>,
  TextInput: ({ value, onChangeText, placeholder }: any) => <input value={value ?? ''} onChange={(e) => onChangeText(e.target.value)} placeholder={placeholder} />,
  StyleSheet: { create: (value: unknown) => value }, Platform: { OS: 'web' }, Alert: { alert: mocks.alert },
}));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('lucide-react-native', () => Object.fromEntries(['X', 'Calendar', 'DollarSign', 'Tag', 'User', 'CreditCard', 'Layers', 'UploadCloud', 'Search', 'ScanBarcode', 'CloudDownload', 'ExternalLink', 'FileText', 'Package', 'Grid2X2', 'Images', 'Minus', 'Plus', 'Trash2', 'Hammer', 'Check'].map((name) => [name, () => null])));
vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }));
vi.mock('../../../mobile/src/features/stock/inventory/screens/InventoryScannerScreen', () => ({ InventoryScannerScreen: () => null }));
vi.mock('../../../mobile/src/services/stockService', () => ({ consultSefazByAccessKey: mocks.consult, fetchInboundInvoicesPage: mocks.fetchInvoices }));
vi.mock('../../../mobile/src/services/sqlite/inventoryDrafts', () => ({ saveLocalInventoryDraft: mocks.saveDraft }));
vi.mock('../../../mobile/src/services/mobileFinanceService', () => ({ confirmFinancialDraft: mocks.confirmFinancial, createFinancialTransaction: vi.fn() }));
vi.mock('../../../mobile/src/services/financialAiAssistantService', () => ({ extractLocalSemanticDelta: vi.fn(), PRE_ANALYSIS_DEBOUNCE_MS: 100, MAX_VOICE_INACTIVITY_MS: 1000 }));
vi.mock('../../../mobile/src/services/aiAgent/mobileAgentService', () => ({ MobileAgentService: {} }));
vi.mock('../../../mobile/src/services/geminiLiveService', () => ({ GeminiLiveSession: class {} }));
vi.mock('../../../mobile/src/services/voiceRecorderService', () => ({ startVoiceRecording: vi.fn(), stopVoiceRecording: vi.fn() }));
vi.mock('../../../mobile/src/features/products/services/mobileProductFetchService', () => ({ fetchMobileProductsPage: mocks.fetchProducts }));
vi.mock('../../../mobile/src/features/compositions/services/mobileCompositionService', () => ({ saveComposition: mocks.saveComposition }));
import { InvoiceImportModal } from '../../../mobile/src/features/stock/invoices/modals/InvoiceImportModal';
import { TransactionEditModal } from '../../../mobile/src/features/finance/components/TransactionEditModal';
import { useInventoryPersistenceQueue } from '../../../mobile/src/features/stock/inventory/hooks/useInventoryPersistenceQueue';
import { useInvoices } from '../../../mobile/src/features/stock/invoices/hooks/useInvoices';
import { useFinancialAiChat } from '../../../mobile/src/features/finance/hooks/useFinancialAiChat';
import { MobileCompositionFormModal } from '../../../mobile/src/features/compositions/modals/MobileCompositionFormModal';
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });
describe('continued mobile form owners', () => {
  it('opens composition, searches selectable variations and validates the price before saving their identity', async () => {
    vi.useFakeTimers();
    mocks.fetchProducts.mockResolvedValue({ data: [{ id: 'product', name: 'Mesa', unitPrice: 100, stock: 7, allVariations: [{ id: 'variation', name: 'Azul', sku: 'MS-AZ', unitPrice: 125, stock: 3, active: true }] }], total: 1 });
    mocks.saveComposition.mockResolvedValue(undefined);
    render(<MobileCompositionFormModal visible onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Ex: Cozinha Compacta Paris'), { target: { value: ' Conjunto ' } });
    fireEvent.click(screen.getByText('Produtos'));
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome/), { target: { value: 'mesa' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(mocks.fetchProducts).toHaveBeenCalledWith(1, 5, expect.objectContaining({ search: 'mesa', itemType: 'standard' }));
    fireEvent.click(screen.getByText('Mesa - Azul'));
    fireEvent.click(screen.getByText('Cadastro Geral'));
    fireEvent.click(screen.getByText(/Fixo/));
    const price = screen.getByPlaceholderText('R$ 0,00');
    fireEvent.change(price, { target: { value: 'abc' } });
    await act(async () => fireEvent.click(screen.getByText('Salvar')));
    expect(mocks.saveComposition).not.toHaveBeenCalled();
    fireEvent.change(price, { target: { value: '150,50' } });
    await act(async () => fireEvent.click(screen.getByText('Salvar')));
    expect(mocks.saveComposition).toHaveBeenCalledWith(expect.objectContaining({ name: 'Conjunto', manual_price: 150.5 }), [expect.objectContaining({ items: [expect.objectContaining({ product_id: 'product', variation_id: 'variation', quantity: 1, unitPrice: 125 })] })]);
  });
  it('releases financial submission after a rejected request and keeps the intent available for retry', async () => {
    const registered = vi.fn();
    mocks.confirmFinancial.mockRejectedValueOnce(new Error('Falha de conexão')).mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered }));
    act(() => result.current.setPendingIntent({ description: 'Compra', totalAmount: 100, type: 'expense' }));
    await act(async () => { await result.current.handleConfirmRegister(); });
    expect(result.current.registering).toBe(false);
    expect(result.current.pendingIntent).toEqual(expect.objectContaining({ totalAmount: 100 }));
    expect(registered).not.toHaveBeenCalled();
    expect(mocks.alert).toHaveBeenCalledWith('Erro ao Salvar', 'Falha de conexão');
    await act(async () => { await result.current.handleConfirmRegister(); });
    expect(registered).toHaveBeenCalledOnce();
    expect(result.current.pendingIntent).toBeNull();
  });
  it('queries a new invoice filter while a request is pending, ignores the old result and blocks invalid periods', async () => {
    vi.useFakeTimers();
    let finishOld!: (value: any) => void;
    mocks.fetchInvoices.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce({ invoices: [{ id: 'new' }], totalCount: 1, totalPages: 1 });
    const { result } = renderHook(() => useInvoices());
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(mocks.fetchInvoices).toHaveBeenCalledTimes(1);
    act(() => result.current.setSearchTerm('nova'));
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(mocks.fetchInvoices).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, searchTerm: 'nova' }));
    expect(result.current.invoices).toEqual([{ id: 'new' }]);
    await act(async () => { finishOld({ invoices: [{ id: 'old' }], totalCount: 99, totalPages: 7 }); });
    expect(result.current.invoices).toEqual([{ id: 'new' }]);
    act(() => result.current.setDateFilter({ mode: 'custom_range', customMonth: '', startMonth: '2026-10', endMonth: '2026-09' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(mocks.fetchInvoices).toHaveBeenCalledTimes(2);
    expect(result.current.error).toMatch(/intervalo/);
    expect(result.current.loading).toBe(false);
  });
  it('passes an alphanumeric NF-e key through the actual resolver and service', async () => {
    const key = '41260802216300000138550010000040201276092641';
    const alpha = key.slice(0, 10) + 'A' + key.slice(11);
    mocks.consult.mockResolvedValue({ data: { success: true } });
    render(<InvoiceImportModal visible isDarkMode={false} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Digite os 44 caracteres...'), { target: { value: alpha.toLowerCase() } });
    await act(async () => fireEvent.click(screen.getByText('Buscar SEFAZ Direto')));
    expect(mocks.consult).toHaveBeenCalledWith(alpha);
  });
  it('keeps invalid NF-e keys from calling the service', async () => {
    render(<InvoiceImportModal visible isDarkMode={false} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Digite os 44 caracteres...'), { target: { value: '1'.repeat(44) } });
    await act(async () => fireEvent.click(screen.getByText('Buscar SEFAZ Direto')));
    expect(mocks.consult).not.toHaveBeenCalled();
  });
  it('can open financial editing after a null intent and blocks an invalid amount', async () => {
    const save = vi.fn();
    const { rerender } = render(<TransactionEditModal visible intent={null} onClose={vi.fn()} onSave={save} />);
    rerender(<TransactionEditModal visible intent={{ description: 'Compra', totalAmount: 100, dueDate: '2026-10-14' }} onClose={vi.fn()} onSave={save} />);
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: 'abc' } });
    await act(async () => fireEvent.click(screen.getByText('Salvar Alterações')));
    expect(save).not.toHaveBeenCalled(); expect(mocks.alert).toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '125,50' } });
    await act(async () => fireEvent.click(screen.getByText('Salvar Alterações')));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ totalAmount: 125.5, description: 'Compra' }));
  });
  it('serializes valid incomplete inventory drafts and rejects invalid counts before SQLite', async () => {
    const item = { id: 'item', key: 'product-main', productId: 'product', name: 'Mesa', supplierNames: '', assignedSupplier: '', systemStock: 1, physicalCount: null, unit: 'UN' };
    mocks.saveDraft.mockResolvedValue(undefined);
    const { result } = renderHook(() => useInventoryPersistenceQueue({ current: { id: 'audit', code: '001' } }, { name: 'Contagem', hasStages: false, responsibleId: 'operator' }, 'operator'));
    await act(async () => { await result.current.persistToSQLite([item]); });
    expect(mocks.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ items: [item] }));
    await act(async () => { await expect(result.current.persistToSQLite([{ ...item, physicalCount: -1 }])).rejects.toThrow(); });
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1);
  });
});
