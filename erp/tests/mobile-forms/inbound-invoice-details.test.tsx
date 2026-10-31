import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => {
  const Container = ({ children, accessibilityRole, accessibilityLabel }: any) => (
    <div role={accessibilityRole} aria-label={accessibilityLabel}>{children}</div>
  );
  return {
    Modal: ({ visible, children }: any) => visible ? <div role="dialog">{children}</div> : null,
    View: Container,
    ScrollView: Container,
    Text: ({ children }: any) => <span>{children}</span>,
    TouchableWithoutFeedback: ({ children }: any) => <>{children}</>,
    TouchableOpacity: ({ children, onPress, accessibilityRole, accessibilityLabel, accessibilityState }: any) => (
      <button role={accessibilityRole} aria-label={accessibilityLabel} aria-selected={accessibilityState?.selected} onClick={onPress}>
        {children}
      </button>
    ),
    StyleSheet: { create: (value: unknown) => value },
    Platform: { OS: 'ios' },
    useWindowDimensions: () => ({ width: 320, height: 700 }),
  };
});
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 16, left: 0, right: 0 }),
}));
vi.mock('lucide-react-native', () => ({
  ClipboardList: () => null,
  FileText: () => null,
  Package: () => null,
  Users: () => null,
  X: () => null,
}));

import type { InvoiceDetail } from '../../../mobile/src/features/stock/types/stock.types';
import { InvoiceDetailsModal } from '../../../mobile/src/features/stock/invoices/modals/invoice-details/InvoiceDetailsModal';

const invoice: InvoiceDetail = {
  id: 'nota-exemplo',
  number: '123',
  series: '1',
  accessKey: '12345678901234567890123456789012345678901234',
  supplierName: 'Fornecedor exemplo',
  supplierCnpj: '00000000000100',
  recipientName: 'Destinatário exemplo',
  recipientCnpj: '00000000000200',
  issueDate: '2026-10-30',
  totalValue: 115,
  totalProducts: 100,
  totalFreight: 10,
  totalIpi: 5,
  totalDiscount: 0,
  totalInsurance: 0,
  totalOtherExpenses: 0,
  totalIcms: 0,
  totalIcmsSt: 0,
  freightPercent: 10,
  ipiPercent: 5,
  protocol: 'PROTOCOLO-EXEMPLO',
  operationNature: 'Compra para revenda',
  additionalInfo: 'Observação de exemplo',
  itemsCount: 1,
  status: 'pending',
  sefazStatus: 'authorized',
  hasPendingBindings: false,
  items: [{
    description: 'Produto de exemplo',
    productCode: 'PROD-1',
    ean: '',
    ncm: '94036000',
    cest: '',
    cfop: '5102',
    unit: 'UN',
    quantity: 2,
    unitCost: 50,
    totalCost: 100,
    freightValue: 0,
    ipiValue: 0,
    ipiPercent: 0,
    icmsValue: 0,
    icmsPercent: 0,
    icmsStValue: 0,
  }],
};

afterEach(cleanup);

describe('InvoiceDetailsModal no app', () => {
  it('organiza os dados em abas e volta ao resumo para outra nota', () => {
    const { rerender } = render(<InvoiceDetailsModal visible isDarkMode={false} invoice={invoice} loading={false} onClose={vi.fn()} />);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Resumo', 'Participantes', 'Itens', 'Fiscal']);
    expect(screen.getByText(invoice.accessKey)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Participantes' }));
    expect(screen.getByText('Fornecedor exemplo')).toBeTruthy();
    expect(screen.getByText('Destinatário exemplo')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    expect(screen.getByText('Produto de exemplo')).toBeTruthy();
    expect(screen.getByText(/NCM: 94036000/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Fiscal' }));
    expect(screen.getByText(/Protocolo: PROTOCOLO-EXEMPLO/)).toBeTruthy();
    expect(screen.getByText(/Observações: Observação de exemplo/)).toBeTruthy();

    rerender(<InvoiceDetailsModal visible isDarkMode={false} invoice={{ ...invoice, id: 'outra-nota' }} loading={false} onClose={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Resumo' }).getAttribute('aria-selected')).toBe('true');
  });

  it('mantém o aviso de itens incompletos e a ação de fechar', () => {
    const onClose = vi.fn();
    const incomplete = { ...invoice, items: [{ ...invoice.items[0], quantity: 0, unitCost: 0, totalCost: 0 }] };
    render(<InvoiceDetailsModal visible isDarkMode={false} invoice={incomplete} loading={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    expect(screen.getByText(/sincronização automática não carrega itens/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar detalhes' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
