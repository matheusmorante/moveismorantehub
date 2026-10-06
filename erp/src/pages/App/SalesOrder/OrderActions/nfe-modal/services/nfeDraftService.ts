import { supabase } from '@/pages/utils/supabaseConfig';
import type Order from '@/pages/types/order.type';
import type { NfeItemWithFiscal } from '../NfeItemsSection';

export async function saveNfeDraftToDatabase(
  order: Order | null,
  recipientTaxId: string,
  nfeItems: NfeItemWithFiscal[]
): Promise<void> {
  if (!order?.id) return;
  try {
    // 1. Save NCM to products table
    const productsToUpdate = nfeItems
      .filter((i) => i.productId && i.fiscal?.ncm)
      .map((i) => ({ id: i.productId, ncm: i.fiscal.ncm.replace(/\D/g, '') }));

    if (productsToUpdate.length > 0) {
      for (const p of productsToUpdate) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('fiscal')
          .eq('id', p.id)
          .single();
        if (existingProduct) {
          const newFiscal = { ...(existingProduct.fiscal || {}), ncm: p.ncm };
          await supabase.from('products').update({ fiscal: newFiscal }).eq('id', p.id);
        }
      }
    }

    // 2. Save order_data to orders table; a modal-only tax ID must not rewrite the customer profile.
    const updatedOrder = {
      ...order,
      customerData: {
        ...order.customerData,
        cpfCnpj: recipientTaxId,
        document: recipientTaxId,
      },
      items: order.items.map((it, idx) => ({
        ...it,
        fiscal: {
          ...(it.fiscal || {}),
          ncm: nfeItems[idx]?.fiscal?.ncm || it.fiscal?.ncm || '',
        },
      })),
    };
    await supabase.from('orders').update({ order_data: updatedOrder }).eq('id', order.id);
  } catch (err) {
    console.warn('[nfeDraftService] Erro ao salvar os dados da emissão:', err);
  }
}
