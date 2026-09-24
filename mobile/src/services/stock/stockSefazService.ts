import { supabase } from '../supabaseClient';

/**
 * Consulta o status atual de sincronização SEFAZ persistido no Supabase
 * sem bater no Web Service oficial (R$ 0,00 e sem risco de cStat 656).
 */
export const fetchSefazSyncStatus = async () => {
    try {
        const { data, error } = await supabase
            .from('sefaz_nsu_control')
            .select('status, last_sync_at, next_allowed_sync_at, last_cstat, last_xmotivo, last_docs_count')
            .eq('id', 'default')
            .maybeSingle();
        if (error) return null;
        return data;
    } catch {
        return null;
    }
};

/**
 * Dispara uma sincronização ou retry pontual de NF-e via Edge Function
 */
export const triggerSefazSync = async () => {
    return await supabase.functions.invoke('sefaz-inbound-sync', {
        body: { environment: 'production' }
    });
};

/**
 * Consulta e importa uma NF-e pontual diretamente do Ambiente Nacional pela chave de 44 dígitos
 */
export const consultSefazByAccessKey = async (accessKey: string) => {
    const cleanKey = accessKey.replace(/\D/g, '');
    if (cleanKey.length !== 44) {
        throw new Error('Chave de acesso deve conter exatamente 44 dígitos.');
    }
    return await supabase.functions.invoke('sefaz-inbound-sync', {
        body: { accessKey: cleanKey, environment: 'production' }
    });
};
