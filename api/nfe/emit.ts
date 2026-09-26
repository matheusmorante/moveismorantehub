import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { parseAuthorizedInvoiceLines } from '../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import { validateOrdinaryOutboundEnvelope } from '../../erp/src/pages/utils/nfe/fiscalEnvelope';
import type { FiscalDatabase } from './fiscalDatabaseTypes';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Endpoints Oficiais SEFAZ-PR Homologação e Produção
const SEFAZ_PR_URLS = {
    homologacao: {
        '55': 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
        '65': 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
    },
    producao: {
        '55': 'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
        '65': 'https://nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    let supabase: ReturnType<typeof createClient<FiscalDatabase>> | undefined;
    let reservedDocumentId: string | undefined;
    let transmissionStarted = false;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { xml, environment, orderId, nfeNumber, series, model, accessKey, productionConfirmed, emissionRequestId } = req.body;

        if (!xml) {
            return res.status(400).json({ error: 'XML da NF-e não fornecido no payload.' });
        }

        const selectedEnvironment = Number(environment);
        const xmlEnvironment = String(xml).match(/<tpAmb>(\d+)<\/tpAmb>/)?.[1];
        const xmlModel = String(xml).match(/<mod>(\d+)<\/mod>/)?.[1];
        if (![1, 2].includes(selectedEnvironment) || !['55', '65'].includes(String(model)) ||
            xmlEnvironment !== String(selectedEnvironment) || xmlModel !== String(model) ||
            !orderId || !nfeNumber || !/^\d{44}$/.test(String(accessKey)) ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(emissionRequestId || ''))) {
            return res.status(400).json({ success: false, error: 'Dados da emissão incompletos ou ambiente inválido.' });
        }
        const envelopeError = validateOrdinaryOutboundEnvelope({
            xml: String(xml), accessKey: String(accessKey), model: String(model) as '55' | '65',
            environment: selectedEnvironment as 1 | 2, nfeNumber: Number(nfeNumber), series: String(series || '1'),
        });
        if (envelopeError) return res.status(400).json({ success: false, error: envelopeError });

        // 1. Obter configurações fiscais e certificado do banco
        if (!supabaseServiceKey) return res.status(503).json({ success: false, error: 'Serviço fiscal sem credencial segura do banco.' });
        supabase = createClient<FiscalDatabase>(supabaseUrl, supabaseServiceKey);
        const authorization = String(req.headers.authorization || '');
        const token = authorization.replace(/^Bearer\s+/i, '');
        if (!token) return res.status(401).json({ success: false, error: 'Autenticação necessária para emitir documento fiscal.' });
        const { data: authenticated, error: authenticationError } = await supabase.auth.getUser(token);
        if (authenticationError || !authenticated.user) return res.status(401).json({ success: false, error: 'Sessão inválida. Entre novamente para emitir.' });
        if (selectedEnvironment === 1 && productionConfirmed !== true) return res.status(400).json({ success: false, error: 'Confirmação explícita de Produção ausente.' });
        const { data: orderRow, error: orderError } = await supabase.from('orders')
            .select('id,order_type,status').eq('id', String(orderId)).maybeSingle();
        if (orderError || !orderRow) return res.status(404).json({ success: false, error: 'Pedido não encontrado para emissão fiscal.' });
        if (!['sale', 'showroom'].includes(String(orderRow.order_type)) || ['cancelled', 'cancelado'].includes(String(orderRow.status).toLowerCase())) {
            return res.status(409).json({ success: false, error: 'A emissão de saída só pode ser solicitada para pedido comercial válido. Devoluções e estornos usam o fluxo fiscal próprio.' });
        }
        const { data: sameRequest, error: sameRequestError } = await supabase.from('nfe_documents')
            .select('id,status,chave_acesso,numero_protocolo,xml_protocolo,order_id,modelo,ambiente')
            .eq('emission_request_id', emissionRequestId).maybeSingle();
        if (sameRequestError) return res.status(503).json({ success: false, error: 'Não foi possível conferir esta tentativa de emissão.' });
        if (sameRequest) {
            if (sameRequest.order_id !== orderId || sameRequest.modelo !== String(model) || Number(sameRequest.ambiente) !== selectedEnvironment || sameRequest.chave_acesso !== String(accessKey)) {
                return res.status(409).json({ success: false, error: 'Chave idempotente reutilizada com dados fiscais diferentes.' });
            }
            const isAuthorized = ['autorizada', 'homologada'].includes(sameRequest.status);
            const isPending = ['pendente', 'processando'].includes(sameRequest.status);
            return res.status(isAuthorized ? 200 : isPending ? 202 : 409).json({
                success: isAuthorized, pending: isPending, documentId: sameRequest.id,
                accessKey: sameRequest.chave_acesso, protocolNumber: sameRequest.numero_protocolo,
                error: isAuthorized ? undefined : `Esta tentativa fiscal já está ${sameRequest.status}; não retransmita.`
            });
        }
        const activeStatuses = ['pendente', 'processando'];
        const { data: existing, error: existingError } = await supabase.from('nfe_documents')
            .select('id,status,chave_acesso,numero_protocolo,motivo_status')
            .eq('order_id', orderId).eq('modelo', String(model)).eq('ambiente', selectedEnvironment).eq('document_type', 'outbound').in('status', activeStatuses).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (existingError) return res.status(503).json({ success: false, error: 'Não foi possível conferir emissões anteriores. Tente novamente mais tarde.' });
        if (existing) return res.status(409).json({ success: false, pending: ['pendente', 'processando'].includes(existing.status), error: `Este pedido já possui documento fiscal ${existing.status}. Consulte o documento antes de tentar novamente.`, accessKey: existing.chave_acesso, protocolNumber: existing.numero_protocolo });

        const reservation = {
            order_id: orderId, numero_nfe: nfeNumber, serie: String(series || '1'), chave_acesso: accessKey,
            modelo: String(model), ambiente: selectedEnvironment, status: 'processando',
            document_type: 'outbound', finalidade: 1, emission_request_id: emissionRequestId,
            motivo_status: 'Transmissão em andamento', xml_nfe: xml,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        const { data: reserved, error: reservationError } = await supabase.from('nfe_documents').insert(reservation).select('id').single();
        if (reservationError) {
            if (reservationError.code === '23505') return res.status(409).json({ success: false, pending: true, error: 'Já existe uma emissão em andamento ou confirmada para este pedido.' });
            return res.status(503).json({ success: false, error: 'Não foi possível reservar a emissão fiscal. Nenhuma nota foi enviada.' });
        }
        if (!reserved?.id) return res.status(503).json({ success: false, error: 'Não foi possível confirmar a reserva fiscal. Nenhuma nota foi enviada.' });
        const documentId = reserved.id;
        reservedDocumentId = documentId;

        // 2. Obter configurações fiscais e certificado do banco
        const { data: settingsRow, error: settingsErr } = await supabase
            .from('settings')
            .select('*')
            .eq('id', 'app')
            .maybeSingle();

        if (settingsErr) throw new Error('Não foi possível carregar a configuração fiscal da empresa.');
        const settings: Record<string, unknown> = settingsRow?.data || settingsRow || {};
        const pfxBase64 = (typeof settings.certificateBase64 === 'string' ? settings.certificateBase64 : '') || process.env.NFE_CERTIFICATE_BASE64;
        const pfxPassword = (typeof settings.certificatePassword === 'string' ? settings.certificatePassword : '') || process.env.NFE_CERTIFICATE_PASSWORD;

        if (!pfxBase64) {
            await supabase.from('nfe_documents').update({ status: 'erro', motivo_status: 'Certificado digital não configurado', updated_at: new Date().toISOString() }).eq('id', documentId);
            return res.status(400).json({
                success: false,
                error: 'Certificado digital (.pfx) não encontrado nas configurações nem nas variáveis de ambiente.',
            });
        }

        // 2. Extrair chaves criptográficas do Certificado A1
        const { privateKeyPem, certPem, certDerBase64 } = extractCertificateAndKey(pfxBase64, pfxPassword || '');

        // 3. Assinar digitalmente o XML (XMLDSig RSA-SHA1)
        const signedXml = signNfeXml(xml, privateKeyPem, certDerBase64);

        // 4. Montar o lote de envio <enviNFe>
        const idLote = String(Date.now()).slice(-15);
        const enviNfeXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${signedXml}</enviNFe>`;

        // 5. Determinar URL da SEFAZ
        const isHomologacao = selectedEnvironment === 2;
        const sefazUrl = isHomologacao
            ? SEFAZ_PR_URLS.homologacao[String(model) as '55' | '65']
            : SEFAZ_PR_URLS.producao[String(model) as '55' | '65'];

        console.log(`[NF-e Emit] Enviando lote ${idLote} para SEFAZ-PR (${isHomologacao ? 'Homologação' : 'Produção'})...`);

        // 6. Transmitir SOAP mTLS para a SEFAZ
        let sefazResponseXml: string;
        try {
            transmissionStarted = true;
            sefazResponseXml = await sendSoapToSefaz({
                url: sefazUrl,
                action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
                xmlPayload: enviNfeXml,
                certPem,
                privateKeyPem,
            });
        } catch (soapErr: any) {
            console.error('[NF-e Emit] Erro na conexão SOAP SEFAZ:', soapErr.message);
            // Falha de rede é ambígua: manter reserva pendente evita uma retransmissão duplicada.
            await supabase.from('nfe_documents').update({ status: 'pendente', motivo_status: `Resultado da transmissão não confirmado: ${soapErr.message}`, xml_nfe: signedXml, updated_at: new Date().toISOString() }).eq('id', documentId);
            return res.status(502).json({
                success: false,
                pending: true,
                signedXml,
                error: `Conexão com SEFAZ-PR: ${soapErr.message}`,
            });
        }

        const parsed = parseSefazAuthorization(sefazResponseXml);
        const documentStatus = parsed.authorized ? (isHomologacao ? 'homologada' : 'autorizada') : parsed.pending ? 'pendente' : 'erro';
        const { error: documentPersistError } = await supabase.from('nfe_documents').update({
            status: documentStatus, motivo_status: parsed.xMotivo || `SEFAZ cStat ${parsed.cStat || 'desconhecido'}`,
            xml_nfe: signedXml, xml_protocolo: sefazResponseXml, numero_protocolo: parsed.protocolNumber || null,
            updated_at: new Date().toISOString(),
        }).eq('id', documentId);

        let fiscalSnapshotSyncError = false;
        if (parsed.authorized) {
            try {
                const invoiceLines = parseAuthorizedInvoiceLines(signedXml);
                const { error: linesError } = await supabase.from('nfe_document_items').upsert(
                    invoiceLines.map((line) => ({
                        document_id: documentId,
                        item_number: line.invoiceItemNumber,
                        product_code: line.productCode,
                        description: line.description,
                        billed_quantity: line.billedQuantity,
                        unit_value: line.unitValue,
                        gross_value: line.grossValue,
                        discount_value: line.discountValue,
                        product_xml: line.productXml,
                        taxes_xml: line.taxesXml,
                    })),
                    { onConflict: 'document_id,item_number' },
                );
                if (linesError) {
                    fiscalSnapshotSyncError = true;
                    console.error('[NF-e Emit] Nota autorizada, mas itens fiscais precisam de reconciliação:', linesError.message);
                }
            } catch (snapshotError: any) {
                fiscalSnapshotSyncError = true;
                console.error('[NF-e Emit] Nota autorizada sem snapshot fiscal de itens:', snapshotError?.message || 'erro de leitura');
            }
        }

        return res.status(200).json({
            success: parsed.authorized,
            pending: parsed.pending,
            cStat: parsed.cStat,
            xMotivo: parsed.xMotivo,
            protocolNumber: parsed.protocolNumber,
            protocolDate: parsed.protocolDate,
            reconciliationRequired: fiscalSnapshotSyncError || Boolean(documentPersistError),
            signedXml,
            sefazResponseXml,
        });
    } catch (err: any) {
        console.error('[NF-e Emit] Erro inesperado:', err);
        if (supabase && reservedDocumentId && !transmissionStarted) {
            await supabase.from('nfe_documents').update({ status: 'erro', motivo_status: 'Falha antes da transmissão à SEFAZ; nenhuma autorização foi confirmada.', updated_at: new Date().toISOString() }).eq('id', reservedDocumentId);
        }
        return res.status(500).json({ error: err.message || 'Erro interno ao processar NF-e.' });
    }
}
