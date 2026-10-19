export interface StockTabItem {
  key: string;
  title: string;
}

export const TABS: StockTabItem[] = [
  { key: 'summary', title: 'Resumo' },
  { key: 'moves', title: 'Movimentações' },
  { key: 'inventory', title: 'Inventário' },
  { key: 'purchases', title: 'Pedidos' },
  { key: 'invoices', title: 'NF Entrada' },
  { key: 'receipts', title: 'Recebimentos' },
  { key: 'suppliers', title: 'Fornecedores' },
  { key: 'unavailabilities', title: 'Indisponíveis' },
];
