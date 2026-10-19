export interface FormattedFiscalField {
  label: string;
  group: string;
}

export function formatFieldName(field: string): FormattedFiscalField {
  if (field.startsWith('dest.CNPJ/CPF')) return { label: 'CPF / CNPJ', group: 'Destinatário' };
  if (field.startsWith('dest.xNome')) return { label: 'Razão Social / Nome', group: 'Destinatário' };
  if (field.startsWith('dest.IE')) return { label: 'Inscrição Estadual (IE)', group: 'Destinatário' };
  if (field.startsWith('dest.indIEDest')) return { label: 'Indicador de IE', group: 'Destinatário' };
  if (field.startsWith('dest.enderDest.logradouro')) return { label: 'Endereço · Logradouro', group: 'Destinatário' };
  if (field.startsWith('dest.enderDest.numero')) return { label: 'Endereço · Número', group: 'Destinatário' };
  if (field.startsWith('dest.enderDest.bairro')) return { label: 'Endereço · Bairro', group: 'Destinatário' };
  if (field.startsWith('dest.enderDest.municipio')) return { label: 'Endereço · Município', group: 'Destinatário' };
  if (field.startsWith('dest.enderDest.UF')) return { label: 'Endereço · UF', group: 'Destinatário' };
  if (field.startsWith('dest.enderDest.CEP')) return { label: 'Endereço · CEP', group: 'Destinatário' };

  const itemMatch = field.match(/^(?:itens|det)\[(\d+)\]/);
  const itemNum = itemMatch ? itemMatch[1] : '';
  const itemPrefix = itemNum ? `Item ${itemNum}` : 'Item';

  if (field.includes('quantidade')) return { label: `${itemPrefix} · Quantidade`, group: 'Itens do Pedido' };
  if (field.includes('unitPrice') || field.includes('valorUnitario')) return { label: `${itemPrefix} · Valor Unitário`, group: 'Itens do Pedido' };
  if (field.includes('prod.NCM')) return { label: `${itemPrefix} · NCM`, group: 'Tributação dos Itens' };
  if (field.includes('prod.CFOP')) return { label: `${itemPrefix} · CFOP`, group: 'Tributação dos Itens' };
  if (field.includes('prod.orig')) return { label: `${itemPrefix} · Origem da Mercadoria`, group: 'Tributação dos Itens' };
  if (field.includes('prod.CEST')) return { label: `${itemPrefix} · CEST`, group: 'Tributação dos Itens' };
  if (field.includes('imposto.ICMS.CST_CSOSN') || field.includes('fiscal.cst')) return { label: `${itemPrefix} · CST / CSOSN (ICMS)`, group: 'Tributação dos Itens' };
  if (field.includes('imposto.PIS.CST')) return { label: `${itemPrefix} · CST (PIS)`, group: 'Tributação dos Itens' };
  if (field.includes('imposto.COFINS.CST')) return { label: `${itemPrefix} · CST (COFINS)`, group: 'Tributação dos Itens' };
  if (field.includes('imposto.ICMS.pICMS')) return { label: `${itemPrefix} · Alíquota ICMS (%)`, group: 'Tributação dos Itens' };
  if (field.includes('total') || field.includes('valorPedidoCalculado')) return { label: 'Total do Pedido', group: 'Totais' };
  if (field.includes('pag') || field.includes('payments')) return { label: 'Forma / Condição de Pagamento', group: 'Pagamento' };
  if (field.includes('shipping') || field.includes('frete')) return { label: 'Frete e Transporte', group: 'Transporte' };
  if (field.includes('fiscalContext')) return { label: `Contexto Fiscal (${field.split('.').pop()})`, group: 'Configurações Fiscais' };

  return { label: field, group: 'Dados Fiscais' };
}
