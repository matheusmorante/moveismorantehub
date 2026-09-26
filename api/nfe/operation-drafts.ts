import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { getAuthorizedAt, getCancellationWindow } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { originalItemCfop, suggestEstornoCfop, suggestReturnCfop,
    type FiscalCfopConfiguration } from '../../erp/src/pages/utils/nfe/fiscalCfopResolution';
import { normalizeReviewedFiscalBlock } from '../../erp/src/pages/utils/nfe/fiscalOperationXml';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractFiscalBlock(xml: string, name: string): string {
    const prefix = '(?:[\\w.-]+:)?';
    return xml.match(new RegExp(`<${prefix}${name}\\b[^>]*>[\\s\\S]*?<\\/${prefix}${name}>`, 'i'))?.[0] || '';
}

function showsPhysicalCirculation(order: {
    delivery_status: string | null;
    delivery_method: string | null;
    order_data: Record<string, unknown> | null;
}, model: string): boolean {
    const data = order.order_data || {};
    const shipping = (data.shipping || {}) as Record<string, unknown>;
    const status = String(order.delivery_status || shipping.deliveryStatus || '').toLowerCase();
    if (['in_transit', 'in-transit', 'delivered', 'completed', 'finished', 'collected',
        'em_transito', 'entregue', 'concluido', 'coletado'].some((part) => status.includes(part))) return true;
    if (shipping.deliveryStartedAt || shipping.deliveryArrivedAt || shipping.deliveryFinishedAt ||
        shipping.unattendedAt || shipping.pickupConfirmedAt || data.deliveryFinishedAt || data.pickupConfirmedAt) return true;
    return model === '65' && String(order.delivery_method || shipping.deliveryMethod || '').toLowerCase() === 'pickup'
        && String(data.status || '').toLowerCase() === 'fulfilled';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (!['GET', 'POST', 'PUT'].includes(req.method || '')) return res.status(405).json({ error: 'Método não permitido.' });
    if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Serviço fiscal indisponível.' });
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Autenticação necessária.' });
    const db = createClient<FiscalDatabase>(supabaseUrl, serviceKey);
    const { data: session, error: authError } = await db.auth.getUser(token);
    if (authError || !session.user) return res.status(401).json({ error: 'Sessão inválida.' });

    try {
        if (req.method === 'GET') {
            const draftId = String(req.query.id || '');
            if (!uuid.test(draftId)) return res.status(400).json({ error: 'Rascunho fiscal inválido.' });
            const { data: draft, error: draftError } = await db.from('nfe_operation_drafts')
                .select('id,operation_kind,finalidade,original_document_id,original_access_key,return_order_id,environment,status,reason,nature_of_operation,review_data,generated_xml,signed_xml,sefaz_response_xml,protocol_number,access_key,document_id,created_at,updated_at')
                .eq('id', draftId).maybeSingle();
            if (draftError) throw draftError;
            if (!draft) return res.status(404).json({ error: 'Rascunho fiscal não encontrado.' });
            const { data: lines, error: linesError } = await db.from('nfe_operation_draft_lines')
                .select('id,original_document_item_id,fiscal_item_number,quantity,gross_value,discount_value,reviewed_cfop,reviewed_product_xml,reviewed_taxes_xml')
                .eq('draft_id', draftId).order('fiscal_item_number');
            if (linesError) throw linesError;
            if (!lines?.length) return res.status(409).json({ error: 'Rascunho fiscal sem itens de origem.' });
            const sourceIds = lines.map((line) => line.original_document_item_id);
            const [sourceResult, settingsResult, sourceDocumentResult] = await Promise.all([
                db.from('nfe_document_items')
                    .select('id,document_id,item_number,product_code,description,billed_quantity,unit_value,gross_value,discount_value,product_xml,taxes_xml')
                    .in('id', sourceIds),
                db.from('settings').select('data').eq('id', 'app').maybeSingle(),
                db.from('nfe_documents').select('id,order_id,modelo,ambiente,chave_acesso,numero_nfe,serie,xml_nfe')
                    .eq('id', draft.original_document_id).maybeSingle(),
            ]);
            if (sourceResult.error || settingsResult.error || sourceDocumentResult.error || !sourceDocumentResult.data) {
                throw sourceResult.error || settingsResult.error || sourceDocumentResult.error || new Error('Documento fiscal original ausente.');
            }
            const originalById = new Map((sourceResult.data || []).map((item) => [item.id, item]));
            const fiscalSettings = settingsResult.data?.data?.fiscalDefaults as FiscalCfopConfiguration | undefined;
            const reviewedLines = lines.map((line) => {
                const original = originalById.get(line.original_document_item_id);
                if (!original || original.document_id !== draft.original_document_id) {
                    throw new Error('Linha fiscal de origem inconsistente no rascunho.');
                }
                const originalCfop = originalItemCfop(original.product_xml);
                return { ...line, originalItemNumber: original.item_number,
                    originalDescription: original.description,
                    originalProductCode: original.product_code,
                    originalQuantity: original.billed_quantity,
                    originalUnitValue: original.unit_value,
                    originalGrossValue: original.gross_value,
                    originalDiscountValue: original.discount_value,
                    originalProductXml: original.product_xml,
                    originalTaxesXml: original.taxes_xml,
                    originalCfop,
                    suggestedCfop: draft.operation_kind === 'estorno'
                        ? suggestEstornoCfop(originalCfop, fiscalSettings)
                        : suggestReturnCfop(fiscalSettings),
                };
            });
            const originalXml = String(sourceDocumentResult.data.xml_nfe || '');
            const lastSefazResult = draft.sefaz_response_xml
                ? parseSefazAuthorization(String(draft.sefaz_response_xml))
                : null;
            return res.status(200).json({ success: true, draft,
                lastSefazResult: lastSefazResult ? { cStat: lastSefazResult.cStat, xMotivo: lastSefazResult.xMotivo } : null,
                source: sourceDocumentResult.data, lines: reviewedLines,
                reviewTemplate: {
                    recipient_xml: extractFiscalBlock(originalXml, 'dest'),
                    totals_xml: extractFiscalBlock(originalXml, 'total'),
                    transport_xml: '<transp><modFrete>9</modFrete></transp>',
                    payment_xml: '<pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>',
                } });
        }

        if (req.method === 'PUT') {
            const draftId = String(req.body?.draftId || '');
            const reviewData = req.body?.reviewData;
            const lines = req.body?.lines;
            if (!uuid.test(draftId) || !reviewData || !Array.isArray(lines)) {
                return res.status(400).json({ error: 'Revisão fiscal inválida ou incompleta.' });
            }
            let normalizedLines: Array<{ draft_line_id: string; cfop: string; product_xml: string; taxes_xml: string }>;
            try {
                normalizedLines = lines.map((line: Record<string, unknown>) => ({
                    draft_line_id: String(line.draft_line_id || ''),
                    cfop: String(line.cfop || ''),
                    product_xml: normalizeReviewedFiscalBlock(String(line.product_xml || ''), 'prod'),
                    taxes_xml: normalizeReviewedFiscalBlock(String(line.taxes_xml || ''), 'imposto'),
                }));
            } catch (error) {
                return res.status(400).json({ error: error instanceof Error ? error.message : 'Bloco fiscal de item inválido.' });
            }
            const { data: savedId, error: reviewError } = await db.rpc('save_nfe_operation_draft_review', {
                p_draft_id: draftId, p_review_data: reviewData, p_lines: normalizedLines, p_user_id: session.user.id,
            });
            if (reviewError || !savedId) return res.status(409).json({ error: reviewError?.message || 'Não foi possível registrar a revisão fiscal.' });
            return res.status(200).json({ success: true, draftId: savedId, status: 'ready' });
        }

        const kind = String(req.body?.kind || '');
        const originalDocumentId = String(req.body?.originalDocumentId || '');
        const returnOrderId = req.body?.returnOrderId ? String(req.body.returnOrderId) : null;
        const environment = Number(req.body?.environment);
        const reason = String(req.body?.reason || '').trim();
        if (!['estorno', 'return'].includes(kind) || !uuid.test(originalDocumentId) ||
            (returnOrderId !== null && !uuid.test(returnOrderId)) || ![1, 2].includes(environment)) {
            return res.status(400).json({ error: 'Tipo, origem, devolução ou ambiente fiscal inválido.' });
        }
        const { data: source, error: sourceError } = await db.from('nfe_documents')
            .select('id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_protocolo,xml_protocolo,created_at')
            .eq('id', originalDocumentId).maybeSingle();
        if (sourceError) throw sourceError;
        if (!source || source.document_type !== 'outbound' || source.modelo !== '55' || source.ambiente !== environment ||
            source.status !== (environment === 1 ? 'autorizada' : 'homologada') || !source.numero_protocolo) {
            return res.status(409).json({ error: 'Documento original não autorizado e protocolado no ambiente selecionado.' });
        }
        if (kind === 'estorno') {
            if (returnOrderId || req.body?.operationDidNotOccur !== true || req.body?.goodsDidNotCirculate !== true ||
                reason.length < 15) return res.status(400).json({ error: 'Confirme operação não realizada, ausência de circulação e justifique o estorno.' });
            const { data: order, error: orderError } = await db.from('orders')
                .select('id,status,delivery_status,delivery_method,order_data').eq('id', source.order_id).maybeSingle();
            if (orderError) throw orderError;
            if (!order || !['cancelled', 'cancelado'].includes(order.status) || showsPhysicalCirculation(order, source.modelo)) {
                return res.status(409).json({ error: 'O pedido precisa estar cancelado e sem evidência de circulação para preparar estorno.' });
            }
            const authorizedAt = getAuthorizedAt(source.xml_protocolo || '', '');
            const window = getCancellationWindow(source.modelo, authorizedAt);
            if (!window.valid || !window.expired) {
                return res.status(409).json({ error: 'Prazo de cancelamento não comprovadamente expirado. Verifique o protocolo original.' });
            }
        } else if (!returnOrderId) {
            return res.status(400).json({ error: 'Informe a devolução comercial atendida.' });
        }

        const { data: draftId, error: prepareError } = await db.rpc('prepare_nfe_operation_draft', {
            p_kind: kind, p_original_document_id: originalDocumentId,
            p_return_order_id: returnOrderId, p_environment: environment,
            p_reason: kind === 'estorno' ? reason : null, p_user_id: session.user.id,
        });
        if (prepareError || !draftId) return res.status(409).json({ error: prepareError?.message || 'Não foi possível preparar o rascunho fiscal.' });
        return res.status(200).json({ success: true, draftId, status: 'draft' });
    } catch (error: unknown) {
        console.error('[NF-e Draft] Erro ao preparar/ler documento fiscal:', error instanceof Error ? error.message : 'erro desconhecido');
        return res.status(503).json({ error: 'Não foi possível acessar o rascunho fiscal.' });
    }
}
