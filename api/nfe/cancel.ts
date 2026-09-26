import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractCertificateAndKey, signNfeEventXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import { decideCancellationRecovery, getAuthorizedAt, getCancellationWindow, parseSefazCancellationEvent, parseSefazNfeSituation, validateCancellationReason } from '../../erp/src/pages/utils/nfe/nfeEventRules';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const EVENT_ENDPOINTS = {
    '55': {
        1: 'https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4',
        2: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4',
    },
    '65': {
        1: 'https://nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4',
        2: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4',
    },
} as const;

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[character] as string));

const valueIn = (xml: string, tag: string) =>
    xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, 'i'))?.[1]?.trim() || null;

const orderShowsPhysicalCirculation = (row: any, model: string) => {
    const data = row?.order_data || {};
    const shipping = data.shipping || {};
    const deliveryStatus = String(row?.delivery_status || shipping.deliveryStatus || '').toLowerCase();
    const physicalStatuses = ['in_transit', 'in-transit', 'delivered', 'completed', 'finished', 'collected', 'em_transito', 'entregue', 'concluido', 'coletado'];
    if (physicalStatuses.some((status) => deliveryStatus.includes(status))) return true;
    if (shipping.deliveryStartedAt || shipping.deliveryArrivedAt || shipping.deliveryFinishedAt ||
        shipping.unattendedAt || shipping.pickupConfirmedAt || data.deliveryFinishedAt || data.pickupConfirmedAt) return true;
    const deliveryMethod = String(row?.delivery_method || shipping.deliveryMethod || '').toLowerCase();
    return model === '65' && deliveryMethod === 'pickup' && row?.status === 'fulfilled';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido.' });
    if (!supabaseServiceKey) return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível: credencial segura do banco não configurada.' });

    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ success: false, error: 'Autenticação necessária.' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return res.status(401).json({ success: false, error: 'Sessão inválida.' });

    const documentId = String(req.body?.documentId || '');
    const reason = String(req.body?.reason || '').trim();
    const reasonError = validateCancellationReason(reason);
    if (!documentId || reasonError) return res.status(400).json({ success: false, error: reasonError || 'Documento fiscal não informado.' });

    try {
        const { data: doc, error: docError } = await supabase.from('nfe_documents').select('*').eq('id', documentId).maybeSingle();
        if (docError || !doc) return res.status(404).json({ success: false, error: 'Documento fiscal não encontrado.' });
        if (!['autorizada', 'homologada'].includes(doc.status)) return res.status(409).json({ success: false, error: 'Somente documento autorizado pode receber evento de cancelamento.' });
        if (!['55', '65'].includes(String(doc.modelo)) || ![1, 2].includes(Number(doc.ambiente)) || !/^\d{44}$/.test(String(doc.chave_acesso || ''))) {
            return res.status(409).json({ success: false, error: 'Modelo, ambiente ou chave de acesso do documento inválidos.' });
        }
        if (Number(doc.ambiente) === 1 && req.body?.productionConfirmed !== true) {
            return res.status(400).json({ success: false, error: 'Confirme explicitamente o cancelamento em Produção.' });
        }
        if (!doc.numero_protocolo || !doc.xml_nfe) return res.status(409).json({ success: false, error: 'A nota não contém XML autorizado e protocolo original para referenciar o evento.' });

        if (!doc.order_id) return res.status(409).json({ success: false, error: 'Documento sem vínculo com o pedido; não é possível comprovar se a mercadoria circulou.' });
        let physicalCirculationConfirmed = false;
        if (doc.order_id) {
            const { data: order, error: orderError } = await supabase.from('orders')
                .select('status,delivery_status,delivery_method,order_data').eq('id', doc.order_id).maybeSingle();
            if (orderError) return res.status(503).json({ success: false, error: 'Não foi possível verificar a circulação da mercadoria.' });
            physicalCirculationConfirmed = orderShowsPhysicalCirculation(order, String(doc.modelo));
        }

        const { data: priorEvents, error: priorError } = await supabase.from('nfe_document_events')
            .select('id,status,cstat,xmotivo,protocol_number,requested_at,attempt_number').eq('document_id', doc.id).eq('event_type', '110111').order('attempt_number', { ascending: false });
        if (priorError) return res.status(503).json({ success: false, error: 'Não foi possível conferir eventos fiscais anteriores.' });
        const priorEvent = priorEvents?.[0];
        if (priorEvent) {
            if (priorEvent.status === 'transmitting' && Date.now() - new Date(priorEvent.requested_at).getTime() < 30_000) {
                return res.status(202).json({ success: false, pending: true, error: 'A transmissão anterior ainda pode estar em andamento; aguarde antes de consultar novamente.' });
            }
            // Timeout/rejeição nunca autoriza reenvio por si só: consulte a situação atual na SEFAZ.
            const { data: settingsRow, error: settingsError } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
            if (settingsError) return res.status(503).json({ success: false, pending: true, error: 'Não foi possível carregar a configuração para consultar a SEFAZ.' });
            const settings = settingsRow?.data || settingsRow || {};
            const pfx = settings.certificateBase64 || process.env.NFE_CERTIFICATE_BASE64;
            const password = settings.certificatePassword || process.env.NFE_CERTIFICATE_PASSWORD;
            if (!pfx) return res.status(503).json({ success: false, pending: true, error: 'Certificado indisponível para reconciliar; nenhum novo evento foi enviado.' });
            const certificate = extractCertificateAndKey(pfx, password || '');
            const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${Number(doc.ambiente)}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
            let situationXml: string;
            try {
                situationXml = await sendSoapToSefaz({
                    url: String(doc.modelo) === '65'
                        ? (Number(doc.ambiente) === 1 ? 'https://nfce.sefa.pr.gov.br/nfce/NFeConsultaProtocolo4' : 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeConsultaProtocolo4')
                        : (Number(doc.ambiente) === 1 ? 'https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4' : 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4'),
                    action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
                    serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
                    xmlPayload: queryXml, certPem: certificate.certPem, privateKeyPem: certificate.privateKeyPem,
                });
            } catch {
                return res.status(502).json({ success: false, pending: true, error: 'Consulta SEFAZ falhou; resultado continua incerto e nenhum novo evento foi transmitido.' });
            }
            const situation = parseSefazNfeSituation(situationXml);
            const recoveryDecision = decideCancellationRecovery(priorEvent.status, situation.state);
            if (recoveryDecision === 'already_cancelled') {
                const { error: eventUpdateError } = await supabase.from('nfe_document_events').update({ status: 'registered', response_xml: situationXml, cstat: situation.cStat, xmotivo: situation.xMotivo, confirmed_at: new Date().toISOString() }).eq('id', priorEvent.id);
                const { error: docUpdateError } = await supabase.from('nfe_documents').update({ status: 'cancelada', motivo_status: situation.xMotivo || 'Cancelamento confirmado em consulta à SEFAZ.', updated_at: new Date().toISOString() }).eq('id', doc.id).in('status', ['autorizada', 'homologada']);
                return res.status(200).json({ success: !eventUpdateError && !docUpdateError, status: 'cancelada', cStat: situation.cStat, xMotivo: situation.xMotivo, reconciliationRequired: Boolean(eventUpdateError || docUpdateError) });
            }
            if (recoveryDecision === 'still_uncertain') return res.status(202).json({ success: false, pending: true, cStat: situation.cStat, error: 'A consulta não confirmou nem cancelamento nem autorização ativa. Nenhum novo evento foi enviado.' });
            if (recoveryDecision === 'manual_reconciliation') return res.status(409).json({ success: false, pending: true, cStat: situation.cStat, error: 'O histórico local já registra evento aceito, mas a consulta ainda não o reflete. Não retransmita; reconciliação fiscal necessária.' });
        }
        if (physicalCirculationConfirmed) {
            return res.status(409).json({ success: false, error: 'Há confirmação de circulação/entrega. A NF-e original deve permanecer válida; siga o fluxo fiscal de devolução.' });
        }
        const authorizedAt = getAuthorizedAt(String(doc.xml_protocolo || ''), doc.created_at);
        const cancellationWindow = getCancellationWindow(String(doc.modelo), authorizedAt);
        if (!cancellationWindow.valid || cancellationWindow.expired) {
            return res.status(409).json({ success: false, error: String(doc.modelo) === '65'
                ? 'Prazo de cancelamento da NFC-e (30 minutos no Paraná) ultrapassado.'
                : 'Prazo de cancelamento da NF-e (168 horas no Paraná) ultrapassado.' });
        }

        const { data: settingsRow, error: settingsError } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
        if (settingsError) return res.status(503).json({ success: false, error: 'Não foi possível carregar a configuração fiscal.' });
        const settings = settingsRow?.data || settingsRow || {};
        const pfxBase64 = settings.certificateBase64 || process.env.NFE_CERTIFICATE_BASE64;
        const pfxPassword = settings.certificatePassword || process.env.NFE_CERTIFICATE_PASSWORD;
        if (!pfxBase64) return res.status(503).json({ success: false, error: 'Certificado digital do emitente não configurado.' });
        const certificate = extractCertificateAndKey(pfxBase64, pfxPassword || '');
        const issuerCnpj = doc.xml_nfe.match(/<emit\b[^>]*>[\s\S]*?<CNPJ>(\d{14})<\/CNPJ>/i)?.[1];
        if (!issuerCnpj) return res.status(409).json({ success: false, error: 'CNPJ do emitente não encontrado no XML original.' });
        const environment = Number(doc.ambiente);
        const timestamp = new Date().toISOString();
        const eventXml = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${Date.now().toString().slice(-15)}</idLote><evento versao="1.00"><infEvento Id="ID110111${doc.chave_acesso}01"><cOrgao>41</cOrgao><tpAmb>${environment}</tpAmb><CNPJ>${issuerCnpj}</CNPJ><chNFe>${doc.chave_acesso}</chNFe><dhEvento>${timestamp}</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>${escapeXml(String(doc.numero_protocolo))}</nProt><xJust>${escapeXml(reason)}</xJust></detEvento></infEvento></evento></envEvento>`;
        const signedXml = signNfeEventXml(eventXml, certificate.privateKeyPem, certificate.certDerBase64);
        const { data: event, error: reserveError } = await supabase.from('nfe_document_events').insert({
            document_id: doc.id, event_type: '110111', event_sequence: 1, attempt_number: (priorEvent?.attempt_number || 0) + 1, environment,
            status: 'transmitting', justification: reason, signed_xml: signedXml, requested_by: auth.user.id,
        }).select('id').single();
        if (reserveError || !event?.id) {
            return res.status(409).json({ success: false, pending: true, error: 'Outra solicitação pode já estar em andamento. Confira os eventos fiscais antes de repetir.' });
        }

        let responseXml: string;
        try {
            const url = EVENT_ENDPOINTS[String(doc.modelo) as '55' | '65'][environment as 1 | 2];
            responseXml = await sendSoapToSefaz({
                url,
                action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento',
                serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4',
                xmlPayload: signedXml,
                certPem: certificate.certPem,
                privateKeyPem: certificate.privateKeyPem,
            });
        } catch (error: any) {
            await supabase.from('nfe_document_events').update({ status: 'unknown', xmotivo: 'Transmissão iniciada, mas a resposta da SEFAZ não foi confirmada.' }).eq('id', event.id);
            return res.status(502).json({ success: false, pending: true, error: 'Resultado incerto após envio à SEFAZ. Não reenvie; consulte a situação fiscal.' });
        }

        const result = parseSefazCancellationEvent(responseXml);
        const eventStatus = result.registered ? 'registered' : result.pending ? 'unknown' : 'rejected';
        const { error: eventUpdateError } = await supabase.from('nfe_document_events').update({
            status: eventStatus, response_xml: responseXml, cstat: result.cStat, xmotivo: result.xMotivo,
            protocol_number: result.protocolNumber, protocol_date: result.protocolDate,
            confirmed_at: result.registered ? new Date().toISOString() : null,
        }).eq('id', event.id);
        if (eventUpdateError) return res.status(503).json({ success: result.registered, pending: result.registered, error: result.registered
            ? 'SEFAZ confirmou o cancelamento, mas a atualização do histórico local precisa de reconciliação.'
            : 'Não foi possível persistir o retorno fiscal.' });
        if (!result.registered) return res.status(result.pending ? 202 : 422).json({ success: false, pending: result.pending,
            cStat: result.cStat, xMotivo: result.xMotivo || 'A SEFAZ não confirmou o cancelamento.' });

        const { error: documentUpdateError } = await supabase.from('nfe_documents').update({
            status: 'cancelada', motivo_status: result.xMotivo || 'Cancelamento registrado pela SEFAZ.',
            updated_at: new Date().toISOString(),
        }).eq('id', doc.id).in('status', ['autorizada', 'homologada']);
        return res.status(200).json({ success: true, status: 'cancelada', cStat: result.cStat,
            xMotivo: result.xMotivo, protocolNumber: result.protocolNumber,
            reconciliationRequired: Boolean(documentUpdateError) });
    } catch (error: any) {
        console.error('[NF-e Cancel] Falha no fluxo de cancelamento fiscal:', error?.message || 'erro desconhecido');
        return res.status(500).json({ success: false, error: 'Erro interno ao processar o evento fiscal de cancelamento.' });
    }
}
