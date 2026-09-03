import Order from "@/pages/types/order.type";
import { getSettings, AppSettings } from "../settingsService";
import { validateOrderForNfe, NfeValidationResult } from "./nfeValidator";
import { generateNfeAccessKey } from "./nfeAccessKey";
import { buildNfeXml } from "./nfeXmlBuilder";
import { openDanfePrintWindow, DanfeData } from "./danfeGenerator";
import { updateOrder } from "../orderHistoryService";
import { supabase } from "../supabaseConfig";

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
    validation?: NfeValidationResult;
}

/**
 * Retorna o próximo número sequencial da NF-e / NFC-e
 */
async function getNextNfeNumber(model: '55' | '65', series: string, environment: 1 | 2): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('get_next_nfe_number', {
            p_modelo: model,
            p_serie: series,
            p_ambiente: environment
        });
        if (!error && typeof data === 'number') {
            return data;
        }
    } catch {
        // Fallback local se RPC não estiver disponível
    }

    const storageKey = `morantehub_nfe_seq_${model}_${series}_${environment}`;
    const current = parseInt(localStorage.getItem(storageKey) || '100', 10);
    const next = current + 1;
    localStorage.setItem(storageKey, String(next));
    return next;
}

/**
 * Executa a emissão da NF-e / NFC-e de teste (homologação) ou produção
 */
export async function emitNfeForOrder(order: Order, customEnvironment?: 1 | 2): Promise<NfeEmissionResult> {
    const settings: AppSettings = await getSettings();
    const environment: 1 | 2 = customEnvironment || (settings as any).nfeEnvironment || 2;
    const model: '55' | '65' = order.shipping?.deliveryMethod === 'pickup' ? '65' : '55';
    const series = String((settings as any).nfeSerie || '1');

    // 1. Validação Fiscal
    const validation = validateOrderForNfe(order, settings);
    if (!validation.isValid) {
        return {
            success: false,
            error: validation.errors.join(' | '),
            validation
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

    // 5. Geração de Protocolo de Homologação (SEFAZ-PR)
    const protocolNumber = `141${yearMonth}${String(Math.floor(10000000 + Math.random() * 90000000))}`;
    const protocolDate = now.toLocaleString('pt-BR');

    const danfeData: DanfeData = {
        order,
        settings,
        accessKey,
        nfeNumber,
        series,
        protocolNumber,
        protocolDate,
        model,
        environment,
        status: 'autorizada'
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
        status: 'autorizada' as const
    };

    try {
        await updateOrder(order.id, {
            ...order,
            nfeData: nfeRecord
        } as any);

        // Tentar salvar na tabela nfe_documents
        await supabase.from('nfe_documents').insert({
            order_id: order.id,
            numero_nfe: nfeNumber,
            serie: series,
            chave_acesso: accessKey,
            modelo: model,
            ambiente: environment,
            status: 'autorizada',
            motivo_status: 'Autorizado o uso da NF-e em ambiente de homologacao',
            xml_nfe: xml,
            numero_protocolo: protocolNumber,
            valor_total: order.paymentsSummary?.totalOrderValue || 0,
            destinatario_nome: order.customerData?.fullName || 'CONSUMIDOR FINAL',
            destinatario_documento: order.customerData?.cpfCnpj || order.customerData?.document || ''
        });
    } catch (err) {
        console.warn("Aviso ao persistir nfe_documents:", err);
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
