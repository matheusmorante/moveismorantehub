import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import {
  canAbandonBeforeHmlTransmission,
  getFiscalSelectionMismatchDetails,
  isFormallyAbandonedHmlAttempt,
} from './hmlAttemptSafety';
import { isHmlRuleSet } from './emitHmlTechnical';
import { parseFiscalEmissionCommand } from './fiscalSnapshot';

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

  const isDevelopment =
    process.env.VERCEL_ENV === 'development' ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'development');
  if (!isDevelopment && process.env.NODE_ENV !== 'test')
    return res.status(403).json({
      success: false,
      code: 'HML_ABANDONMENT_DEVELOPMENT_ONLY',
      error: 'O encerramento formal desta tentativa está disponível somente no Development local.',
    });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
  const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId : '';
  const emissionRequestId =
    typeof req.body?.emissionRequestId === 'string' ? req.body.emissionRequestId : '';
  if (!orderId || !uuid.test(documentId) || !uuid.test(emissionRequestId))
    return res.status(400).json({ success: false, error: 'Pedido ou tentativa fiscal inválidos.' });

  const parsedCommand = parseFiscalEmissionCommand({
    orderId,
    environment: 2,
    emissionRequestId,
    itemCsosnOverrides: req.body?.itemCsosnOverrides,
    itemFiscalSelections: req.body?.itemFiscalSelections,
  });
  if (!('command' in parsedCommand))
    return res
      .status(400)
      .json({ success: false, error: 'As escolhas fiscais atuais são inválidas.' });

  const db = createClient<FiscalDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });

  const { data: document, error: readError } = await db
    .from('nfe_documents')
    .select(
      'id,order_id,emission_request_id,ambiente,modelo,status,document_type,fiscal_ruleset_version,fiscal_snapshot_id,hml_attempt_token,hml_attempt_expires_at,numero_protocolo,xml_protocolo,hml_response_history,numero_nfe,serie'
    )
    .eq('id', documentId)
    .eq('order_id', orderId)
    .eq('emission_request_id', emissionRequestId)
    .eq('ambiente', 2)
    .maybeSingle();
  if (readError)
    return res.status(503).json({
      success: false,
      error: 'Não foi possível verificar a tentativa fiscal antes do encerramento.',
    });
  if (
    !document ||
    document.document_type !== 'outbound' ||
    !isHmlRuleSet(document.fiscal_ruleset_version)
  )
    return res
      .status(404)
      .json({ success: false, error: 'Tentativa HML não encontrada para este pedido.' });

  const alreadyAbandoned =
    document.status === 'abandoned' && isFormallyAbandonedHmlAttempt(document.hml_response_history);
  if (!alreadyAbandoned && !canAbandonBeforeHmlTransmission(document))
    return res.status(409).json({
      success: false,
      code: 'HML_ABANDONMENT_TRANSMISSION_NOT_PROVEN',
      error:
        'O histórico não comprova uma falha antes do envio à SEFAZ. Consulte e reconcilie a tentativa primeiro.',
    });

  const { data: originalSnapshot, error: snapshotError } = document.fiscal_snapshot_id
    ? await db
        .from('nfe_fiscal_snapshots')
        .select('snapshot_data')
        .eq('id', document.fiscal_snapshot_id)
        .maybeSingle()
    : { data: null, error: null };
  if (snapshotError || !originalSnapshot)
    return res.status(409).json({
      success: false,
      code: 'HML_ABANDONMENT_SNAPSHOT_UNAVAILABLE',
      error: 'O snapshot original não pôde ser conferido. A tentativa foi preservada.',
    });

  const originalChoices =
    originalSnapshot.snapshot_data?.emissionRequest?.itemFiscalSelections || {};
  const currentChoices = parsedCommand.command.itemFiscalSelections || {};
  const originalItemNumbers = Object.keys(originalChoices).sort();
  const currentItemNumbers = Object.keys(currentChoices).sort();
  if (
    !originalItemNumbers.length ||
    originalItemNumbers.length !== currentItemNumbers.length ||
    originalItemNumbers.some((itemNumber, index) => itemNumber !== currentItemNumbers[index])
  )
    return res.status(409).json({
      success: false,
      code: 'HML_ABANDONMENT_FISCAL_CHANGE_NOT_PROVEN',
      error: 'As escolhas fiscais atuais não correspondem aos itens do snapshot original.',
    });

  const fiscalMismatchFields = getFiscalSelectionMismatchDetails(
    originalSnapshot.snapshot_data,
    parsedCommand.command
  ).filter((mismatch) => mismatch.field.startsWith('Item '));
  if (!fiscalMismatchFields.length)
    return res.status(409).json({
      success: false,
      code: 'HML_ABANDONMENT_FISCAL_CHANGE_NOT_PROVEN',
      error: 'Nenhuma alteração fiscal foi identificada entre o snapshot e as escolhas atuais.',
    });

  if (alreadyAbandoned)
    return res.status(200).json({
      success: true,
      alreadyAbandoned: true,
      documentId: document.id,
      orderId: document.order_id,
      emissionRequestId: document.emission_request_id,
      nfeNumber: document.numero_nfe,
      series: document.serie,
      model: document.modelo,
      environment: 2,
      status: 'abandoned',
    });

  const { data, error: abandonError } = await db.rpc('abandon_untransmitted_hml_attempt', {
    p_document_id: document.id,
    p_order_id: orderId,
    p_emission_request_id: emissionRequestId,
    p_actor_id: authorization.userId,
  });
  if (abandonError || !data || data.success !== true)
    return res.status(409).json({
      success: false,
      code: 'HML_ABANDONMENT_NOT_COMPLETED',
      error:
        'O banco recusou o encerramento porque o estado da tentativa mudou ou a transmissão não está comprovadamente ausente.',
    });

  return res.status(200).json(data);
}
