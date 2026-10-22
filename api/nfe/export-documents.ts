import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import { authorizeFiscalExporter } from './fiscalAuthorization';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DOCUMENTS = 250;
const EXPORT_PAGE_SIZE = 10;
const MODEL_OPTIONS = ['55', '65'] as const;
const DOCUMENT_TYPE_OPTIONS = ['outbound', 'estorno', 'return', 'inbound'] as const;
const STATUS_OPTIONS = ['autorizada', 'homologada', 'cancelada', 'denegada', 'rejeitada'] as const;

type ExportFilters = {
  purpose: 'accounting' | 'custom';
  periodStart: string;
  periodEnd: string;
  environment: 1 | 2;
  models: Array<(typeof MODEL_OPTIONS)[number]>;
  documentTypes: Array<(typeof DOCUMENT_TYPE_OPTIONS)[number]>;
  statuses: Array<(typeof STATUS_OPTIONS)[number]>;
  includeEvents: boolean;
  includeReport: boolean;
};

const DOCUMENT_COLUMNS =
  'id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,numero_protocolo,valor_total,created_at,document_type,original_document_id,supersedes_document_id';
const DOCUMENT_XML_COLUMNS = `${DOCUMENT_COLUMNS},xml_nfe,xml_protocolo`;
const INBOUND_COLUMNS = 'id,chave_acesso,numero_nfe,serie,modelo,ambiente,data_emissao,status_sefaz,status_recebimento,protocolo,valor_total,xml_conteudo';

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseEnumArray<T extends readonly string[]>(
  value: unknown,
  allowed: T
): Array<T[number]> | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > allowed.length) return null;
  const entries = [...new Set(value)];
  if (entries.some((entry) => typeof entry !== 'string' || !allowed.includes(entry as T[number])))
    return null;
  return entries as Array<T[number]>;
}

function parseFilters(value: unknown, accountantOnly: boolean): ExportFilters | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const models = parseEnumArray(input.models, MODEL_OPTIONS);
  const documentTypes = parseEnumArray(input.documentTypes, DOCUMENT_TYPE_OPTIONS);
  const statuses = parseEnumArray(input.statuses, STATUS_OPTIONS);
  const environment = input.environment;
  const purpose = input.purpose;
  const includeEvents = input.includeEvents;
  const includeReport = input.includeReport;

  if (
    (purpose !== 'accounting' && purpose !== 'custom') ||
    (environment !== 1 && environment !== 2) ||
    (accountantOnly && environment !== 1) ||
    !isValidDate(input.periodStart) ||
    !isValidDate(input.periodEnd) ||
    input.periodStart > input.periodEnd ||
    !models ||
    !documentTypes ||
    !statuses ||
    typeof includeEvents !== 'boolean' ||
    typeof includeReport !== 'boolean'
  ) return null;

  const start = Date.parse(`${input.periodStart}T00:00:00.000Z`);
  const end = Date.parse(`${input.periodEnd}T00:00:00.000Z`);
  if (end - start > 366 * 24 * 60 * 60 * 1000) return null;

  if (purpose === 'accounting' && (environment !== 1 || documentTypes.includes('inbound') || !includeEvents ||
      statuses.some((status) => !['autorizada', 'cancelada'].includes(status)))) return null;
  if (environment === 1 && statuses.includes('homologada')) return null;
  if (environment === 2 && statuses.includes('autorizada')) return null;

  return {
    purpose,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    environment,
    models,
    documentTypes,
    statuses,
    includeEvents,
    includeReport,
  };
}

