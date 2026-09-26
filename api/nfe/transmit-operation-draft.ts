import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { AppSettings } from '../../erp/src/pages/utils/settingsService';
import { generateNfeAccessKey } from '../../erp/src/pages/utils/nfe/nfeAccessKey';
import { buildReviewedFiscalOperationXml } from '../../erp/src/pages/utils/nfe/fiscalOperationXml';
import { parseAuthorizedInvoiceLines } from '../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { decideOperationDraftRecovery, parseSefazNfeSituation } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { validateNfeAgainstOfficialSchema } from './schemaValidator';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import type { FiscalDatabase } from './fiscalDatabaseTypes';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const authorizationUrls = {
    1: 'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
    2: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
} as const;
const consultationUrls = {
    1: 'https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
    2: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
} as const;
type Environment = 1 | 2;

function brazilTimestamp(now = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
    const local = Date.UTC(Number(value('year')), Number(value('month')) - 1, Number(value('day')),
        Number(value('hour')), Number(value('minute')), Number(value('second')));
    const offsetMinutes = Math.round((local - now.getTime()) / 60_000);
    const sign = offsetMinutes < 0 ? '-' : '+';
    const offset = Math.abs(offsetMinutes);
    return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}${sign}${String(Math.floor(offset / 60)).padStart(2, '0')}:${String(offset % 60).padStart(2, '0')}`;
}

function readTag(xml: string, tag: string): string | null {
    return xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, 'i'))?.[1]?.trim() || null;
}

function asFiscalSettings(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const record = value as Record<string, unknown>;
    const nested = record.data;
    return nested && typeof nested === 'object' && !Array.isArray(nested)
        ? nested as Record<string, unknown>
        : record;
}

function getPersistableItems(signedXml: string, draftLines: Array<Record<string, unknown>>) {
    const parsed = parseAuthorizedInvoiceLines(signedXml);
    if (parsed.length !== draftLines.length) throw new Error('Os itens do XML assinado diferem dos itens revisados.');
    return parsed.map((item, index) => {
        const line = draftLines.find((candidate) => Number(candidate.fiscal_item_number) === item.invoiceItemNumber);
        if (!line || !line.reviewed_product_xml || !line.reviewed_taxes_xml || !line.reviewed_cfop) {
            throw new Error(`Item ${item.invoiceItemNumber} não possui revisão fiscal persistida.`);
        }
        return {
            draft_line_id: String(line.id), item_number: item.invoiceItemNumber,
            product_code: item.productCode, description: item.description,
            quantity: item.billedQuantity, unit_value: item.unitValue,
            gross_value: item.grossValue, discount_value: item.discountValue,
            product_xml: String(line.reviewed_product_xml), taxes_xml: String(line.reviewed_taxes_xml),
        };
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido.' });
    if (!supabaseUrl || !serviceKey) return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

    const token = String(req.headers.authorization || '').replace(/^Bearer\\s+/i, '');
    if (!token) return res.status(401).json({ success: false, error: 'Autenticação necessária.' });
    const db = createClient<FiscalDatabase>(supabaseUrl, serviceKey);
    const { data: session, error: authError } = await db.auth.getUser(token);
    if (authError || !session.user) return res.status(401).json({ success: false, error: 'Sessão inválida.' });
    const draftId = String(req.body?.draftId || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draftId)) {
        return res.status(400).json({ success: false, error: 'Rascunho fiscal inválido.' });
    }

    try {
        const { data: draft, error: draftError } = await db.from('nfe_operation_drafts')
            .select('*').eq('id', draftId).maybeSingle();
        if (draftError || !draft) return res.status(404).json({ success: false, error: 'Rascunho fiscal não encontrado.' });
        const environment = Number(draft.environment) as Environment;
        if (![1, 2].includes(environment)) return res.status(409).json({ success: false, error: 'Ambiente fiscal inválido no rascunho.' });
        if (draft.status === 'authorized' && draft.document_id) {
            return res.status(200).json({ success: true, status: 'authorized', documentId: draft.document_id, accessKey: draft.access_key });
        }
        if (draft.status === 'rejected') return res.status(409).json({ success: false, status: 'rejected', error: 'A SEFAZ rejeitou esta tentativa. Revise o motivo antes de iniciar uma nova operação fiscal.' });
        if (!['ready', 'transmitting', 'unknown'].includes(draft.status)) {
            return res.status(409).json({ success: false, error: 'Conclua e salve a revisão fiscal antes de transmitir.' });
        }
        if (environment === 1 && req.body?.productionConfirmed !== true) {
            return res.status(400).json({ success: false, error: 'Confirme explicitamente a transmissão deste documento em Produção.' });
        }
        if (!draft.review_data || !draft.nature_of_operation || !draft.reviewed_at) {
            return res.status(409).json({ success: false, error: 'A revisão fiscal não foi persistida.' });
        }

        const { data: source, error: sourceError } = await db.from('nfe_documents')
            .select('id,order_id,status,ambiente,modelo,chave_acesso,numero_protocolo,xml_protocolo')
            .eq('id', draft.original_document_id).maybeSingle();
        if (sourceError || !source || source.modelo !== '55') {
            return res.status(409).json({ success: false, error: 'Documento original incompatível com esta operação fiscal.' });
        }
        if (source.chave_acesso !== draft.original_access_key || Number(source.ambiente) !== environment ||
            source.status !== (environment === 1 ? 'autorizada' : 'homologada') || !source.numero_protocolo) {
            return res.status(409).json({ success: false, error: 'A autorização original não confere com o rascunho.' });
        }

        const { data: lines, error: linesError } = await db.from('nfe_operation_draft_lines')
            .select('id,original_document_item_id,fiscal_item_number,quantity,gross_value,discount_value,reviewed_cfop,reviewed_product_xml,reviewed_taxes_xml')
            .eq('draft_id', draft.id).order('fiscal_item_number');
        if (linesError || !lines?.length || lines.some((line) => !line.reviewed_cfop || !line.reviewed_product_xml || !line.reviewed_taxes_xml)) {
            return res.status(409).json({ success: false, error: 'Há itens sem CFOP ou blocos fiscais revisados.' });
        }
        const originalIds = lines.map((line) => line.original_document_item_id);
        const { data: originalLines, error: originalLinesError } = await db.from('nfe_document_items')
            .select('id,item_number,billed_quantity,gross_value,discount_value,product_code,description,unit_value,product_xml,taxes_xml')
            .in('id', originalIds);
        if (originalLinesError || !originalLines || originalLines.length !== lines.length) {
            return res.status(409).json({ success: false, error: 'Não foi possível carregar todos os itens da NF-e original.' });
        }
        const originalById = new Map(originalLines.map((line) => [line.id, line]));

        const { data: settingsRow, error: settingsError } = await db.from('settings').select('*').eq('id', 'app').maybeSingle();
        if (settingsError || !settingsRow) return res.status(503).json({ success: false, error: 'Configuração fiscal indisponível.' });
        const settings = asFiscalSettings(settingsRow.data || settingsRow) as AppSettings & Record<string, unknown>;
        const pfx = typeof settings.certificateBase64 === 'string' ? settings.certificateBase64 : process.env.NFE_CERTIFICATE_BASE64;
        const password = typeof settings.certificatePassword === 'string' ? settings.certificatePassword : process.env.NFE_CERTIFICATE_PASSWORD;
        if (!pfx) return res.status(503).json({ success: false, error: 'Certificado digital não configurado.' });
        const certificate = extractCertificateAndKey(pfx, password || '');

        const persistAuthorized = async (responseXml: string, authorizedAccessKey: string, authorizedSignedXml: string) => {
            const authorization = parseSefazAuthorization(responseXml);
            const protocolNumber = authorization.protocolNumber;
            if (!authorization.authorized || !protocolNumber || !/^\d{15}$/.test(protocolNumber)) {
                throw new Error('Consulta não confirmou autorização e protocolo válido da NF-e.');
            }
            const itemSnapshot = getPersistableItems(authorizedSignedXml, lines as unknown as Array<Record<string, unknown>>);
            const { data: documentId, error: persistError } = await db.rpc('persist_authorized_nfe_operation_draft', {
                p_draft_id: draft.id, p_document_id: draft.document_id || draft.id,
                p_number: Number(authorizedAccessKey.slice(25, 34)),
                p_series: String(Number(authorizedAccessKey.slice(22, 25))),
                p_access_key: authorizedAccessKey, p_signed_xml: authorizedSignedXml,
                p_sefaz_response_xml: responseXml, p_protocol_number: protocolNumber,
                p_protocol_date: authorization.protocolDate ? new Date(authorization.protocolDate).toISOString() : null,
                p_status: environment === 1 ? 'autorizada' : 'homologada',
                p_status_reason: authorization.xMotivo || 'Autorizada pela SEFAZ.', p_items: itemSnapshot,
            });
            if (persistError || !documentId) {
                console.error('[NF-e Draft] SEFAZ autorizou, mas a RPC de persistência falhou:', persistError?.message || 'sem id');
                return res.status(503).json({ success: true, pending: true, reconciliationRequired: true,
                    accessKey: authorizedAccessKey, protocolNumber,
                    error: 'A SEFAZ autorizou, mas falta reconciliar a gravação local. Consulte novamente; não retransmita.' });
            }
            return res.status(200).json({ success: true, status: 'authorized', documentId,
                accessKey: authorizedAccessKey, protocolNumber,
                cStat: authorization.cStat, xMotivo: authorization.xMotivo });
        };

        const consultKey = async (accessKey: string): Promise<string> => {
            const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
            return sendSoapToSefaz({ url: consultationUrls[environment],
                action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
                serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
                xmlPayload: queryXml, certPem: certificate.certPem, privateKeyPem: certificate.privateKeyPem });
        };

        const reconcileStoredAttempt = async (allowRetryAfterNotFound: boolean) => {
            if (!draft.access_key || !draft.signed_xml) {
                return res.status(409).json({ success: false, pending: true, error: 'Tentativa sem chave/XML persistidos; requer reconciliação manual e não pode ser retransmitida.' });
            }
            let queryXml: string;
            try { queryXml = await consultKey(draft.access_key); }
            catch (error) {
                console.error('[NF-e Draft] Consulta após tentativa inconclusiva falhou:', error instanceof Error ? error.message : 'erro desconhecido');
                return res.status(502).json({ success: false, pending: true, accessKey: draft.access_key,
                    error: 'Não foi possível reconciliar a tentativa na SEFAZ. Nenhuma retransmissão foi feita.' });
            }
            const situation = parseSefazNfeSituation(queryXml);
            const recoveryDecision = decideOperationDraftRecovery(situation.cStat, situation.state);
            if (recoveryDecision === 'authorized') return persistAuthorized(queryXml, draft.access_key, draft.signed_xml);
            if (recoveryDecision === 'confirmed_not_found' && allowRetryAfterNotFound) {
                const { data: ready, error } = await db.from('nfe_operation_drafts').update({ status: 'ready', updated_at: new Date().toISOString() })
                    .eq('id', draft.id).in('status', ['transmitting', 'unknown']).select('id').maybeSingle();
                if (error || !ready) return res.status(503).json({ success: false, pending: true, accessKey: draft.access_key,
                    error: 'A SEFAZ não localizou a chave, mas não foi possível liberar a repetição segura. Tente consultar novamente.' });
                return res.status(409).json({ success: false, retryAllowed: true, status: 'ready', accessKey: draft.access_key,
                    error: 'A consulta à SEFAZ retornou cStat 217 (chave não localizada). Uma nova tentativa poderá reutilizar exatamente a mesma chave e XML.' });
            }
            return res.status(202).json({ success: false, pending: true, accessKey: draft.access_key,
                cStat: situation.cStat, error: situation.xMotivo || 'A SEFAZ ainda não confirmou a situação. Não retransmita.' });
        };

        if (draft.status === 'transmitting' || draft.status === 'unknown') return reconcileStoredAttempt(true);

        const review = draft.review_data as Record<string, unknown>;
        let accessKey = draft.access_key;
        let signedXml = draft.signed_xml;
        let nfeNumber: number;
        let series: string;
        if (!accessKey || !signedXml) {
            series = String(settings.nfeSerie || '1');
            const minimumNumber = Number(settings.nfeNextNumber || 700);
            const { data: reservedNumber, error: numberError } = await db.rpc('reserve_next_nfe_number', {
                p_modelo: '55', p_serie: series, p_ambiente: environment, p_numero_minimo: minimumNumber,
            });
            if (numberError || typeof reservedNumber !== 'number' || reservedNumber < 1) {
                return res.status(503).json({ success: false, error: 'Não foi possível reservar número fiscal seguro para o rascunho.' });
            }
            nfeNumber = reservedNumber;
            const now = new Date();
            const issuedAt = brazilTimestamp(now);
            const generatedKey = generateNfeAccessKey({
                ufCode: '41', yearMonth: `${issuedAt.slice(2, 4)}${issuedAt.slice(5, 7)}`,
                cnpj: String(settings.companyCnpj || ''), model: '55', series,
                number: nfeNumber, emissionType: '1',
            });
            accessKey = generatedKey.accessKey;
            const originalById = new Map(originalLines.map((line) => [line.id, line]));
            const xml = buildReviewedFiscalOperationXml({
                kind: draft.operation_kind === 'estorno' ? 'estorno' : 'return',
                environment, originalEnvironment: environment,
                originalStatus: environment === 1 ? 'autorizada' : 'homologada',
                originalProtocol: String(source.numero_protocolo), originalAccessKey: String(source.chave_acesso),
                accessKey, randomCode: generatedKey.randomCode, checkDigit: generatedKey.checkDigit,
                nfeNumber, series, issuedAt, settings,
                natureOfOperation: draft.nature_of_operation,
                recipientXml: String(review.recipient_xml || ''), totalsXml: String(review.totals_xml || ''),
                transportXml: String(review.transport_xml || ''), paymentXml: String(review.payment_xml || ''),
                reason: String(review.reason || draft.reason || ''),
                lines: lines.map((line) => {
                    const original = originalById.get(line.original_document_item_id);
                    if (!original) throw new Error(`Item original ${line.fiscal_item_number} não encontrado.`);
                    return {
                        originalItemNumber: Number(original.item_number),
                        originalProductCode: original.product_code,
                        originalDescription: original.description,
                        originalNcm: readTag(String(original.product_xml), 'NCM') || undefined,
                        originalUnitValue: Number(original.unit_value),
                        billedQuantity: Number(original.billed_quantity),
                        originalGrossValue: Number(original.gross_value), originalDiscountValue: Number(original.discount_value),
                        quantity: Number(line.quantity), grossValue: Number(line.gross_value), discountValue: Number(line.discount_value),
                        cfop: String(line.reviewed_cfop), productXml: String(line.reviewed_product_xml),
                        taxesXml: String(line.reviewed_taxes_xml),
                    };
                }),
            });
            await validateNfeAgainstOfficialSchema(xml);
            signedXml = signNfeXml(xml, certificate.privateKeyPem, certificate.certDerBase64);
            await validateNfeAgainstOfficialSchema(signedXml);
            const { data: claimed, error: claimError } = await db.from('nfe_operation_drafts')
                .update({ status: 'transmitting', access_key: accessKey, signed_xml: signedXml,
                    transmitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', draft.id).eq('status', 'ready').select('id').maybeSingle();
            if (claimError || !claimed) return res.status(409).json({ success: false, pending: true,
                error: 'Outro processo alterou este rascunho. Consulte a chave/estado antes de repetir.' });
        } else {
            nfeNumber = Number(accessKey.slice(25, 34));
            series = String(Number(accessKey.slice(22, 25)));
            const { data: claimed, error: claimError } = await db.from('nfe_operation_drafts')
                .update({ status: 'transmitting', updated_at: new Date().toISOString() })
                .eq('id', draft.id).eq('status', 'ready').select('id').maybeSingle();
            if (claimError || !claimed) return res.status(409).json({ success: false, pending: true,
                error: 'Outro processo iniciou o rascunho. Consulte o estado antes de repetir.' });
        }

        const batchXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${Date.now().toString().slice(-15)}</idLote><indSinc>1</indSinc>${signedXml}</enviNFe>`;
        let sefazXml: string;
        try {
            sefazXml = await sendSoapToSefaz({ url: authorizationUrls[environment],
                action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
                xmlPayload: batchXml, certPem: certificate.certPem, privateKeyPem: certificate.privateKeyPem });
        } catch (error) {
            await db.from('nfe_operation_drafts').update({ status: 'unknown', updated_at: new Date().toISOString() })
                .eq('id', draft.id).eq('status', 'transmitting');
            console.error('[NF-e Draft] Conexão de autorização interrompida:', error instanceof Error ? error.message : 'erro desconhecido');
            return reconcileStoredAttempt(false);
        }

        const authorization = parseSefazAuthorization(sefazXml);
        if (authorization.authorized) return persistAuthorized(sefazXml, accessKey!, signedXml!);
        if (authorization.pending || authorization.cStat === '204') {
            await db.from('nfe_operation_drafts').update({ status: 'unknown', sefaz_response_xml: sefazXml, updated_at: new Date().toISOString() })
                .eq('id', draft.id).eq('status', 'transmitting');
            return reconcileStoredAttempt(false);
        }
        const { error: rejectionSyncError } = await db.from('nfe_operation_drafts').update({
            status: 'rejected', sefaz_response_xml: sefazXml, updated_at: new Date().toISOString(),
        }).eq('id', draft.id).eq('status', 'transmitting');
        if (rejectionSyncError) console.error('[NF-e Draft] Rejeição SEFAZ não persistida:', rejectionSyncError.message);
        return res.status(authorization.pending ? 202 : 422).json({ success: false, pending: authorization.pending,
            status: rejectionSyncError ? 'unknown' : 'rejected', cStat: authorization.cStat,
            xMotivo: authorization.xMotivo, error: authorization.xMotivo || 'A SEFAZ não autorizou o documento.' });
    } catch (error) {
        console.error('[NF-e Draft] Erro no fluxo de emissão:', error instanceof Error ? error.message : 'erro desconhecido');
        return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro interno na emissão fiscal.' });
    }
}
