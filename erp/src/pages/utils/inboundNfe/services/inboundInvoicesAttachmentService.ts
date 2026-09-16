import { supabase } from '../../supabaseConfig';
import { isValidUuid } from '../../uuidUtils';
import { InboundInvoice } from '../types/inboundNfeTypes';

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
                    const { data } = supabase.storage.from('purchase-attachments').getPublicUrl(targetPath);
                    if (data?.publicUrl) return data.publicUrl;
                }
            } else {
                // Fallback: tenta obter signedUrl do bucket original caso não consiga baixar diretamente
                const { data: signed } = await supabase.storage
                    .from('inbound-invoice-documents')
                    .createSignedUrl(docPath, 60 * 60 * 24 * 365 * 10);
                if (signed?.signedUrl) return signed.signedUrl;
            }
        }

        // 2. Se tem XML disponível (importação por XML ou consulta SEFAZ), salva o XML como anexo no recebimento
        if (xmlContent) {
            const xmlBlob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
            const targetPath = `receipts/${Date.now()}-NFe_${invoice.nfeNumber || invoice.nfeKey || 'entrada'}.xml`;
            const { error: uploadErr } = await supabase.storage
                .from('purchase-attachments')
                .upload(targetPath, xmlBlob, {
                    contentType: 'application/xml',
                    upsert: true,
                });

            if (!uploadErr) {
                const { data } = supabase.storage.from('purchase-attachments').getPublicUrl(targetPath);
                if (data?.publicUrl) return data.publicUrl;
            }
        }
    } catch (err) {
        console.warn('[inboundNfe] Erro ao criar anexo snapshot da NF de entrada para o recebimento:', err);
    }

    return null;
};