function buildDocumentsQuery(db: any, filters: ExportFilters, includeXml = false, head = false) {
  const columns = includeXml ? DOCUMENT_XML_COLUMNS : DOCUMENT_COLUMNS;
  const startInclusive = `${filters.periodStart}T00:00:00-03:00`;
  const endAt = new Date(
    Date.parse(`${filters.periodEnd}T00:00:00-03:00`) + 24 * 60 * 60 * 1000
  ).toISOString();
  const outboundTypes = filters.documentTypes.filter((type) => type !== 'inbound');
  if (!outboundTypes.length) return null;
  const typeConditions = outboundTypes.flatMap((type) =>
    type === 'outbound'
      ? ['document_type.eq.outbound', 'document_type.is.null']
      : [`document_type.eq.${type}`]
  );

  return db
    .from('nfe_documents')
    .select(columns, { count: 'exact', head })
    .eq('ambiente', filters.environment)
    .in('modelo', filters.models)
    .in('status', filters.statuses)
    .or(typeConditions.join(','))
    .gte('created_at', startInclusive)
    .lt('created_at', endAt)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
}

function buildInboundQuery(db: any, filters: ExportFilters, includeXml = false, head = false) {
  if (!filters.documentTypes.includes('inbound')) return null;
  const columns = includeXml ? INBOUND_COLUMNS : 'id,chave_acesso,numero_nfe,serie,modelo,ambiente,data_emissao,status_sefaz,status_recebimento,protocolo,valor_total';
  const endAt = new Date(
    Date.parse(`${filters.periodEnd}T00:00:00-03:00`) + 24 * 60 * 60 * 1000
  ).toISOString();
  return db
    .from('inbound_invoices')
    .select(columns, { count: 'exact', head })
    .eq('ambiente', filters.environment)
    .in('modelo', filters.models)
    .in('status_sefaz', filters.statuses)
    .gte('data_emissao', `${filters.periodStart}T00:00:00-03:00`)
    .lt('data_emissao', endAt)
    .not('xml_conteudo', 'is', null)
    .neq('xml_conteudo', '')
    .order('data_emissao', { ascending: true })
    .order('id', { ascending: true });
}

function mapGroups(documents: any[]) {
  const groups = new Map<string, { documentType: string; status: string; count: number; total: number }>();
  for (const document of documents) {
    const documentType = document.document_type || 'outbound';
    const key = `${documentType}:${document.status}`;
    const row = groups.get(key) || { documentType, status: document.status, count: 0, total: 0 };
    row.count += 1;
    row.total += Number(document.valor_total || 0);
    groups.set(key, row);
  }
  return Array.from(groups.values()).map((row) => ({ ...row, total: Number(row.total.toFixed(2)) }));
}

