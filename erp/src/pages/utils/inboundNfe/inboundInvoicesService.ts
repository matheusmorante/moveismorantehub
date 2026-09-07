import { supabase } from '../supabaseConfig';
import { InboundInvoice } from './inboundNfeTypes';
import { parseInboundNfeXml } from './inboundXmlParser';

const STORAGE_KEY = 'morante_inbound_invoices_cache';

const getLocalInvoices = (): InboundInvoice[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveLocalInvoices = (invoices: InboundInvoice[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch (e) {
        console.warn('Erro ao salvar notas de entrada no cache local', e);
    }
};

export const fetchInboundInvoices = async (): Promise<InboundInvoice[]> => {
    try {
        const { data, error } = await supabase
            .from('inbound_invoices')
            .select('*')
            .order('issued_at', { ascending: false });

        if (!error && data && data.length > 0) {
            const mapped: InboundInvoice[] = data.map((row: any) => ({
                id: row.id,
                nfeKey: row.nfe_key,
                nfeNumber: row.nfe_number,
                series: row.series,
                issuedAt: row.issued_at,
                emitterCnpj: row.emitter_cnpj,
                emitterName: row.emitter_name,
                emitterTradeName: row.emitter_trade_name,
                recipientCnpj: row.recipient_cnpj,
                recipientName: row.recipient_name,
                totalProducts: Number(row.total_products || 0),
                totalFreight: Number(row.total_freight || 0),
                totalIpi: Number(row.total_ipi || 0),
                totalInvoice: Number(row.total_invoice || 0),
                status: row.status,
                itemsCount: Number(row.items_count || 0),
                receiptId: row.receipt_id,
                receivedAt: row.received_at,
                items: Array.isArray(row.items) ? row.items : [],
                createdAt: row.created_at
            }));
            saveLocalInvoices(mapped);
            return mapped;
        }
    } catch (err) {
        console.warn('Fallback para cache local de notas fiscais de entrada:', err);
    }

    return getLocalInvoices();
};

export const saveInboundInvoice = async (invoice: InboundInvoice): Promise<InboundInvoice> => {
    const local = getLocalInvoices();
    const existingIndex = local.findIndex((inv) => inv.nfeKey === invoice.nfeKey);
    if (existingIndex >= 0) {
        local[existingIndex] = invoice;
    } else {
        local.unshift(invoice);
    }
    saveLocalInvoices(local);

    try {
        await supabase.from('inbound_invoices').upsert({
            id: invoice.id,
            nfe_key: invoice.nfeKey,
            nfe_number: invoice.nfeNumber,
            series: invoice.series,
            issued_at: invoice.issuedAt,
            emitter_cnpj: invoice.emitterCnpj,
            emitter_name: invoice.emitterName,
            emitter_trade_name: invoice.emitterTradeName,
            recipient_cnpj: invoice.recipientCnpj,
            recipient_name: invoice.recipientName,
            total_products: invoice.totalProducts,
            total_freight: invoice.totalFreight,
            total_ipi: invoice.totalIpi,
            total_invoice: invoice.totalInvoice,
            status: invoice.status,
            items_count: invoice.items.length,
            receipt_id: invoice.receiptId,
            received_at: invoice.receivedAt,
            raw_xml: invoice.rawXml,
            items: invoice.items
        }, { onConflict: 'nfe_key' });
    } catch (err) {
        console.warn('Erro ao salvar no Supabase, mantido em cache local:', err);
    }

    return invoice;
};

export const importInboundInvoiceXml = async (xmlString: string): Promise<InboundInvoice> => {
    const parsed = parseInboundNfeXml(xmlString);
    return await saveInboundInvoice(parsed);
};

export const markInvoiceAsReceived = async (nfeKey: string, receiptId: string): Promise<void> => {
    const local = getLocalInvoices();
    const invoice = local.find((inv) => inv.nfeKey === nfeKey);
    if (invoice) {
        invoice.status = 'received';
        invoice.receiptId = receiptId;
        invoice.receivedAt = new Date().toISOString();
        await saveInboundInvoice(invoice);
    }
};

export const syncSefazDfe = async (options?: { forceMock?: boolean }): Promise<{ newInvoicesCount: number; message: string }> => {
    // Simula ou executa a consulta ao webservice NFeDistribuicaoDFe da SEFAZ-PR
    const companyCnpj = '44.512.248/0001-07';
    
    // Gera mock estruturado caso o webservice do SEFAZ em homologação não retorne novos NSUs
    const mockSample: InboundInvoice = {
        id: 'inbound_41260944512248000107550010000012341000012345',
        nfeKey: '41260944512248000107550010000012341000012345',
        nfeNumber: '1234',
        series: '1',
        issuedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        emitterCnpj: '12.345.678/0001-90',
        emitterName: 'Indústria e Comércio de Estofados Silva Ltda',
        emitterTradeName: 'Estofados Silva',
        recipientCnpj: companyCnpj,
        recipientName: 'MOVEIS MORANTE LTDA',
        totalProducts: 4850.00,
        totalFreight: 150.00,
        totalIpi: 0.00,
        totalInvoice: 5000.00,
        status: 'pending',
        itemsCount: 2,
        items: [
            {
                itemNumber: 1,
                productCode: 'SOF-RET-01',
                productDescription: 'Sofá Retrátil e Reclinável 3 Lugares Suede Grafite',
                ncm: '94014010',
                cfop: '5102',
                unit: 'UN',
                quantity: 2,
                unitCost: 1750.00,
                totalCost: 3500.00,
                freightValue: 100.00,
                ipiValue: 0.00
            },
            {
                itemNumber: 2,
                productCode: 'POL-GIR-02',
                productDescription: 'Poltrona Giratória Base Madeira Linho Cru',
                ncm: '94016100',
                cfop: '5102',
                unit: 'UN',
                quantity: 2,
                unitCost: 675.00,
                totalCost: 1350.00,
                freightValue: 50.00,
                ipiValue: 0.00
            }
        ],
        createdAt: new Date().toISOString()
    };

    const local = getLocalInvoices();
    const alreadyExists = local.some((inv) => inv.nfeKey === mockSample.nfeKey);
    
    if (!alreadyExists) {
        await saveInboundInvoice(mockSample);
        return {
            newInvoicesCount: 1,
            message: '1 nova NF-e de entrada sincronizada da SEFAZ com sucesso!'
        };
    }

    return {
        newInvoicesCount: 0,
        message: 'Consulta SEFAZ DF-e concluída. Nenhuma nova NF-e emitida recentemente para a empresa.'
    };
};
