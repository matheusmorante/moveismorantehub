import { InboundInvoice } from '../types/inboundNfeTypes';

export const STORAGE_KEY = 'morante_inbound_invoices_cache';
export const LAST_SYNC_KEY = 'morante_inbound_invoices_last_sync_at';

export const getLastInboundInvoiceSyncAt = (): string | null => {
    try {
        return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
        return null;
    }
};

export const saveLastInboundInvoiceSyncAt = (value: string) => {
    try {
        localStorage.setItem(LAST_SYNC_KEY, value);
    } catch (error) {
        console.warn('Não foi possível registrar a última atualização das NF-e.', error);
    }
};

export const getLocalInvoices = (): InboundInvoice[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveLocalInvoices = (invoices: InboundInvoice[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch (e) {
        console.warn('Erro ao salvar notas de entrada no cache local', e);
    }
};
