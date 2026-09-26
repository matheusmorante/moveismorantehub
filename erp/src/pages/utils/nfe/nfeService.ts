import Order from "@/pages/types/order.type";
import { getSettings, AppSettings } from "../settingsService";
import { validateOrderForNfe, NfeValidationResult } from "./nfeValidator";
import { generateNfeAccessKey } from "./nfeAccessKey";
import { buildNfeXml } from "./nfeXmlBuilder";
import { openDanfePrintWindow, DanfeData } from "./danfeGenerator";
import { updateOrder } from "../orderHistoryService";
import { supabase } from "../supabaseConfig";
import { getAuthorizedAt, getCancellationWindow } from './nfeEventRules';

export interface NfeEmissionResult {
    success: boolean;
    accessKey?: string;
    nfeNumber?: number;
    series?: string;
    model?: '55' | '65';
    environment?: 1 | 2;
    protocolNumber?: string;
    protocolDate?: string;
    xml?: string;
    danfeData?: DanfeData;
    error?: string;
    pending?: boolean;
    cStat?: string;
    sefazMessage?: string;
    validation?: NfeValidationResult;
}

/**
 * Retorna o próximo número sequencial da NF-e / NFC-e respeitando a faixa configurada
 */
async function getNextNfeNumber(model: '55' | '65', series: string, environment: 1 | 2): Promise<number> {
    const settings = await getSettings();
    const configuredBase = model === '65' 
        ? Number((settings as any).nfceNextNumber || 700)
        : Number((settings as any).nfeNextNumber || 700);

    try {
        const { data, error } = await supabase.rpc('reserve_next_nfe_number', {
            p_modelo: model,
            p_serie: series,
            p_ambiente: environment,
            p_numero_minimo: configuredBase,
        });
        if (!error && typeof data === 'number' && data >= configuredBase) {
            return data;
        }
    } catch {
        // A sequência local não é segura para emissão fiscal concorrente.
    }
    throw new Error('Não foi possível reservar a numeração fiscal oficial. Verifique a sequência no sistema antes de emitir.');
}

/**
 * Executa a emissão da NF-e / NFC-e de teste (homologação) ou produção
 */
export async function emitNfeForOrder(order: Order, customEnvironment?: 1 | 2, productionConfirmed = false): Promise<NfeEmissionResult> {
    const settings: AppSettings = await getSettings();
    const environment: 1 | 2 = customEnvironment || 1;
    if (environment === 1 && !productionConfirmed) {
        return { success: false, error: 'Confirme explicitamente a transmissão em Produção antes de emitir.' };
    }
    const model: '55' | '65' = order.shipping?.deliveryMethod === 'pickup' ? '65' : '55';
    const emissionRequestId = crypto.randomUUID();
    const series = String((settings as any).nfeSerie || '1');

    if (model === '65' && (!(settings as any).cscId || !(settings as any).cscToken)) {
        return {
            success: false,
            model,
            environment,
            error: 'NFC-e exige CSC/IdToken configurados antes da emissão.',
        };
    }

    // 1. Validação Fiscal
    const validation = validateOrderForNfe(order, settings);
    if (!validation.isValid) {
        return {
            success: false,
            model,
            environment,
            error: validation.errors.join(' | '),
            validation
        };
    }

    const requestedNcms = Array.from(new Set(order.items.filter(item => item.itemType !== 'service').map(item => {
        const rawCode = (item as any).fiscal?.ncm || '';
        return String(rawCode).replace(/\D/g, '');
    }).filter(code => code.length === 8)));
    const { data: catalogNcms, error: catalogError } = await supabase
        .from('ncms')
        .select('code, active, start_date, end_date')
        .in('code', requestedNcms);
    if (catalogError) {
        return {
            success: false,
            model,
            environment,
            error: 'Não foi possível confirmar a vigência dos NCMs na base local. Sincronize a tabela oficial e tente novamente.',
            validation,
        };
    }
    const ncmByCode = new Map((catalogNcms || []).map(row => [row.code, row]));
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    const invalidNcms = requestedNcms.filter(code => {
        const entry = ncmByCode.get(code);
        return !entry || !entry.active || (entry.start_date && entry.start_date > today) || (entry.end_date && entry.end_date < today);
    });
    if (invalidNcms.length > 0) {
        return {
            success: false,
            model,
            environment,
            error: `NCM(s) não vigente(s) ou ausente(s) da base local: ${invalidNcms.join(', ')}. Revise o cadastro do produto antes de emitir.`,
            validation,
        };
    }

    // 2. Numeração Sequencial
    const nfeNumber = await getNextNfeNumber(model, series, environment);

    // 3. Chave de Acesso Oficial (44 dígitos com DV módulo 11)
    const now = new Date();
    const yearMonth = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cnpj = (settings.companyCnpj || '00000000000000').replace(/\D/g, '');
    const { accessKey, randomCode, checkDigit } = generateNfeAccessKey({
        ufCode: '41', // Paraná
        yearMonth,
        cnpj,
        model,
        series,
        number: nfeNumber,
        emissionType: '1'
    });

    // 4. Montagem do XML Layout 4.00
    const xml = buildNfeXml({
        order,
        settings,
        accessKey,
        randomCode,
        checkDigit,
        nfeNumber,
        series,
        model,
        environment
    });

    // 5. Envio e Assinatura Digital via Serverless Function Vercel
    let protocolNumber: string | undefined;
    let protocolDate: string | undefined;
    let signedXml = xml;
    let sefazResult: any;

    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) throw new Error('Faça login novamente para transmitir o documento fiscal.');
        const response = await fetch('/api/nfe/emit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
            body: JSON.stringify({
                xml,
                environment,
                orderId: order.id,
                nfeNumber,
                series,
                model,
                accessKey,
                emissionRequestId,
                productionConfirmed
            })
        });

        sefazResult = await response.json();
        if (sefazResult.signedXml) signedXml = sefazResult.signedXml;
        if (sefazResult.protocolNumber) protocolNumber = sefazResult.protocolNumber;
        if (sefazResult.protocolDate) protocolDate = sefazResult.protocolDate;
        if (!response.ok || !sefazResult.success) {
            return {
                success: false, pending: Boolean(sefazResult.pending), accessKey, nfeNumber, series, model, environment,
                xml: signedXml, cStat: sefazResult.cStat, sefazMessage: sefazResult.xMotivo,
                error: sefazResult.error || sefazResult.xMotivo || 'A SEFAZ não confirmou a autorização da nota.',
                validation,
            };
        }
    } catch (e: any) {
        console.error("[NFe Service] Falha na transmissão para a SEFAZ:", e);
        return {
            success: false,
            accessKey,
            nfeNumber,
            series,
            model,
            environment,
            xml,
            pending: Boolean(sefazResult?.pending),
            cStat: sefazResult?.cStat,
            sefazMessage: sefazResult?.xMotivo,
            error: e?.message || 'Falha na transmissão para a SEFAZ.',
            validation,
        };
    }

    const danfeData: DanfeData = {
        order,
        settings,
        accessKey,
        nfeNumber,
        series,
        protocolNumber: protocolNumber || '',
        protocolDate: protocolDate || '',
        model,
        environment,
        status: environment === 2 ? 'homologada' : 'autorizada'
    };

    // 6. Atualização do Pedido com os dados fiscais emitidos
    const nfeRecord = {
        accessKey,
        nfeNumber,
        series,
        model,
        environment,
        protocolNumber,
        protocolDate,
        xml,
        emittedAt: now.toISOString(),
        status: (environment === 2 ? 'homologada' : 'autorizada') as 'homologada' | 'autorizada'
    };

    try {
        await updateOrder(order.id as string, {
            ...order,
            nfeData: nfeRecord
        } as any);

    } catch (err) {
        console.warn("Aviso: autorização foi confirmada, mas não foi possível atualizar nfeData do pedido:", err);
    }

    return {
        success: true,
        accessKey,
        nfeNumber,
        series,
        model,
        environment,
        protocolNumber,
        protocolDate,
        xml,
        danfeData,
        validation
    };
}

