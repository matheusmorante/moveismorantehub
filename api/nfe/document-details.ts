import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authorizeFiscalOperator } from './fiscalAuthorization';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
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
      'id,order_id,numero_nfe,serie,modelo,ambiente,status,motivo_status,numero_protocolo,xml_nfe,xml_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type'
    )
    .eq('id', documentId)
    .maybeSingle();
  if (documentError)
    return res.status(503).json({ success: false, error: 'Não foi possível carregar os detalhes fiscais.' });
  if (!document)
    return res.status(404).json({ success: false, error: 'Documento fiscal não encontrado.' });

  const { data: events, error: eventsError } = await db
    .from('nfe_document_events')
    .select(
      'id,event_type,event_sequence,attempt_number,status,justification,cstat,xmotivo,protocol_number,protocol_date,requested_by,requested_at,confirmed_at'
    )
    .eq('document_id', documentId)
    .order('requested_at', { ascending: false })
    .limit(30);
  if (eventsError)
    return res.status(503).json({ success: false, error: 'Não foi possível carregar o histórico fiscal.' });

  return res.status(200).json({ success: true, document, events: events || [] });
}
