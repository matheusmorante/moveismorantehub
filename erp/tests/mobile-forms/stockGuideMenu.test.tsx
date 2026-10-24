import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import stockGuide from '../../../shared-utils/stockGuide.json';

const mocks = vi.hoisted(() => ({ open: vi.fn(), alert: vi.fn() }));
vi.mock('react-native', () => ({
  View: ({ children }: any) => <div>{children}</div>,
  ScrollView: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  TouchableOpacity: ({ children, onPress, testID, accessibilityLabel }: any) => <button data-testid={testID} aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  StyleSheet: { create: (styles: unknown) => styles },
  Alert: { alert: mocks.alert }, Linking: { openURL: mocks.open },
}));
vi.mock('lucide-react-native', () => ({
  ArrowLeft: () => null, ChevronRight: () => null, ArrowLeftRight: () => null,
  BarChart3: () => null, BookOpen: () => null, ClipboardList: () => null,
  FileText: () => null, PackageCheck: () => null, PackageX: () => null,
  ShoppingBag: () => null, Users: () => null,
}));
vi.mock('../../../mobile/src/services/supabaseClient', () => ({ WEB_URL: 'https://erp.example.test/' }));
vi.mock('../../../mobile/src/features/stock/overview/StockSummaryScreen', () => ({ StockSummaryScreen: () => null }));
vi.mock('../../../mobile/src/features/stock/moves', () => ({ StockMovesScreen: () => null }));
vi.mock('../../../mobile/src/features/stock/inventory', () => ({ InventoryScreen: () => <div>Inventário do app</div> }));
vi.mock('../../../mobile/src/features/stock/purchases/PurchasesScreen', () => ({ PurchasesScreen: () => null }));
vi.mock('../../../mobile/src/features/stock/invoices', () => ({ InvoicesScreen: () => null }));
vi.mock('../../../mobile/src/features/stock/receipts', () => ({ ReceiptsScreen: () => null }));
vi.mock('../../../mobile/src/features/stock/suppliers/SuppliersScreen', () => ({ SuppliersScreen: () => null }));
vi.mock('../../../mobile/src/features/stock/unavailabilities', () => ({ UnavailabilitiesScreen: () => null }));

import { NativeStockScreen } from '../../../mobile/src/features/stock/overview/native-stock-screen/NativeStockScreen';
beforeEach(() => { vi.clearAllMocks(); mocks.open.mockReset().mockResolvedValue(undefined); });
afterEach(cleanup);

describe('guia na lista do menu Estoque do aplicativo', () => {
  it.each([false, true])('abre o PDF com o nome configurado e mantém o menu, tema escuro %s', async (isDarkMode) => {
    render(<NativeStockScreen isDarkMode={isDarkMode} />);
    const guide = screen.getByTestId('stock-module-guide');
    expect(guide.textContent).toContain(stockGuide.title);
    fireEvent.click(guide);
    await waitFor(() => expect(mocks.open).toHaveBeenCalledWith(`https://erp.example.test${stockGuide.path}`));
    expect(screen.getByTestId('stock-module-inventory')).toBeTruthy();
  });
  it('mostra uma mensagem se o aparelho não conseguir abrir o documento', async () => {
    mocks.open.mockRejectedValueOnce(new Error('Leitor indisponível'));
    render(<NativeStockScreen isDarkMode={false} />);
    fireEvent.click(screen.getByTestId('stock-module-guide'));
    await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith('Guia do estoque', expect.stringContaining('Não foi possível abrir')));
  });
  it('preserva a navegação dos módulos que já existiam', () => {
    render(<NativeStockScreen isDarkMode={false} />);
    fireEvent.click(screen.getByTestId('stock-module-inventory'));
    expect(screen.getByText('Inventário do app')).toBeTruthy();
    expect(mocks.open).not.toHaveBeenCalled();
  });
});
