import { supabase } from '../../supabaseConfig';
import { InboundInvoice } from '../types/inboundNfeTypes';
import { isValidUuid } from '../../uuidUtils';
import { getLocalInvoices, saveLocalInvoices } from './inboundCacheService';
import { isSampleInvoice } from './inboundNormalizationService';
import { parseInboundNfeXml } from '../utils/inboundXmlParser';

export const deleteInboundInvoice = async (invoiceIdOrKey: string): Promise<void> => {
    // A remoção é deliberadamente limitada ao cabeçalho da NF e aos seus itens
    // dependentes. Produtos, códigos de fornecedor e recebimentos são entidades
    // independentes e não recebem nenhuma atualização ou exclusão neste fluxo.
    try {
        let error: { message?: string } | null = null;

        if (isValidUuid(invoiceIdOrKey)) {
            ({ error } = await supabase
                .from('inbound_invoices')
                .delete()
                .eq('id', invoiceIdOrKey));
        } else {
            const cleanKey = invoiceIdOrKey.replace(/^inbound_/, '').replace(/\D/g, '');
            if (cleanKey.length === 44) {
                ({ error } = await supabase
                    .from('inbound_invoices')
                    .delete()
                    .eq('chave_acesso', cleanKey));
            }
        }

        if (error) throw new Error(error.message || 'Não foi possível remover a NF de entrada.');

        const local = getLocalInvoices().filter((inv) =>
            inv.id !== invoiceIdOrKey && inv.nfeKey !== invoiceIdOrKey && !isSampleInvoice(inv)
        );
        saveLocalInvoices(local);
    } catch (err) {
        console.warn('Erro ao deletar NF no Supabase:', err);
        throw err;
    }
};

export const saveInboundInvoice = async (invoice: InboundInvoice): Promise<InboundInvoice> => {
    if (isSampleInvoice(invoice)) return invoice;
    const accessKey = (invoice.nfeKey || '').replace(/\D/g, '');
    const validId = isValidUuid(invoice.id) ? invoice.id : crypto.randomUUID();
    const invoiceToSave: InboundInvoice = { ...invoice, id: validId, nfeKey: accessKey };
    const local = getLocalInvoices().filter((inv) => !isSampleInvoice(inv));
    const existingIndex = accessKey
        ? local.findIndex((inv) => inv.nfeKey === accessKey)
        : local.findIndex((inv) => inv.id === validId);
    if (existingIndex >= 0) {
        local[existingIndex] = invoiceToSave;
    } else {
        local.unshift(invoiceToSave);
    }
    saveLocalInvoices(local);

    try {
        const payload: Record<string, any> = {
            id: validId,
            chave_acesso: accessKey || null,
            numero_nfe: Number((invoice.nfeNumber || '').replace(/\D/g, '')) || 0,
            serie: invoice.series || '1',
            data_emissao: invoice.issuedAt || new Date().toISOString(),
            emitente_cnpj: invoice.emitterCnpj || '',
            emitente_nome: invoice.emitterName || '',
            emitente_fantasia: invoice.emitterTradeName || null,
            emitente_ie: invoice.emitterIe || null,
            emitente_endereco: invoice.emitterAddress || {},
            supplier_id: invoice.supplierId || null,
            destinatario_cnpj: invoice.recipientCnpj || '',
            destinatario_nome: invoice.recipientName || '',
            valor_produtos: invoice.totalProducts || 0,
            valor_frete: invoice.totalFreight || 0,
            valor_ipi: invoice.totalIpi || 0,
            valor_desconto: invoice.totalDiscount || 0,
            valor_seguro: invoice.totalInsurance || 0,
            outras_despesas: invoice.totalOtherExpenses || 0,
            valor_icms: invoice.totalIcms || 0,
            valor_icms_st: invoice.totalIcmsSt || 0,
            data_saida_entrada: invoice.entryExitAt || null,
            natureza_operacao: invoice.operationNature || null,
            modelo: invoice.model || null,
            protocolo: invoice.protocol || null,
            informacoes_adicionais: invoice.additionalInfo || null,
            documento_original_path: invoice.originalDocumentPath || null,
            documento_original_mime: invoice.originalDocumentMime || null,
            origem_importacao: invoice.originalDocumentPath ? 'documento' : 'xml',
            extraction_warnings: invoice.extractionWarnings || [],
            extraction_confidence: invoice.extractionConfidence || {},
            extraction_status: invoice.extractionStatus || 'completed',
            extraction_processed_at: invoice.processedAt || null,
            extraction_ai_model: invoice.aiModel || null,
            raw_extraction: invoice.rawExtraction || null,
            valor_total: invoice.totalInvoice || 0,
            status_recebimento: invoice.status === 'received' ? 'recebida' : invoice.status === 'manifested' ? 'manifestada' : 'pendente',
            receipt_id: invoice.receiptId || null,
            xml_conteudo: invoice.rawXml || null,
            itens: invoice.items || [],
            updated_at: new Date().toISOString(),
        };

        const onConflict = accessKey.length === 44 ? 'chave_acesso' : 'id';
        const { error } = await supabase.from('inbound_invoices').upsert(payload, { onConflict });
        if (error) {
            console.warn('Alerta upsert Supabase:', error);
        } else if (Array.isArray(invoice.items) && invoice.items.length > 0) {
            // Sincronizar itens na tabela normalizada inbound_invoice_items
            try {
                const itemRows = invoice.items.map((item, idx) => {
                    const desc = item.productDescription || (item as any).descricao || (item as any).xProd || 'Item sem descrição';
                    const code = item.productCode || (item as any).codigo || (item as any).cProd || '';
                    const qty = Number(item.quantity ?? (item as any).quantidade ?? 0);
                    const uCost = Number(item.unitCost ?? (item as any).valorUnitario ?? (item as any).valor_unitario ?? 0);
                    const tCost = Number(item.totalCost ?? (item as any).valorTotal ?? (item as any).valor_total ?? (qty * uCost));

                    return {
                        inbound_invoice_id: validId,
                        item_index: Number(item.itemNumber ?? (item as any).numeroItem ?? idx + 1),
                        codigo_produto: String(code),
                        descricao: String(desc),
                        ncm: item.ncm || null,
                        cfop: item.cfop || null,
                        unidade: item.unit || (item as any).unidade || 'UN',
                        quantidade: qty,
                        valor_unitario: uCost,
                        valor_total: tCost,
                        valor_desconto: Number(item.discountValue ?? (item as any).valorDesconto ?? 0),
                        valor_frete: Number(item.freightValue ?? (item as any).valorFrete ?? 0),
                        valor_seguro: Number(item.insuranceValue ?? (item as any).valorSeguro ?? 0),
                        outras_despesas: Number(item.otherExpensesValue ?? (item as any).outrasDespesas ?? 0),
                        item_snapshot: {
                            ...item,
                            productDescription: desc,
                            productCode: code,
                            quantity: qty,
                            unitCost: uCost,
                            totalCost: tCost,
                        },
                    };
                });
                await supabase.from('inbound_invoice_items').upsert(itemRows, { onConflict: 'inbound_invoice_id,item_index' });
            } catch (itemErr) {
                console.warn('Alerta ao persistir itens normalizados em inbound_invoice_items:', itemErr);
            }
        }
    } catch (err) {
        console.warn('Erro ao salvar no Supabase, mantido em cache local:', err);
    }

    return invoiceToSave;
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
