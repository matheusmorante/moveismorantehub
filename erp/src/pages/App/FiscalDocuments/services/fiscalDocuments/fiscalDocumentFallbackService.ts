import { supabase } from '@/pages/utils/supabaseConfig';
import type {
  FiscalDocumentDetails,
  NfeDocumentRecord,
} from '../../types/fiscalDocuments.types';
import { parseFiscalXmlDetails } from '../../utils/fiscalXmlParser';
import {
  mapFiscalDocumentDetailsRecord,
  mapNfeDocumentRecord,
  mapOperationDraftSummary,
  parseFiscalDocumentEvent,
} from './fiscalDocumentParsers';

const NFE_DOCUMENT_COLUMNS =
  'id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,xml_nfe,xml_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type,original_document_id';

const NFE_EVENT_COLUMNS =
  'id,event_type,event_sequence,attempt_number,status,justification,cstat,xmotivo,protocol_number,protocol_date,requested_by,requested_at,confirmed_at';

const NFE_DRAFT_COLUMNS =
  'id,operation_kind,environment,status,reason,created_at,updated_at,document_id,access_key,protocol_number,original_document_id,signed_xml,generated_xml,sefaz_response_xml';

async function fetchOrderEmissions(
  orderId: string,
  ambiente: number
): Promise<NfeDocumentRecord[]> {
  const { data: emissions } = await supabase
    .from('nfe_documents')
    .select(NFE_DOCUMENT_COLUMNS)
    .eq('order_id', orderId)
    .eq('ambiente', ambiente)
    .eq('document_type', 'outbound')
    .order('created_at', { ascending: true })
    .limit(20);

  if (!Array.isArray(emissions)) return [];
  return emissions.map((em) => mapNfeDocumentRecord(em, 'outbound'));
}

async function fetchDraftFallbackDetails(draftId: string): Promise<FiscalDocumentDetails> {
  const { data: draft, error: draftError } = await supabase
    .from('nfe_operation_drafts')
    .select(NFE_DRAFT_COLUMNS)
    .eq('id', draftId)
    .maybeSingle();

  if (draftError || !draft) {
    throw new Error('Documento fiscal não encontrado.');
  }

  if (draft.document_id && draft.document_id !== draft.id) {
    return fetchFiscalDocumentDetailsFromSupabase(draft.document_id);
  }

  let originalDoc: {
    order_id?: string | null;
    valor_total?: number | null;
    destinatario_nome?: string | null;
    destinatario_documento?: string | null;
  } | null = null;

  if (draft.original_document_id) {
    const { data: orig } = await supabase
      .from('nfe_documents')
      .select('id,order_id,valor_total,destinatario_nome,destinatario_documento')
      .eq('id', draft.original_document_id)
      .maybeSingle();
    originalDoc = orig;
  }

  const draftStatus = String(draft.status || '').toLowerCase();
  const status =
    draftStatus === 'rejected'
      ? 'rejeitada'
      : draftStatus === 'cancelled'
      ? 'cancelada'
      : 'pendente';
  const accessKey = typeof draft.access_key === 'string' ? draft.access_key : '';

  const draftDoc: FiscalDocumentDetails['document'] = {
    id: draft.id,
    order_id: originalDoc?.order_id || null,
    numero_nfe: accessKey.length >= 34 ? Number(accessKey.slice(25, 34)) : 0,
    serie: accessKey.length >= 25 ? String(Number(accessKey.slice(22, 25))) : '',
    chave_acesso: accessKey,
    modelo: '55',
    ambiente: draft.environment === 1 ? 1 : 2,
    status: status as NfeDocumentRecord['status'],
    motivo_status: draft.reason || 'Nota Fiscal de Estorno (Modelo 55)',
    numero_protocolo: draft.protocol_number || null,
    valor_total: originalDoc?.valor_total || 0,
    destinatario_nome: originalDoc?.destinatario_nome || 'Consumidor',
    destinatario_documento: originalDoc?.destinatario_documento || undefined,
    created_at: draft.created_at || new Date().toISOString(),
    updated_at: draft.updated_at || new Date().toISOString(),
    document_type: draft.operation_kind || 'estorno',
    xml_nfe: draft.signed_xml || draft.generated_xml || null,
    xml_protocolo: draft.sefaz_response_xml || null,
  };

  return {
    document: draftDoc,
    events: [],
    parsedXml: parseFiscalXmlDetails(draftDoc.xml_nfe || ''),
    operationDrafts: [mapOperationDraftSummary(draft)],
  };
}

export async function fetchFiscalDocumentDetailsFromSupabase(
  documentId: string
): Promise<FiscalDocumentDetails> {
  const { data: doc, error: docError } = await supabase
    .from('nfe_documents')
    .select(NFE_DOCUMENT_COLUMNS)
    .eq('id', documentId)
    .maybeSingle();

  if (docError) {
    throw new Error(
      'Não foi possível carregar o documento fiscal via banco de dados: ' + docError.message
    );
  }

  if (!doc) {
    return fetchDraftFallbackDetails(documentId);
  }

  const document = mapFiscalDocumentDetailsRecord(doc);

  const [{ data: events }, { data: drafts }, { data: linkedDocs }] = await Promise.all([
    supabase
      .from('nfe_document_events')
      .select(NFE_EVENT_COLUMNS)
      .eq('document_id', documentId)
      .order('requested_at', { ascending: false })
      .limit(30),
    supabase
      .from('nfe_operation_drafts')
      .select(
        'id,operation_kind,environment,status,reason,created_at,updated_at,document_id,access_key,protocol_number'
      )
      .or(`original_document_id.eq.${documentId},document_id.eq.${documentId}`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('nfe_documents')
      .select(NFE_DOCUMENT_COLUMNS)
      .eq('original_document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  let orderEmissions: NfeDocumentRecord[] = [];
  if (document.order_id) {
    orderEmissions = await fetchOrderEmissions(document.order_id, document.ambiente);
  }

  return {
    document,
    events: (events || []).map(parseFiscalDocumentEvent),
    parsedXml: parseFiscalXmlDetails(document.xml_nfe || ''),
    operationDrafts: Array.isArray(drafts) ? drafts.map(mapOperationDraftSummary) : undefined,
    linkedDocuments: Array.isArray(linkedDocs)
      ? linkedDocs.map((ld) => mapNfeDocumentRecord(ld, 'estorno'))
      : [],
    orderEmissions,
  };
}
