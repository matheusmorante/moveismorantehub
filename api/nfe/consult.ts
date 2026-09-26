import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractCertificateAndKey } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import { parseSefazNfeSituation } from '../../erp/src/pages/utils/nfe/nfeEventRules';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const endpoints = {
    '55': {
        1: 'https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
        2: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
    },
    '65': {
        1: 'https://nfce.sefa.pr.gov.br/nfce/NFeConsultaProtocolo4',
        2: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeConsultaProtocolo4',
    },
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido.' });
    if (!serviceKey) return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ success: false, error: 'Autenticação necessária.' });
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return res.status(401).json({ success: false, error: 'Sessão inválida.' });

    const documentId = String(req.body?.documentId || '');
    if (!documentId) return res.status(400).json({ success: false, error: 'Documento fiscal não informado.' });
    try {
        const { data: doc, error } = await supabase.from('nfe_documents').select('*').eq('id', documentId).maybeSingle();
        if (error || !doc) return res.status(404).json({ success: false, error: 'Documento fiscal não encontrado.' });
        const model = String(doc.modelo) as '55' | '65';
        const environment = Number(doc.ambiente) as 1 | 2;
        const accessKey = String(doc.chave_acesso || '');
        if (!(model in endpoints) || ![1, 2].includes(environment) || !/^\d{44}$/.test(accessKey)) {
            return res.status(409).json({ success: false, error: 'Modelo, ambiente ou chave de acesso inválidos.' });
        }
        const { data: settingsRow, error: settingsError } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
        if (settingsError) return res.status(503).json({ success: false, error: 'Não foi possível carregar a configuração fiscal.' });
        const settings = settingsRow?.data || settingsRow || {};
        const pfx = settings.certificateBase64 || process.env.NFE_CERTIFICATE_BASE64;
        const password = settings.certificatePassword || process.env.NFE_CERTIFICATE_PASSWORD;
        if (!pfx) return res.status(503).json({ success: false, error: 'Certificado digital do emitente não configurado.' });
        const certificate = extractCertificateAndKey(pfx, password || '');
        const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
        const responseXml = await sendSoapToSefaz({
            url: endpoints[model][environment],
            action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
            serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
            xmlPayload: queryXml,
            certPem: certificate.certPem,
            privateKeyPem: certificate.privateKeyPem,
        });
        const situation = parseSefazNfeSituation(responseXml);
        if (situation.state === 'unknown') {
            return res.status(502).json({ success: false, pending: true, cStat: situation.cStat, xMotivo: situation.xMotivo || 'A consulta não confirmou a situação atual.' });
        }
        if (situation.state === 'cancelled') {
            const cancellation = situation.cancellationEventXml || '';
            const readTag = (xml: string, tag: string) => xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.replace(/<[^>]+>/g, '').trim() || null;
            const protocolNumber = readTag(cancellation, 'nProt');
            const protocolDate = readTag(cancellation, 'dhRegEvento');
            const { data: event } = await supabase.from('nfe_document_events').select('id').eq('document_id', doc.id).eq('event_type', '110111').order('requested_at', { ascending: false }).limit(1).maybeSingle();
            if (event?.id) await supabase.from('nfe_document_events').update({ status: 'registered', response_xml: responseXml, cstat: '135', xmotivo: situation.xMotivo, protocol_number: protocolNumber, protocol_date: protocolDate, confirmed_at: new Date().toISOString() }).eq('id', event.id);
            const { error: updateError } = await supabase.from('nfe_documents').update({ status: 'cancelada', motivo_status: situation.xMotivo || 'Cancelamento confirmado em consulta à SEFAZ.', updated_at: new Date().toISOString() }).eq('id', doc.id).in('status', ['autorizada', 'homologada', 'pendente', 'processando']);
            return res.status(200).json({ success: true, state: 'cancelled', cStat: situation.cStat, xMotivo: situation.xMotivo, protocolNumber, reconciliationRequired: Boolean(updateError) });
        }
        const protocolBlock = responseXml.match(/<infProt\b[^>]*>[\s\S]*?<\/infProt>/i)?.[0] || responseXml;
        const protocolNumber = protocolBlock.match(/<nProt>([^<]+)<\/nProt>/i)?.[1]?.trim() || null;
        const protocolDate = protocolBlock.match(/<dhRecbto>([^<]+)<\/dhRecbto>/i)?.[1]?.trim() || null;
        const { error: documentSyncError } = await supabase.from('nfe_documents').update({
            status: environment === 2 ? 'homologada' : 'autorizada',
            motivo_status: situation.xMotivo || 'Autorização confirmada em consulta à SEFAZ.',
            numero_protocolo: protocolNumber || doc.numero_protocolo,
            xml_protocolo: responseXml,
            updated_at: new Date().toISOString(),
        }).eq('id', doc.id).in('status', ['pendente', 'processando', 'erro']);
        return res.status(200).json({ success: true, state: 'authorized', cStat: situation.cStat,
            xMotivo: situation.xMotivo, protocolNumber, protocolDate,
            reconciliationRequired: Boolean(documentSyncError) });
    } catch (err: any) {
        console.error('[NF-e Consult] Falha na consulta SEFAZ:', err?.message || 'erro desconhecido');
        return res.status(502).json({ success: false, pending: true, error: 'Não foi possível confirmar a situação do documento na SEFAZ. Nenhum novo evento foi enviado.' });
    }
}