async function summarizeExport(db: any, filters: ExportFilters) {
  let outboundData: any[] = [];
  let outboundCount = 0;
  const outboundQuery = buildDocumentsQuery(db, filters);
  if (outboundQuery) {
    const { data, error, count } = await outboundQuery.range(0, MAX_DOCUMENTS - 1);
    if (error || !Array.isArray(data)) throw new Error('Não foi possível consultar as notas fiscais de saída para exportação.');
    outboundData = data;
    outboundCount = Number(count || 0);
  }

  let inboundData: any[] = [];
  let inboundCount = 0;
  const inboundQuery = buildInboundQuery(db, filters);
  if (inboundQuery) {
    const { data, error, count } = await inboundQuery.range(0, MAX_DOCUMENTS - 1);
    if (error || !Array.isArray(data)) throw new Error('Não foi possível consultar as notas fiscais de entrada para exportação.');
    inboundData = data;
    inboundCount = Number(count || 0);
  }

  const totalCount = outboundCount + inboundCount;
  if (totalCount > MAX_DOCUMENTS) {
    const error = new Error(`O período encontrou mais de ${MAX_DOCUMENTS} documentos. Reduza o período para exportar com segurança.`);
    Object.assign(error, { statusCode: 413 });
    throw error;
  }

  const documents = [
    ...outboundData,
    ...inboundData.map((document: any) => ({
      ...document,
      document_type: 'inbound',
      status: document.status_sefaz,
      created_at: document.data_emissao,
    })),
  ];
  const documentIds = outboundData.map((document: any) => String(document.id));
  const linkedIds = [...new Set(outboundData
    .flatMap((document: any) => [document.original_document_id, document.supersedes_document_id])
    .filter(Boolean).map(String))].filter((id) => !documentIds.includes(id));
  let eventDocumentIds = documentIds;
  if (linkedIds.length) {
    const { data: originals, error: originalError } = await db
      .from('nfe_documents')
      .select('id')
      .in('id', linkedIds)
      .eq('ambiente', filters.environment);
    if (originalError) throw new Error('Não foi possível carregar as referências fiscais dos documentos.');
    eventDocumentIds = [...documentIds, ...(originals || []).map((document: any) => String(document.id))];
  }
  let eventCount = 0;
  if (filters.includeEvents && eventDocumentIds.length) {
    const { count: countEvents, error: eventsError } = await db
      .from('nfe_document_events')
      .select('id', { count: 'exact', head: true })
      .in('document_id', eventDocumentIds)
      .eq('environment', filters.environment)
      .eq('event_type', '110111')
      .eq('status', 'registered');
    if (eventsError) throw new Error('Não foi possível contar os eventos fiscais registrados.');
    eventCount = Number(countEvents || 0);
  }
  if (filters.includeEvents && inboundData.length) {
    const accessKeys = inboundData.map((document: any) => String(document.chave_acesso)).filter(Boolean);
    const { count: manifestationCount, error: manifestationError } = await db
      .from('inbound_manifestation_events')
      .select('id', { count: 'exact', head: true })
      .in('access_key', accessKeys)
      .eq('environment', filters.environment)
      .eq('event_type', '210210')
      .eq('status', 'registered');
    if (manifestationError) throw new Error('Não foi possível contar os eventos de manifestação de entrada registrados.');
    eventCount += Number(manifestationCount || 0);
  }

  const totalValue = Number(documents.reduce((sum: number, document: any) => sum + Number(document.valor_total || 0), 0).toFixed(2));
  return {
    totalCount,
    inboundCount,
    eventCount,
    totalValue,
    groups: mapGroups(documents),
  };
}