/**
 * Abre o DANFE de um pedido que já teve NF-e emitida
 */
export async function printOrderDanfe(order: Order): Promise<void> {
    const settings: AppSettings = await getSettings();
    const nfeData = (order as any).nfeData;
    if (!nfeData) {
        throw new Error("Este pedido ainda não possui NF-e emitida.");
    }

    openDanfePrintWindow({
        order,
        settings,
        accessKey: nfeData.accessKey,
        nfeNumber: nfeData.nfeNumber,
        series: nfeData.series || '1',
        protocolNumber: nfeData.protocolNumber || '141260000000000',
        protocolDate: nfeData.protocolDate || new Date().toLocaleString('pt-BR'),
        model: nfeData.model || '55',
        environment: nfeData.environment || 2,
        status: nfeData.status || 'autorizada'
    });
}

/**
 * Avalia se o documento fiscal é elegível para cancelamento fiscal direto
 * Regra: Cancelamento fiscal só é válido se a mercadoria NÃO circulou/saiu e dentro das regras da UF/Modelo
 */
export function canCancelFiscalDocument(doc: {
    status?: string;
    modelo?: '55' | '65';
    created_at?: string;
    xml_protocolo?: string;
    ambiente?: 1 | 2;
    isMerchandiseDelivered?: boolean;
}): { canCancel: boolean; reason?: string } {
    if (!doc) return { canCancel: false, reason: 'Documento não informado' };
    if (!['autorizada', 'homologada'].includes(doc.status || '') ||
        (doc.status === 'homologada' && doc.ambiente !== 2)) {
        return { canCancel: false, reason: 'Apenas notas autorizadas podem ser canceladas' };
    }
    if (doc.isMerchandiseDelivered) {
        return { canCancel: false, reason: 'Mercadoria já entregue/circulou. Necessário emitir NF-e de Devolução de Entrada.' };
    }
    const window = getCancellationWindow(String(doc.modelo || ''), getAuthorizedAt(doc.xml_protocolo, doc.created_at || ''));
    if (!window.valid || window.expired) {
        return { canCancel: false, reason: 'Prazo normal de cancelamento expirado; avalie NF-e de estorno conforme a regra fiscal.' };
    }
    return { canCancel: true };
}

/**
 * Avalia se o documento fiscal permite emissão de Carta de Correção (CC-e)
 * Regra estrita: CC-e é permitida EXCLUSIVAMENTE para NF-e (Mod. 55). NFC-e (Mod. 65) NÃO aceita CC-e (Rejeição SEFAZ).
 */
export function canIssueCce(doc: { modelo?: '55' | '65'; status?: string }): { canIssue: boolean; reason?: string } {
    if (!doc) return { canIssue: false, reason: 'Documento não informado' };
    if (doc.modelo === '65') {
        return { canIssue: false, reason: 'A SEFAZ não permite Carta de Correção (CC-e) para NFC-e (Modelo 65).' };
    }
    if (doc.status !== 'autorizada') {
        return { canIssue: false, reason: 'Apenas NF-e autorizadas podem receber CC-e.' };
    }
    return { canIssue: true };
}
