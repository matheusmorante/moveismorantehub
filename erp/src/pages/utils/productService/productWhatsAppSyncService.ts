import Product, { Variation } from '../../types/product.type';
import { MAX_PARENT_PRODUCT_IMAGES } from './productImageHelpers';
import { getLocalProducts } from './productLocalCache';
import { saveProduct, updateProduct } from './productMutationService';

export const syncFromWhatsApp = async (whatsappProduct: any): Promise<string> => {
    try {
        let existingProduct = null;
        const cleanRetailerId = whatsappProduct.retailer_id?.trim();
        const products = getLocalProducts().filter(p => !p.deleted);

        if (cleanRetailerId) {
            existingProduct = products.find(p => p.code === cleanRetailerId) || null;
        }

        if (!existingProduct && whatsappProduct.name) {
            const cleanName = whatsappProduct.name.trim().toLowerCase();
            existingProduct = products.find(p => p.description.toLowerCase().includes(cleanName)) || null;

            if (!existingProduct) {
                const words = cleanName.split(' ').filter((w: string) => w.length > 3);
                if (words.length >= 2) {
                    existingProduct = products.find(p => {
                        const desc = p.description.toLowerCase();
                        return desc.includes(words[0]) && desc.includes(words[1]);
                    }) || null;
                }
            }
        }

        if (existingProduct) {
            let currentImages = Array.isArray(existingProduct.images) ? existingProduct.images : [];
            if (whatsappProduct.image_url && !currentImages.includes(whatsappProduct.image_url)) {
                currentImages = [whatsappProduct.image_url, ...currentImages].slice(0, MAX_PARENT_PRODUCT_IMAGES);
            }

            await updateProduct(String(existingProduct.id), {
                images: currentImages,
                whatsappDescription: whatsappProduct.description || existingProduct.whatsappDescription,
            });
            
            return String(existingProduct.id);
        } else {
            const newProduct: Partial<Product> = {
                description: whatsappProduct.name,
                unitPrice: Number(whatsappProduct.price?.replace(/[^0-9.-]+/g, "") || 0),
                images: whatsappProduct.image_url ? [whatsappProduct.image_url] : [],
                whatsappDescription: whatsappProduct.description,
                isDraft: true,
                active: false,
                status: 'draft',
                itemType: 'product',
                brand: 'Móveis Morante',
                condition: 'novo',
                code: cleanRetailerId
            };
            
            return await saveProduct(newProduct as Product);
        }
    } catch (error) {
        console.error("[WhatsAppSync] Falha crítica na sincronização:", error);
        throw error;
    }
};
