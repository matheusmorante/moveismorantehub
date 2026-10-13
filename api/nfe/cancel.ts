import { ACCESS_KEY_PATTERN } from '../../shared-utils/fiscalIdentifiers';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractCertificateAndKey, signNfeEventXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import {
  decideCancellationRecovery,
  getAuthorizedAt,
  parseSefazNfeSituation,
  validateCancellationReason,
} from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { getGoodsCirculationState } from '../../erp/src/pages/utils/nfe/cancellationEligibility';
import { formatNfeDateTime } from '../../erp/src/pages/utils/nfe/nfeXmlBuilder';
import { getFiscalCancellationPolicy } from '../../erp/src/pages/utils/nfe/fiscalCancellationPolicy';
import { getNfeServiceEndpoint } from './fiscalEnvironmentPolicy';
import { matchesConsultedDocument } from './consultAuthorizedDocument';
import { validateCancellationAgainstOfficialSchema } from './schemaValidator';
import { persistCancellationResult } from './cancellationPersistence';
import {
  assertAuthorizedFiscalSnapshot,
  findFiscalOrderEditChanges,
  hasPotentialFiscalOrderEdit,
  projectOrderDataForFiscalEdit,
  type AuthorizedFiscalDocumentForEdit,
} from './orderEditFiscalAudit';
import type { FiscalSnapshotCandidate } from './fiscalSnapshot';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseServiceKey = getSupabaseSecretKey() || '';
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[character] as string
  );

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  if (!supabaseServiceKey)
    return res.status(503).json({
      success: false,
      error: 'Serviço fiscal indisponível: credencial segura do banco não configurada.',
    });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const fiscalAuthorization = await authorizeFiscalOperator(supabase, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message,
    });

  const documentId = String(req.body?.documentId || '');
  const reason = String(req.body?.reason || '').trim();
  const viaOrderEdit = req.body?.viaOrderEdit === true;
  const orderEditOrderId = String(req.body?.orderId || '');
  let orderEditVersion = String(req.body?.orderUpdatedAt || '');
  let proposedOrder = req.body?.proposedOrder;
  const replacementId = String(req.body?.replacementId || '');
  const reasonError = validateCancellationReason(reason);
  if (!documentId || reasonError)
    return res
      .status(400)
      .json({ success: false, error: reasonError || 'Documento fiscal não informado.' });
  if (
    viaOrderEdit && !replacementId &&
    (!orderEditOrderId ||
      !orderEditVersion ||
      !proposedOrder ||
      typeof proposedOrder !== 'object' ||
      Array.isArray(proposedOrder) ||
      JSON.stringify(proposedOrder).length > 1_000_000)
  )
    return res.status(400).json({
      success: false,
      error: 'A confirmação de edição fiscal está incompleta ou excede o limite permitido.',
    });

  try {
    const { data: doc, error: docError } = await supabase
      .from('nfe_documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();
    if (docError || !doc)
      return res.status(404).json({ success: false, error: 'Documento fiscal não encontrado.' });
    if (doc.document_type !== 'outbound')
      return res.status(409).json({
        success: false,
        error: 'Somente uma NF-e de saída pode receber este evento de cancelamento.',
      });
    if (!['autorizada', 'homologada'].includes(doc.status))
      return res.status(409).json({
        success: false,
        error: 'Somente documento autorizado pode receber evento de cancelamento.',
      });
    if (
      !['55', '65'].includes(String(doc.modelo)) ||
      ![1, 2].includes(Number(doc.ambiente)) ||
      doc.status !== (Number(doc.ambiente) === 2 ? 'homologada' : 'autorizada') ||
      !ACCESS_KEY_PATTERN.test(String(doc.chave_acesso || ''))
    ) {
      return res.status(409).json({
        success: false,
        error: 'Modelo, ambiente ou chave de acesso do documento inválidos.',
      });
    }
    if (Number(doc.ambiente) === 1 && req.body?.productionConfirmed !== true) {
      return res
        .status(400)
        .json({ success: false, error: 'Confirme explicitamente o cancelamento em Produção.' });
    }
    if (!/^\d{15}$/.test(String(doc.numero_protocolo || '')) || !doc.xml_nfe)
      return res.status(409).json({
        success: false,
        error:
          'A nota não contém XML autorizado e protocolo original válidos para referenciar o evento.',
      });

    if (!doc.order_id)
      return res.status(409).json({
        success: false,
        error:
          'Documento sem vínculo com o pedido; não é possível comprovar se a mercadoria circulou.',
      });
    let physicalCirculationConfirmed = false;
    let commercialOrderStatus: string | null = null;
    let linkedOrder: Record<string, any> | null = null;
    if (doc.order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(
          'id,status,updated_at,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_type,order_data'
        )
        .eq('id', doc.order_id)
        .maybeSingle();
      if (orderError || !order)
        return res.status(503).json({
          success: false,
          error: 'Não foi possível verificar a circulação da mercadoria.',
        });
      linkedOrder = order as Record<string, any>;
      commercialOrderStatus = String(order?.status || '').toLowerCase();
      const circulationState = getGoodsCirculationState(order);
      physicalCirculationConfirmed = circulationState === 'completed';
      if (circulationState === 'in_progress')
        return res.status(409).json({
          success: false,
          error: 'A entrega ou retirada ainda não foi confirmada. Aguarde o registro de entrega, recusa ou retorno antes de cancelar a nota.',
        });
      const orderType = String(
        order?.order_type || order?.order_data?.orderType || 'sale'
      ).toLowerCase();
      if (!['sale', 'showroom'].includes(orderType))
        return res.status(409).json({
          success: false,
          error: 'O pedido vinculado não é uma venda elegível para este cancelamento fiscal.',
        });
    }
    if (viaOrderEdit && (!linkedOrder || orderEditOrderId !== String(doc.order_id)))
      return res.status(409).json({
        success: false,
        error: 'A edição fiscal não corresponde ao pedido vinculado à nota.',
      });

    if (viaOrderEdit && !replacementId)
      return res.status(409).json({ success: false, error: 'Registre a substituição fiscal antes de cancelar a nota por edição.' });
    if (viaOrderEdit && replacementId) {
      const { data: replacement, error } = await supabase.from('nfe_order_edit_replacements')
        .select('id,edited_order_data,expected_updated_at,original_order_data').eq('id', replacementId).eq('order_id', doc.order_id)
        .eq('original_document_id', doc.id).eq('environment', doc.ambiente)
        .eq('reversal_kind', 'cancel').eq('status', 'awaiting_reversal').maybeSingle();
      if (error || !replacement || linkedOrder?.status !== 'scheduled' ||
        new Date(linkedOrder.updated_at).getTime() !== new Date(replacement.expected_updated_at).getTime())
        return res.status(409).json({ success: false, error: 'Substituição fiscal não registrada ou pedido indisponível.' });
      proposedOrder = replacement.edited_order_data;
      orderEditVersion = replacement.expected_updated_at;
    }

    const { data: priorEvents, error: priorError } = await supabase
      .from('nfe_document_events')
      .select('id,status,cstat,xmotivo,protocol_number,requested_at,attempt_number')
      .eq('document_id', doc.id)
      .eq('event_type', '110111')
      .order('attempt_number', { ascending: false });
    if (priorError)
      return res
        .status(503)
        .json({ success: false, error: 'Não foi possível conferir eventos fiscais anteriores.' });
    const priorEvent = priorEvents?.[0];
    const recordPreflightFailure = async (message: string) => {
      if (!['cancelled', 'cancelado'].includes(commercialOrderStatus || '')) return;
      await supabase.from('nfe_document_events').insert({
        document_id: doc.id,
        event_type: '110111',
        event_sequence: 1,
        attempt_number: Number(priorEvent?.attempt_number || 0) + 1,
        environment: Number(doc.ambiente),
        status: 'rejected',
        justification: reason,
        signed_xml: '',
        xmotivo: `Falha local antes do envio à SEFAZ: ${message}`.slice(0, 1000),
        requested_by: fiscalAuthorization.userId,
      });
    };
    if (priorEvent) {
      if (
        priorEvent.status === 'transmitting' &&
        Date.now() - new Date(priorEvent.requested_at).getTime() < 30_000
      ) {
        return res.status(202).json({
          success: false,
          pending: true,
          error:
            'A transmissão anterior ainda pode estar em andamento; aguarde antes de consultar novamente.',
        });
      }
      // Timeout/rejeição nunca autoriza reenvio por si só: consulte a situação atual na SEFAZ.
      const pfx = process.env.NFE_CERTIFICATE_BASE64;
      const password = process.env.NFE_CERTIFICATE_PASSWORD;
      if (!pfx)
        return res.status(503).json({
          success: false,
          pending: true,
          error: 'Certificado indisponível para reconciliar; nenhum novo evento foi enviado.',
        });
      const certificate = extractCertificateAndKey(pfx, password || '');
      const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${Number(doc.ambiente)}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
      const consultationStartedAt = new Date().toISOString();
      let situationXml: string;
      try {
        situationXml = await sendSoapToSefaz({
          url: getNfeServiceEndpoint(
            String(doc.modelo),
            Number(doc.ambiente),
            'NFeConsultaProtocolo4'
          ),
          action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
          serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
          xmlPayload: queryXml,
          certPem: certificate.certPem,
          privateKeyPem: certificate.privateKeyPem,
        });
      } catch {
        return res.status(502).json({
          success: false,
          pending: true,
          error:
            'Consulta SEFAZ falhou; resultado continua incerto e nenhum novo evento foi transmitido.',
        });
      }
      const situation = parseSefazNfeSituation(situationXml);
      if (
        ['authorized', 'cancelled'].includes(situation.state) &&
        !matchesConsultedDocument(situationXml, doc, situation.state === 'cancelled' ? '101' : '100')
      ) {
        return res.status(202).json({
          success: false,
          pending: true,
          reconciliationRequired: true,
          error: 'Consulta sem identidade fiscal correspondente. Nenhum documento foi alterado ou evento retransmitido.',
        });
      }
      const recoveryDecision = decideCancellationRecovery(priorEvent.status, situation.state);
      if (recoveryDecision === 'already_cancelled') {
        const persisted = await persistCancellationResult(supabase, doc, priorEvent.id, situationXml);
        return res.status(persisted.status).json(persisted.body);
      }
      if (recoveryDecision === 'retry_after_authorized_consult' && priorEvent.status !== 'rejected') {
        const { error } = await supabase.rpc('persist_nfe_cancellation_result', {
          p_document_id: doc.id, p_event_id: priorEvent.id, p_environment: Number(doc.ambiente),
          p_status: 'rejected', p_response_xml: situationXml, p_cstat: '100',
          p_reason: 'Consulta confirmou autorização ativa sem cancelamento registrado.',
          p_protocol: null, p_protocol_date: null,
          p_consultation_started_at: consultationStartedAt,
        });
        if (error) return res.status(503).json({ success: false, pending: true,
          error: 'Não foi possível reconciliar a tentativa anterior. Nenhum evento foi reenviado.' });
      }
      if (recoveryDecision === 'still_uncertain')
        return res.status(202).json({
          success: false,
          pending: true,
          cStat: situation.cStat,
          error:
            'A consulta não confirmou nem cancelamento nem autorização ativa. Nenhum novo evento foi enviado.',
        });
      if (recoveryDecision === 'manual_reconciliation')
        return res.status(409).json({
          success: false,
          pending: true,
          cStat: situation.cStat,
          error:
            'O histórico local já registra evento aceito, mas a consulta ainda não o reflete. Não retransmita; reconciliação fiscal necessária.',
        });
    }
    if (viaOrderEdit) {
      if (String(linkedOrder?.updated_at || '') !== orderEditVersion)
        return res.status(409).json({
          success: false,
          error: 'O pedido foi alterado desde a conferência. Confira novamente os dados antes de cancelar a nota.',
        });

      const currentOrderData = (linkedOrder?.order_data || {}) as Record<string, any>;
      const proposedOrderData = projectOrderDataForFiscalEdit(
        currentOrderData,
        proposedOrder as Record<string, any>
      );
      if (!replacementId && !hasPotentialFiscalOrderEdit(currentOrderData, proposedOrderData))
        return res.status(409).json({
          success: false,
          error: 'A edição proposta não altera dados fiscais; a nota não será cancelada.',
        });

      const { data: pendingDocuments, error: pendingDocumentsError } = await supabase
        .from('nfe_documents')
        .select('id,status')
        .eq('order_id', doc.order_id)
        .in('status', ['processando', 'pendente', 'unknown', 'transmitting']);
      if (pendingDocumentsError)
        return res.status(503).json({
          success: false,
          error: 'Não foi possível verificar tentativas fiscais em andamento para o pedido.',
        });
      if (pendingDocuments?.length)
        return res.status(409).json({
          success: false,
          pending: true,
          error: 'Existe uma tentativa fiscal sem resultado confirmado. Consulte a SEFAZ antes de alterar o pedido.',
        });

      const { data: snapshotRow, error: snapshotError } = await supabase
        .from('nfe_fiscal_snapshots')
        .select('snapshot_data')
        .eq('emission_request_id', doc.emission_request_id)
        .eq('order_id', doc.order_id)
        .maybeSingle();
      if (snapshotError || !snapshotRow?.snapshot_data)
        return res.status(409).json({
          success: false,
          error: 'Não existe fotografia fiscal imutável para validar o cancelamento desta edição.',
        });
      try {
        const snapshot = snapshotRow.snapshot_data as FiscalSnapshotCandidate;
        const fiscalDocument = assertAuthorizedFiscalSnapshot(
          snapshot,
          doc as AuthorizedFiscalDocumentForEdit
        );
        const changes = findFiscalOrderEditChanges(snapshot, proposedOrderData, fiscalDocument);
        if (!changes.length)
          return res.status(409).json({
            success: false,
            error: 'O pedido proposto corresponde ao XML autorizado; a nota não será cancelada.',
          });
      } catch (error) {
        return res.status(409).json({
          success: false,
          error: error instanceof Error
            ? error.message
            : 'Não foi possível validar a edição contra o XML autorizado.',
        });
      }
    }
    if (physicalCirculationConfirmed) {
      return res.status(409).json({
        success: false,
        error:
          'Há confirmação de circulação/entrega. A NF-e original deve permanecer válida; siga o fluxo fiscal de devolução.',
      });
    }
    if (
      !viaOrderEdit &&
      doc.order_id &&
      !['cancelled', 'cancelado'].includes(commercialOrderStatus || '')
    )
      return res.status(409).json({
        success: false,
        error:
          'A operação comercial do pedido vinculado ainda não foi cancelada; nenhum evento fiscal foi transmitido.',
      });
    const authorizedAt = getAuthorizedAt(String(doc.xml_protocolo || ''), '');
    const cancellationPolicy = getFiscalCancellationPolicy({
      model: String(doc.modelo),
      authorizedAt,
      status: String(doc.status),
      environment: Number(doc.ambiente) as 1 | 2,
      goodsCirculated: physicalCirculationConfirmed,
      operationDidNotOccur: true,
      issuerUf: String(doc.chave_acesso || '').slice(0, 2) === '41' ? 'PR' : '',
    });
    if (cancellationPolicy.action !== 'cancel') {
      return res.status(409).json({
        success: false,
        error:
          cancellationPolicy.reason ||
          (String(doc.modelo) === '65'
            ? 'Prazo de cancelamento da NFC-e (30 minutos no Paraná) ultrapassado.'
            : 'Prazo de cancelamento da NF-e (168 horas no Paraná) ultrapassado.'),
      });
    }

    const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
    const pfxPassword = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfxBase64) {
      await recordPreflightFailure('Certificado digital do emitente não configurado.');
      return res
        .status(503)
        .json({ success: false, error: 'Certificado digital do emitente não configurado.' });
    }
    let certificate: ReturnType<typeof extractCertificateAndKey>;
    try {
      certificate = extractCertificateAndKey(pfxBase64, pfxPassword || '');
    } catch {
      await recordPreflightFailure('Não foi possível carregar o certificado digital do emitente.');
      return res.status(503).json({ success: false, error: 'Não foi possível carregar o certificado digital do emitente.' });
    }
    const issuerCnpj = doc.xml_nfe.match(/<emit\b[^>]*>[\s\S]*?<CNPJ>([A-Z0-9]{12}[0-9]{2})<\/CNPJ>/i)?.[1];
    if (!issuerCnpj) {
      await recordPreflightFailure('CNPJ do emitente não encontrado no XML original.');
      return res
        .status(409)
        .json({ success: false, error: 'CNPJ do emitente não encontrado no XML original.' });
    }
    const environment = Number(doc.ambiente);
    const timestamp = formatNfeDateTime(new Date());
    const eventXml = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${Date.now().toString().slice(-15)}</idLote><evento versao="1.00"><infEvento Id="ID110111${doc.chave_acesso}01"><cOrgao>41</cOrgao><tpAmb>${environment}</tpAmb><CNPJ>${issuerCnpj}</CNPJ><chNFe>${doc.chave_acesso}</chNFe><dhEvento>${timestamp}</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>${escapeXml(String(doc.numero_protocolo))}</nProt><xJust>${escapeXml(reason)}</xJust></detEvento></infEvento></evento></envEvento>`;
    const signedXml = signNfeEventXml(
      eventXml,
      certificate.privateKeyPem,
      certificate.certDerBase64
    );
    try {
      await validateCancellationAgainstOfficialSchema(signedXml, {
        accessKey: doc.chave_acesso, environment, protocol: doc.numero_protocolo,
      });
    } catch {
      return res.status(422).json({
        success: false, code: 'CANCELLATION_XML_INVALID',
        error: 'XML de cancelamento inválido. Nenhum evento foi transmitido.',
      });
    }
    const { data: reservation, error: reserveError } = await supabase.rpc('reserve_nfe_cancellation_event', {
      p_document_id: doc.id, p_environment: environment, p_signed_xml: signedXml,
      p_reason: reason, p_user_id: fiscalAuthorization.userId, p_previous_event_id: priorEvent?.id || null,
    });
    const event = reservation?.eventId ? { id: reservation.eventId } : null;
    if (reserveError || !event?.id) {
      return res.status(409).json({
        success: false,
        pending: true,
        error:
          'Outra solicitação pode já estar em andamento. Confira os eventos fiscais antes de repetir.',
      });
    }

    let responseXml: string;
    try {
      const url = getNfeServiceEndpoint(
        String(doc.modelo),
        environment,
        'NFeRecepcaoEvento4'
      );
      responseXml = await sendSoapToSefaz({
        url,
        action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento',
        serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4',
        xmlPayload: signedXml,
        certPem: certificate.certPem,
        privateKeyPem: certificate.privateKeyPem,
      });
    } catch {
      // The same transactional writer protects a confirmation from a concurrent
      // consultation. Failure here leaves the original transmitting attempt intact.
      await persistCancellationResult(supabase, doc, event.id, '');
      return res.status(502).json({
        success: false,
        pending: true,
        error: 'Resultado incerto após envio à SEFAZ. Não reenvie; consulte a situação fiscal.',
      });
    }

    const persisted = await persistCancellationResult(supabase, doc, event.id, responseXml);
    return res.status(persisted.status).json(persisted.body);
  } catch (error: any) {
    console.error(
      '[NF-e Cancel] Falha no fluxo de cancelamento fiscal:',
      error?.message || 'erro desconhecido'
    );
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar o evento fiscal de cancelamento.',
    });
  }
}
