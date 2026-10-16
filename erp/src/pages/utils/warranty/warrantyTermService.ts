import type Order from '@/pages/types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';
import { generateWarrantyPdf } from './warrantyPdfGenerator';
import type {
  GeneratedWarrantyPdf,
  WarrantyTermRecord,
  WarrantyCompanyInfo,
} from './warrantyTypes';
import {
  WARRANTY_WHATSAPP_MESSAGE,
  sendWarrantyTermWhatsApp,
  sendDirectWarrantyTermViaMetaApi,
} from './warrantyWhatsAppService';

// Re-exporta serviços de WhatsApp para compatibilidade
export {
  WARRANTY_WHATSAPP_MESSAGE,
  sendWarrantyTermWhatsApp,
  sendDirectWarrantyTermViaMetaApi,
};

export async function prepareWarrantyBackendValidation(orderId: string): Promise<{
  order_id: string;
  order_number: string;
  status: string;
  order_type: string;
  date: string;
  customer_id?: string;
  customer_name?: string;
  items: any[];
  next_version: number;
  order_data?: any;
}> {
  const { data, error } = await supabase.rpc('prepare_warranty_term', {
    p_order_id: orderId,
  });

  if (error) {
    console.error('[prepareWarrantyBackendValidation] Erro retornado pela RPC:', error);
    throw new Error(error.message || 'Falha na validação do pedido pelo backend.');
  }

  return data;
}

export async function fetchWarrantyTermsByOrderId(orderId: string): Promise<WarrantyTermRecord[]> {
  const { data, error } = await supabase
    .from('warranty_terms')
    .select('*')
    .eq('order_id', orderId)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('[fetchWarrantyTermsByOrderId] Erro ao buscar registros:', error);
    return [];
  }

  return (data || []) as WarrantyTermRecord[];
}

export async function generateAndSaveWarrantyTerm(
  order: Order,
  companyInfoOverride?: WarrantyCompanyInfo
): Promise<{ record: WarrantyTermRecord; generatedPdf: GeneratedWarrantyPdf }> {
  if (!order.id) {
    throw new Error('Identificador do pedido ausente.');
  }

  // 1. Validação no backend via RPC para garantir que o pedido existe, é válido e não é rascunho
  const validation = await prepareWarrantyBackendValidation(order.id);
  const nextVersion = validation.next_version || 1;

  // 2. Obter configurações da loja
  const settings = getSettings();
  const companyInfo: WarrantyCompanyInfo = companyInfoOverride || {
    name: settings.companyName || 'Móveis Morante',
    cnpj: settings.companyCnpj || '44.512.248.0001/07',
    phone: settings.companyPhone || '(41) 99749-3547',
    telephoneCall: '(41) 99224-4631',
    address: settings.companyAddress || 'R. Cascavel, 306 - Guaraituba, Colombo - PR, 83410-270',
    contactEmail: 'contato@moveismorante.com.br',
    openingHours: 'Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 13:00',
  };

  // 3. Geração determinística do PDF com jsPDF
  const generatedPdf = await generateWarrantyPdf({
    order,
    version: nextVersion,
    companyInfo,
  });

  // 4. Upload para o Supabase Storage (bucket warranty-terms)
  const storagePath = `${order.id}/termo_garantia_v${nextVersion}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('warranty-terms')
    .upload(storagePath, generatedPdf.pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  let publicUrl = '';
  if (!uploadError) {
    const { data: urlData } = supabase.storage
      .from('warranty-terms')
      .getPublicUrl(storagePath);
    publicUrl = urlData?.publicUrl || '';
  } else {
    console.warn('[generateAndSaveWarrantyTerm] Aviso no upload ao Storage:', uploadError);
  }

  // 5. Inserção do registro de auditoria e rastreabilidade na tabela warranty_terms
  const customer = order.customerData;
  const insertPayload = {
    order_id: order.id,
    customer_id: customer?.id || validation.customer_id || null,
    customer_name: customer?.fullName || validation.customer_name || 'Cliente',
    customer_phone: customer?.phone || null,
    document_version: nextVersion,
    file_name: generatedPdf.fileName,
    file_path: storagePath,
    file_url: publicUrl,
    file_hash_sha256: generatedPdf.sha256,
    delivery_status: 'not_sent',
    generated_at: new Date().toISOString(),
  };

  const { data: insertedData, error: insertError } = await supabase
    .from('warranty_terms')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    console.error('[generateAndSaveWarrantyTerm] Erro ao gravar registro na tabela:', insertError);
    throw new Error('Falha ao registrar termo de garantia no banco de dados.');
  }

  return {
    record: insertedData as WarrantyTermRecord,
    generatedPdf,
  };
}

export function printWarrantyTermDocument(pdfUrl: string) {
  if (!pdfUrl) {
    toast.error('URL do documento não disponível para impressão.');
    return;
  }

  // Abre janela do navegador direcionada ao PDF ou iframe de impressão
  const printWindow = window.open(pdfUrl, '_blank');
  if (printWindow) {
    printWindow.focus();
  } else {
    toast.info('Selecione a opção Imprimir no visualizador aberto.');
  }
}
