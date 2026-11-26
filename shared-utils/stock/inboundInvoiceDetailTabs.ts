export const INBOUND_INVOICE_DETAIL_TABS = [
  { id: 'summary', label: 'Resumo' },
  { id: 'parties', label: 'Participantes' },
  { id: 'items', label: 'Itens' },
  { id: 'fiscal', label: 'Fiscal' },
] as const;

export type InboundInvoiceDetailTab = (typeof INBOUND_INVOICE_DETAIL_TABS)[number]['id'];
