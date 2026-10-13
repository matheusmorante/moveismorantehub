import { supabase } from '../supabaseConfig';
import {
  type FiscalDocumentStatusRow,
  isAuthorizedFiscalDocument,
  isOutboundFiscalDocument,
} from './orderFiscalBadgeRules';

export interface AuthorizedFiscalDocument extends FiscalDocumentStatusRow {
  id: string;
  order_id: string;
  status: string;
  document_type: string;
  ambiente: number;
  modelo?: string;
  created_at?: string;
}

/**
 * Localiza documento fiscal de saída (NF-e mod 55 ou NFC-e mod 65) efetivamente AUTORIZADO
 * para a venda original.
 *
 * Regras de negócio:
 * 1. Documentos rejeitados, pendentes, com erro de transmissão, denegados ou abandonados NÃO são autorizados.
 * 2. Documentos cancelados NÃO são válidos para devolução fiscal.
 * 3. Documentos de devolução/estorno não são documentos de saída da venda original.
 * 4. Apenas status 'autorizada' (ambiente 1) ou 'homologada' (ambiente 2) configuram emissão válida.
 * 5. Se nenhum documento estiver autorizado, retorna null (devolução puramente comercial).
 */
export async function findAuthorizedFiscalDocument(
  orderId: string,
  options: { throwOnError?: boolean; environment?: 1 | 2 } = {}
): Promise<AuthorizedFiscalDocument | null> {
  if (!orderId) return null;

  try {
    let query = supabase
      .from('nfe_documents')
      .select('id,order_id,status,document_type,ambiente,modelo,created_at')
      .eq('order_id', orderId)
      .in('status', ['autorizada', 'homologada'])
      .in('modelo', ['55', '65']);
    if (options.environment !== undefined) {
      query = query.eq('ambiente', options.environment);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      if (options.throwOnError) {
        throw new Error('Não foi possível consultar a nota fiscal autorizada vinculada ao pedido.', {
          cause: error,
        });
      }
      console.warn('Não foi possível consultar documentos fiscais vinculados ao pedido:', error);
      return null;
    }

    const documents = (data || []) as AuthorizedFiscalDocument[];
    const authorized = documents.find(
      (doc) =>
        isOutboundFiscalDocument(doc) &&
        isAuthorizedFiscalDocument(doc) &&
        (options.environment === undefined || doc.ambiente === options.environment)
    );

    return authorized || null;
  } catch (err) {
    if (options.throwOnError) {
      if (err instanceof Error) throw err;
      throw new Error('Não foi possível consultar a nota fiscal autorizada vinculada ao pedido.', {
        cause: err,
      });
    }
    console.warn('Exceção ao consultar documento fiscal autorizado:', err);
    return null;
  }
}
