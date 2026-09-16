import { supabase } from '../../supabaseConfig';
import { InboundInvoice } from '../types/inboundNfeTypes';
import { isValidUuid } from '../../uuidUtils';

/**
 * Garante que a NF de entrada tenha uma cópia/snapshot no bucket de anexos de recebimento (`purchase-attachments`),
 * permitindo que o recebimento preserve o anexo de forma independente e perpétua mesmo se a NF de entrada for removida.
 */
export const ensureInboundInvoiceAttachment = async (invoice: InboundInvoice): Promise<string | null> => {
    if (!invoice) return null;

    try {
        let docPath = invoice.originalDocumentPath;
        let xmlContent = invoice.rawXml;

        // Se faltar path ou xml e tiver ID válido, busca do Supabase para garantir
        if ((!docPath || !xmlContent) && isValidUuid(invoice.id)) {
            const { data } = await supabase
                .from('inbound_invoices')
                .select('documento_original_path, documento_original_mime, xml_conteudo')
                .eq('id', invoice.id)
                .maybeSingle();

            if (data) {
                if (!docPath && data.documento_original_path) docPath = data.documento_original_path;
                if (!xmlContent && data.xml_conteudo) xmlContent = data.xml_conteudo;
            }
        }

        // 1. Tenta transferir o documento original (PDF/imagem) para o bucket de recebimentos
        if (docPath) {
            const { data: fileBlob, error: downloadErr } = await supabase.storage
                .from('inbound-invoice-documents')
                .download(docPath);

            if (!downloadErr && fileBlob) {
                const rawName = docPath.split('/').pop() || 'documento.pdf';
                const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
                const targetPath = `receipts/${Date.now()}-NFe_${invoice.nfeNumber || invoice.nfeKey || 'entrada'}_${cleanName}`;
                const { error: uploadErr } = await supabase.storage
                    .from('purchase-attachments')
                    .upload(targetPath, fileBlob, {
                        contentType: invoice.originalDocumentMime || fileBlob.type || 'application/pdf',
                        upsert: true,
                    });

                if (!uploadErr) {
                    return targetPath;
                }
            }
        }

        // 2. Se não tinha PDF mas tinha XML, gera um anexo fake do XML para servir de histórico
        if (xmlContent) {
            const xmlBlob = new Blob([xmlContent], { type: 'application/xml' });
            const targetPath = `receipts/${Date.now()}-NFe_${invoice.nfeNumber || invoice.nfeKey || 'entrada'}_XML.xml`;
            const { error: uploadErr } = await supabase.storage
                .from('purchase-attachments')
                .upload(targetPath, xmlBlob, {
                    contentType: 'application/xml',
                    upsert: true,
                });

            if (!uploadErr) {
                return targetPath;
            }
        }
    } catch (err) {
        console.warn('Falha silenciosa ao processar anexo legado de NF-e para recebimento:', err);
    }

    return null;
};
