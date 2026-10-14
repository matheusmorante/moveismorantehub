import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authorizeFiscalOperator } from './fiscalAuthorization';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });

  const documentId = String(req.body?.documentId || '');
  if (!uuid.test(documentId))
    return res.status(400).json({ success: false, error: 'Documento fiscal inválido.' });

  const { data: document, error: documentError } = await db
    .from('nfe_documents')
    .select(
      'id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,xml_nfe,xml_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type'
    )
    .eq('id', documentId)
    .maybeSingle();
  let fiscalDoc: any = document;
  let operationDrafts: any[] = [];
  let events: any[] = [];

  if (!fiscalDoc) {
    const { data: draft, error: draftError } = await db
      .from('nfe_operation_drafts')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();

    if (draftError)
      return res
        .status(503)
        .json({ success: false, error: 'Não foi possível carregar os detalhes fiscais.' });

    if (!draft)
      return res.status(404).json({ success: false, error: 'Documento fiscal não encontrado.' });

    if (draft.document_id) {
      const { data: issuedDoc } = await db
        .from('nfe_documents')
        .select(
          'id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,xml_nfe,xml_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type'
        )
        .eq('id', draft.document_id)
        .maybeSingle();
      if (issuedDoc) {
        fiscalDoc = issuedDoc;
      }
    }

    if (!fiscalDoc) {
      let originalDoc: any = null;
      if (draft.original_document_id) {
        const { data: orig } = await db
          .from('nfe_documents')
          .select('*')
          .eq('id', draft.original_document_id)
          .maybeSingle();
        originalDoc = orig;
      }

      const draftStatus = String(draft.status || '').toLowerCase();
      const isAuthorized = draftStatus === 'authorized';
      const status = isAuthorized
        ? (draft.environment === 2 ? 'homologada' : 'autorizada')
        : draftStatus === 'ready'
        ? 'preparada'
        : draftStatus === 'rejected'
        ? 'rejeitada'
        : 'pendente';

      fiscalDoc = {
        id: draft.id,
        order_id: originalDoc?.order_id || null,
        numero_nfe: originalDoc?.numero_nfe || 0,
        serie: '1',
        chave_acesso:
          draft.access_key ||
          (draft.original_access_key
            ? `ESTORNO-${draft.original_access_key}`
            : originalDoc?.chave_acesso
            ? `ESTORNO-${originalDoc.chave_acesso}`
            : ''),
        modelo: '55',
        ambiente: draft.environment === 1 ? 1 : 2,
        status,
        motivo_status:
          draft.reason || 'Nota Fiscal de Estorno (Modelo 55) preparada para regularização',
        numero_protocolo: draft.protocol_number || null,
        xml_nfe: draft.signed_xml || draft.generated_xml || originalDoc?.xml_nfe || null,
        xml_protocolo: draft.sefaz_response_xml || originalDoc?.xml_protocolo || null,
        valor_total: originalDoc?.valor_total || 0,
        destinatario_nome: originalDoc?.destinatario_nome || 'Consumidor',
        destinatario_documento: originalDoc?.destinatario_documento || null,
        created_at: draft.created_at || new Date().toISOString(),
        updated_at: draft.updated_at || new Date().toISOString(),
        document_type: draft.operation_kind || 'estorno',
      };
    }

    operationDrafts = [
      {
        id: draft.id,
        operation_kind: draft.operation_kind,
        environment: draft.environment,
        status: draft.status,
        reason: draft.reason,
        created_at: draft.created_at,
        updated_at: draft.updated_at,
      },
    ];

    const targetIds = [draft.id, draft.original_document_id, draft.document_id].filter(Boolean);
    const { data: evts } = await db
      .from('nfe_document_events')
      .select(
        'id,event_type,event_sequence,attempt_number,status,justification,cstat,xmotivo,protocol_number,protocol_date,requested_by,requested_at,confirmed_at'
      )
      .in('document_id', targetIds)
      .order('requested_at', { ascending: false })
      .limit(30);

    events = evts || [];

    return res.status(200).json({
      success: true,
      document: fiscalDoc,
      events,
      operationDrafts,
    });
  }

  const [eventsResult, draftsResult] = await Promise.all([
    db
      .from('nfe_document_events')
      .select(
        'id,event_type,event_sequence,attempt_number,status,justification,cstat,xmotivo,protocol_number,protocol_date,requested_by,requested_at,confirmed_at'
      )
      .eq('document_id', documentId)
      .order('requested_at', { ascending: false })
      .limit(30),
    db
      .from('nfe_operation_drafts')
      .select('id,operation_kind,environment,status,reason,created_at,updated_at')
      .or(`original_document_id.eq.${documentId},document_id.eq.${documentId}`)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);
  if (eventsResult.error)
    return res
      .status(503)
      .json({ success: false, error: 'Não foi possível carregar o histórico fiscal.' });

  return res.status(200).json({
    success: true,
    document: fiscalDoc,
    events: eventsResult.data || [],
    operationDrafts: draftsResult.data || [],
  });
}
