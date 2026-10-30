import { supabase } from '../../supabaseClient';
import type { InvoiceDateFilter } from '../../../features/stock/types/stock.types';
import {
  buildInboundInvoiceSearchFilter,
  getInvoiceDateBounds,
} from '../../../features/stock/invoices/utils/invoiceList';
import { ITEMS_PER_PAGE } from '../stockMovesService';
import {
  mapInboundInvoiceDetailRow,
  mapInboundInvoiceListRow,
} from './inboundInvoiceMappers';

export const fetchInboundInvoices = async (page: number) => {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const { data, error } = await supabase
    .from('inbound_invoices')
    .select('*, inbound_invoice_items(*), supplier:people(stock_origins)')
    .order('data_emissao', { ascending: false })
    .range(from, to);

  if (error) {
    console.warn('Erro ao buscar NFs:', error);
    return [];
  }
  return data;
};

export const fetchInboundInvoicesPage = async ({
  page,
  searchTerm,
  dateFilter,
}: {
  page: number;
  searchTerm: string;
  dateFilter: InvoiceDateFilter;
}) => {
  const trimmedSearch = searchTerm.trim();
  const cleanNumber = trimmedSearch.replace(/\D/g, '');
  const isAccessKey = cleanNumber.length === 44;
  const dateBounds = getInvoiceDateBounds(dateFilter);
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  let query = supabase
    .from('inbound_invoices')
    .select(
      'id,numero_nfe,serie,chave_acesso,emitente_nome,emitente_cnpj,data_emissao,valor_total,status_recebimento,itens,xml_conteudo,supplier:people(stock_origins),inbound_invoice_items(*)',
      { count: 'exact' }
    );

  if (!isAccessKey && dateBounds) {
    query = query.gte('data_emissao', dateBounds.start).lte('data_emissao', dateBounds.end);
  }

  if (trimmedSearch) {
    if (isAccessKey) {
      query = query.eq('chave_acesso', cleanNumber);
    } else {
      const searchFilter = buildInboundInvoiceSearchFilter(trimmedSearch);
      if (searchFilter) query = query.or(searchFilter);
    }
  }

  const { data, error, count } = await query
    .order('data_emissao', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const invoices = (data || []).map(mapInboundInvoiceListRow);

  return {
    invoices,
    totalCount: count || 0,
    totalPages: Math.max(1, Math.ceil((count || 0) / ITEMS_PER_PAGE)),
  };
};

export const fetchInboundInvoiceDetails = async (invoiceId: string) => {
  const { data, error } = await supabase
    .from('inbound_invoices')
    .select(
      'id,numero_nfe,serie,chave_acesso,emitente_nome,emitente_cnpj,emitente_ie,destinatario_nome,destinatario_cnpj,data_emissao,data_saida_entrada,natureza_operacao,modelo,protocolo,informacoes_adicionais,valor_produtos,valor_frete,valor_ipi,valor_desconto,valor_seguro,outras_despesas,valor_icms,valor_icms_st,valor_total,status_recebimento,xml_conteudo,updated_at,itens,supplier:people(stock_origins),inbound_invoice_items(*)'
    )
    .eq('id', invoiceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Nota fiscal de entrada não encontrada.');

  return mapInboundInvoiceDetailRow(data);
};

export const deleteInboundInvoice = async (_invoiceId: string) => {
  throw new Error('Notas fiscais de entrada não podem ser excluídas.');
};
