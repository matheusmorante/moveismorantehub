import { supabase } from '../../supabaseConfig';
import { InboundInvoice } from '../types/inboundNfeTypes';
import { parseInboundNfeXml } from '../utils/inboundXmlParser';
import { saveLastInboundInvoiceSyncAt } from './inboundCacheService';
import { checkInboundInvoiceKeyExists } from './inboundQueriesService';

export const syncSefazDfe = async (options?: { forceMock?: boolean }): Promise<{ newInvoicesCount: number; updatedInvoicesCount: number; message: string }> => {
    try {
        const { data, error } = await supabase.functions.invoke('sefaz-inbound-sync', {
            body: { environment: 'production' }
        });

        if (!error && data?.success) {
            saveLastInboundInvoiceSyncAt(new Date().toISOString());
            return {
                newInvoicesCount: data.newDocsCount || 0,
                updatedInvoicesCount: 0,
                message: data.message || 'Sincronização executada com sucesso.'
            };
        }
    } catch (edgeError) {
        console.warn('Sincronização SEFAZ indisponível:', edgeError);
    }

    return {
        newInvoicesCount: 0,
        updatedInvoicesCount: 0,
        message: 'Consulta SEFAZ finalizada.'
    };
};

export const consultInboundInvoiceByAccessKey = async (accessKey: string): Promise<{ invoice?: InboundInvoice; rawXml?: string; message?: string }> => {
    const cleanKey = accessKey.replace(/\D/g, '');
    if (cleanKey.length !== 44) {
        throw new Error('A chave de acesso deve conter exatamente 44 dígitos numéricos.');
    }

    // 1. Verifica se já existe em banco ou cache local
    const existing = await checkInboundInvoiceKeyExists(cleanKey);
    if (existing) {
        return { invoice: existing, message: 'Nota fiscal já cadastrada no sistema.' };
    }

    // 2. Consulta a SEFAZ via Edge Function
    const { data, error } = await supabase.functions.invoke('sefaz-inbound-sync', {
        body: { accessKey: cleanKey, environment: 'production' }
    });

    if (error) {
        throw new Error(error.message || 'Erro ao comunicar com a SEFAZ.');
    }

    if (!data?.success) {
        throw new Error(data?.message || 'A SEFAZ não retornou dados para esta chave de acesso.');
    }

    // 3. Se retornou o XML completo do documento
    if (data.document?.xml) {
        const parsed = parseInboundNfeXml(data.document.xml);
        return { invoice: parsed, rawXml: data.document.xml, message: data.message };
    }

    // 4. Se a nota foi persistida diretamente pelo Edge Function
    const savedInDb = await checkInboundInvoiceKeyExists(cleanKey);
    if (savedInDb) {
        return { invoice: savedInDb, message: data.message };
    }

    return {
        message: data.message || 'A SEFAZ processou a requisição, mas o XML completo dos itens ainda não foi liberado. Envie o arquivo XML ou DANFE para importar todos os itens.'
    };
};
