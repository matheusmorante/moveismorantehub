import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { isNfeProductionEnabled } from './productionGuard';
import { extractCertificateAndKey, signNfeEventXml } from './nfeSigner';
import { sendNationalEventOnce } from './nationalEnvironmentEventClient';
import {
  buildInboundScienceEventXml,
  parseInboundManifestationResponse,
} from './inboundManifestationProtocol';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const digits = (value: unknown) => String(value || '').replace(/\D/g, '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  if (!serviceKey)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

  const db = createClient(supabaseUrl, serviceKey);
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });

  const accessKey = digits(req.body?.accessKey);
  const requestId = String(req.body?.requestId || '');
  if (!/^\d{44}$/.test(accessKey))
    return res.status(400).json({ success: false, error: 'Chave de acesso inválida.' });
  if (!isUuid(requestId))
    return res.status(400).json({ success: false, error: 'Identificador da solicitação inválido.' });

  const { data: invoice, error: invoiceError } = await db
    .from('inbound_invoices')
    .select('id,chave_acesso,modelo,ambiente,destinatario_cnpj,status_sefaz,xml_conteudo')
    .eq('chave_acesso', accessKey)
    .maybeSingle();
  if (invoiceError)
    return res.status(503).json({ success: false, error: 'Não foi possível validar a NF-e de entrada.' });
  if (!invoice)
    return res.status(404).json({ success: false, error: 'Importe ou consulte a nota antes de enviar Ciência.' });
  if (Number(invoice.ambiente) !== 1 && Number(invoice.ambiente) !== 2)
    return res.status(409).json({ success: false, error: 'O ambiente fiscal desta nota não está identificado. Consulte a nota novamente pela SEFAZ.' });
  const environment = Number(invoice.ambiente) as 1 | 2;
  if (environment === 1 && req.body?.productionConfirmed !== true)
    return res.status(400).json({ success: false, error: 'Confirme explicitamente o envio da Ciência em Produção.' });
  if (environment === 1 && !isNfeProductionEnabled(process.env.NFE_PRODUCTION_ENABLED))
    return res.status(503).json({ success: false, error: 'Eventos fiscais em Produção estão desabilitados neste servidor.' });

  const recipientCnpj = digits(invoice.destinatario_cnpj);
  const { data: settingsRow, error: settingsError } = await db
    .from('settings')
    .select('data')
    .eq('id', 'app')
    .maybeSingle();
  const configuredCnpj = digits(settingsRow?.data?.companyCnpj);
  if (settingsError || configuredCnpj.length !== 14 || recipientCnpj !== configuredCnpj)
    return res.status(409).json({ success: false, error: 'O destinatário da nota não corresponde ao CNPJ configurado para esta empresa.' });

  if (String(invoice.modelo || accessKey.slice(20, 22)) !== '55')
    return res.status(409).json({ success: false, error: 'Ciência do destinatário só pode ser enviada para NF-e modelo 55.' });
  if (!/<(?:[\w.-]+:)?resNFe\b/i.test(String(invoice.xml_conteudo || '')))
    return res.status(409).json({ success: false, error: 'A Ciência está disponível apenas enquanto a SEFAZ fornece o resumo da NF-e.' });

  const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfxBase64)
    return res.status(503).json({ success: false, error: 'Certificado digital não configurado no servidor.' });

  let signedXml: string;
  let certificate: ReturnType<typeof extractCertificateAndKey>;
  try {
    certificate = extractCertificateAndKey(pfxBase64, process.env.NFE_CERTIFICATE_PASSWORD || '');
    const eventXml = buildInboundScienceEventXml({
      accessKey,
      environment,
      recipientCnpj,
    });
    signedXml = signNfeEventXml(eventXml, certificate.privateKeyPem, certificate.certDerBase64);
  } catch (error) {
    return res.status(409).json({
      success: false,
      error: error instanceof Error ? error.message : 'Não foi possível preparar a Ciência da Emissão.',
    });
  }

  const { data: reservation, error: reservationError } = await db.rpc(
    'reserve_inbound_manifestation_event',
    {
      p_access_key: accessKey,
      p_environment: environment,
      p_recipient_cnpj: recipientCnpj,
      p_signed_xml: signedXml,
      p_user_id: authorization.userId,
      p_request_id: requestId,
    }
  );
  if (reservationError) {
    const message = String(reservationError.message || '');
    if (message.includes('INBOUND_MANIFESTATION_PREVIOUS_EVENT_PENDING'))
      return res.status(409).json({ success: false, pending: true, error: 'Existe uma tentativa de Ciência com resultado incerto. Não reenvie o evento; reconcilie o histórico fiscal antes de tentar novamente.' });
    if (message.includes('INBOUND_INVOICE_NOT_FOUND'))
      return res.status(404).json({ success: false, error: 'NF-e de entrada não encontrada.' });
    if (message.includes('INBOUND_MANIFESTATION_REQUIRES_SUMMARY'))
      return res.status(409).json({ success: false, error: 'A nota não está mais apenas como resumo.' });
    if (message.includes('INBOUND_MANIFESTATION_ENVIRONMENT_MISMATCH'))
      return res.status(409).json({ success: false, error: 'O ambiente fiscal da nota mudou. Atualize a lista antes de continuar.' });
    if (message.includes('INBOUND_MANIFESTATION_RECIPIENT_MISMATCH'))
      return res.status(409).json({ success: false, error: 'O CNPJ destinatário não corresponde à chave de acesso.' });
    return res.status(409).json({ success: false, error: 'Não foi possível reservar a transmissão da Ciência.' });
  }

  const reservationRow = Array.isArray(reservation) ? reservation[0] : reservation;
  if (!reservationRow?.event_id)
    return res.status(503).json({ success: false, pending: true, error: 'A tentativa foi reservada sem confirmação do histórico. Não reenvie.' });

  if (reservationRow.created !== true) {
    const { data: previousEvent, error: previousError } = await db
      .from('inbound_manifestation_events')
      .select('status,cstat,xmotivo,protocol_number')
      .eq('id', reservationRow.event_id)
      .maybeSingle();
    if (previousError || !previousEvent)
      return res.status(503).json({ success: false, pending: true, error: 'A Ciência já possui uma tentativa registrada, mas seu estado não pôde ser consultado.' });
    if (previousEvent.status === 'registered')
      return res.status(200).json({ success: true, alreadyProcessed: true, cStat: previousEvent.cstat, xMotivo: previousEvent.xmotivo, protocolNumber: previousEvent.protocol_number });
    if (previousEvent.status === 'rejected')
      return res.status(422).json({ success: false, cStat: previousEvent.cstat, xMotivo: previousEvent.xmotivo, error: previousEvent.xmotivo || 'A SEFAZ rejeitou a Ciência.' });
    return res.status(202).json({ success: false, pending: true, error: 'A tentativa anterior ainda está em processamento ou precisa de reconciliação. Nenhum evento novo foi enviado.' });
  }

  let responseXml: string;
  try {
    responseXml = await sendNationalEventOnce({
      environment,
      xmlPayload: signedXml,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });
  } catch {
    await db
      .from('inbound_manifestation_events')
      .update({ status: 'unknown', xmotivo: 'Transmissão iniciada sem confirmação da resposta do Ambiente Nacional.' })
      .eq('id', reservationRow.event_id)
      .eq('status', 'transmitting');
    return res.status(202).json({ success: false, pending: true, error: 'Resultado incerto após o envio. Não reenvie a Ciência até reconciliar a situação fiscal.' });
  }

  const result = parseInboundManifestationResponse(responseXml);
  const { error: updateError } = await db
    .from('inbound_manifestation_events')
    .update({
      status: result.status,
      response_xml: responseXml,
      cstat: result.cStat,
      xmotivo: result.xMotivo,
      protocol_number: result.protocolNumber,
      protocol_date: result.protocolDate,
      confirmed_at: result.status === 'registered' ? new Date().toISOString() : null,
    })
    .eq('id', reservationRow.event_id)
    .eq('status', 'transmitting');
  if (updateError)
    return res.status(503).json({ success: result.status === 'registered', pending: true, cStat: result.cStat, error: 'A resposta da SEFAZ foi recebida, mas o histórico local precisa de reconciliação. Não reenvie o evento.' });

  if (result.status === 'unknown')
    return res.status(202).json({ success: false, pending: true, cStat: result.cStat, xMotivo: result.xMotivo, error: result.xMotivo || 'O Ambiente Nacional não confirmou o resultado do evento. Não reenvie.' });
  if (result.status === 'rejected')
    return res.status(422).json({ success: false, cStat: result.cStat, xMotivo: result.xMotivo, error: result.xMotivo || 'A SEFAZ rejeitou a Ciência da Emissão.' });

  return res.status(200).json({
    success: true,
    cStat: result.cStat,
    xMotivo: result.xMotivo,
    protocolNumber: result.protocolNumber,
    protocolDate: result.protocolDate,
  });
}