function serializeFilterColumns(filters: ExportFilters) {
  return {
    purpose: filters.purpose,
    period_start: filters.periodStart,
    period_end: filters.periodEnd,
    environment: filters.environment,
    models: filters.models,
    document_types: filters.documentTypes,
    statuses: filters.statuses,
    includes_events: filters.includeEvents,
    includes_report: filters.includeReport,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authorization = await authorizeFiscalExporter(db, req.headers.authorization);
  if (!authorization.ok) return res.status(authorization.status).json({ success: false, error: authorization.message });

  const action = req.body?.action;
  if (action === 'history') {
    const { data, error } = await db
      .from('nfe_document_export_history')
      .select('id,created_at,purpose,period_start,period_end,environment,document_count,event_count,total_value,archive_name')
      .eq('requested_by', authorization.userId)
      .order('created_at', { ascending: false })
      .limit(15);
    if (error) return res.status(503).json({ success: false, error: 'Não foi possível carregar o histórico de exportações.' });
    return res.status(200).json({ success: true, history: data || [] });
  }

  const filters = parseFilters(req.body?.filters, authorization.accountantOnly);
  if (!filters) return res.status(422).json({ success: false, error: 'Filtros de exportação inválidos ou incompatíveis com o perfil.' });

  if (action === 'preview') {
    try {
      return res.status(200).json({ success: true, ...(await summarizeExport(db, filters)) });
    } catch (error) {
      const status = Number((error as { statusCode?: number })?.statusCode || 503);
      return res.status(status).json({ success: false, error: error instanceof Error ? error.message : 'Não foi possível pré-visualizar a exportação.' });
    }
  }

  if (action === 'page') {
    const offset = req.body?.offset;
    if (!Number.isInteger(offset) || offset < 0 || offset >= MAX_DOCUMENTS) {
      return res.status(422).json({ success: false, error: 'Página de exportação inválida.' });
    }

    let outboundCount = 0;
    const outboundQuery = buildDocumentsQuery(db, filters);
    if (outboundQuery) {
      const { count, error } = await buildDocumentsQuery(db, filters, false, true);
      if (error) return res.status(503).json({ success: false, error: 'Não foi possível contar as notas fiscais de saída.' });
      outboundCount = Number(count || 0);
    }
    let inboundCount = 0;
    const inboundQuery = buildInboundQuery(db, filters);
    if (inboundQuery) {
      const { count, error } = await buildInboundQuery(db, filters, false, true);
      if (error) return res.status(503).json({ success: false, error: 'Não foi possível contar as notas fiscais de entrada.' });
      inboundCount = Number(count || 0);
    }
    if (outboundCount + inboundCount > MAX_DOCUMENTS || offset >= outboundCount + inboundCount) {
      return res.status(413).json({ success: false, error: 'A lista de exportação mudou ou ultrapassou o limite. Gere uma nova prévia ou reduza o período.' });
    }

    const pageEnd = Math.min(offset + EXPORT_PAGE_SIZE, outboundCount + inboundCount);
    const outboundStart = Math.min(offset, outboundCount);
    const outboundEnd = Math.min(pageEnd, outboundCount);
    let data: any[] = [];
    if (outboundEnd > outboundStart && outboundQuery) {
      const outboundPageQuery = buildDocumentsQuery(db, filters, true);
      if (!outboundPageQuery) return res.status(503).json({ success: false, error: 'Não foi possível preparar a página de documentos fiscais.' });
      const { data: outboundPage, error } = await outboundPageQuery.range(outboundStart, outboundEnd - 1);
      if (error || !Array.isArray(outboundPage)) return res.status(503).json({ success: false, error: 'Não foi possível carregar os XMLs fiscais de saída.' });
      data = outboundPage;
    }

    let inboundDocuments: any[] = [];
    const inboundStart = Math.max(0, offset - outboundCount);
    const inboundEnd = Math.min(pageEnd - outboundCount, inboundCount);
    if (inboundEnd > inboundStart && inboundQuery) {
      const inboundPageQuery = buildInboundQuery(db, filters, true);
      if (!inboundPageQuery) return res.status(503).json({ success: false, error: 'Não foi possível preparar a página de entradas fiscais.' });
      const { data: inboundPage, error } = await inboundPageQuery.range(inboundStart, inboundEnd - 1);
      if (error || !Array.isArray(inboundPage)) return res.status(503).json({ success: false, error: 'Não foi possível carregar os XMLs fiscais de entrada.' });
      inboundDocuments = inboundPage.map((document: any) => ({
        id: `inbound-${document.id}`,
        order_id: null,
        numero_nfe: Number(document.numero_nfe),
        serie: String(document.serie || '1'),
        chave_acesso: String(document.chave_acesso || ''),
        modelo: String(document.modelo) === '65' ? '65' : '55',
        ambiente: document.ambiente,
        status: document.status_sefaz,
        numero_protocolo: document.protocolo || null,
        valor_total: Number(document.valor_total || 0),
        created_at: document.data_emissao,
        document_type: 'inbound',
        original_document_id: null,
        xml_nfe: document.xml_conteudo,
        xml_protocolo: null,
        source_status: document.status_recebimento || null,
      }));
    }

    const originalIds = [...new Set(data
      .flatMap((document: any) => [document.original_document_id, document.supersedes_document_id])
      .filter(Boolean).map(String))];
    let linkedDocuments: any[] = [];
    if (originalIds.length) {
      const { data: originals, error: originalsError } = await db
        .from('nfe_documents')
        .select(DOCUMENT_XML_COLUMNS)
        .in('id', originalIds)
        .eq('ambiente', filters.environment);
      if (originalsError || !Array.isArray(originals) || originals.length !== originalIds.length) {
        return res.status(503).json({ success: false, error: 'Não foi possível carregar todas as notas originais referenciadas.' });
      }
      linkedDocuments = originals.map((document: any) => ({ ...document, isContextDocument: true }));
    }

    const allDocuments = [...data, ...linkedDocuments];
    const allIds = [...new Set(allDocuments.map((document: any) => String(document.id)))];
    let events: any[] = [];
    if (filters.includeEvents && allIds.length) {
      const { data: registeredEvents, error: eventsError } = await db
        .from('nfe_document_events')
        .select('id,document_id,event_type,event_sequence,attempt_number,environment,status,protocol_number,protocol_date,requested_at,signed_xml,response_xml')
        .in('document_id', allIds)
        .eq('environment', filters.environment)
        .eq('event_type', '110111')
        .eq('status', 'registered')
        .order('requested_at', { ascending: true })
        .limit(500);
      if (eventsError || !Array.isArray(registeredEvents)) return res.status(503).json({ success: false, error: 'Não foi possível carregar os XMLs de eventos fiscais.' });
      events = registeredEvents;
    }

    if (filters.includeEvents && inboundDocuments.length) {
      const inboundAccessKeys = inboundDocuments.map((document) => String(document.chave_acesso)).filter(Boolean);
      const inboundIdByKey = new Map(inboundDocuments.map((document) => [document.chave_acesso, document.id]));
      const { data: manifestations, error: manifestationsError } = await db
        .from('inbound_manifestation_events')
        .select('id,access_key,event_type,event_sequence,attempt_number,environment,status,protocol_number,protocol_date,requested_at,signed_xml,response_xml')
        .in('access_key', inboundAccessKeys)
        .eq('environment', filters.environment)
        .eq('event_type', '210210')
        .eq('status', 'registered')
        .order('requested_at', { ascending: true })
        .limit(500);
      if (manifestationsError || !Array.isArray(manifestations)) return res.status(503).json({ success: false, error: 'Não foi possível carregar os XMLs dos eventos de entrada registrados.' });
      events = events.concat(manifestations.map((event: any) => ({
        ...event,
        document_id: inboundIdByKey.get(String(event.access_key)) || '',
      })).filter((event: any) => event.document_id));
    }

    const orderIds = [...new Set(allDocuments.map((document: any) => document.order_id).filter(Boolean).map(String))];
    let orderNumbers: Record<string, number> = {};
    if (orderIds.length) {
      const { data: orders, error: ordersError } = await db.from('orders').select('id,order_number').in('id', orderIds);
      if (ordersError || !Array.isArray(orders)) return res.status(503).json({ success: false, error: 'Não foi possível carregar os números dos pedidos vinculados.' });
      orderNumbers = Object.fromEntries(orders.map((order: any) => [String(order.id), Number(order.order_number)]));
    }

    return res.status(200).json({
      success: true,
      documents: [...data, ...inboundDocuments],
      linkedDocuments,
      events,
      orderNumbers,
      nextOffset: pageEnd < outboundCount + inboundCount ? pageEnd : null,
    });
  }

  if (action === 'record') {
    const exportId = String(req.body?.exportId || '');
    const archiveName = String(req.body?.archiveName || '');
    if (!UUID_PATTERN.test(exportId) || !/^[A-Za-z0-9._-]{1,116}\.zip$/.test(archiveName)) {
      return res.status(422).json({ success: false, error: 'Identificação do arquivo de exportação inválida.' });
    }
    try {
      const summary = await summarizeExport(db, filters);
      const { error } = await db.from('nfe_document_export_history').upsert({
        id: exportId,
        requested_by: authorization.userId,
        ...serializeFilterColumns(filters),
        document_count: summary.totalCount,
        event_count: summary.eventCount,
        total_value: summary.totalValue,
        archive_name: archiveName,
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) return res.status(503).json({ success: false, error: 'Não foi possível registrar a exportação no histórico.' });
      return res.status(200).json({ success: true, exportId });
    } catch (error) {
      const status = Number((error as { statusCode?: number })?.statusCode || 503);
      return res.status(status).json({ success: false, error: error instanceof Error ? error.message : 'Não foi possível registrar a exportação.' });
    }
  }

  return res.status(400).json({ success: false, error: 'Ação de exportação inválida.' });
}
