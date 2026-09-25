import { useState } from 'react';
import { toast } from 'react-toastify';
import Product from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { processProductData } from '../utils/LabelUtils';

export const ITEMS_PER_PAGE = 15;

interface UseLabelProductsProps {
    locationState?: any;
    productIdParam?: string | null;
}

export const useLabelProducts = (_props?: UseLabelProductsProps) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [hasMoreProducts, setHasMoreProducts] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
    const [productAddQty, setProductAddQty] = useState<number>(1);

    const fetchAllProducts = async (isLoadMore = false) => {
        // 1. Tentar Cache se não for "Carregar Mais"
        if (!isLoadMore) {
            const cached = sessionStorage.getItem('label_products_cache');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.length > 0) {
                        setProducts(parsed);
                        if (parsed.length >= ITEMS_PER_PAGE) return;
                    }
                } catch (e) {
                    console.error('Erro no cache de produtos:', e);
                }
            }
        }

        const from = isLoadMore ? products.length : 0;
        const to = from + ITEMS_PER_PAGE - 1;

        // 2. Busca Seletiva com colunas válidas (sem 'title') para economizar Banda (Egress)
        const { data, error } = await supabase
            .from('products')
            .select(`
                id, name, description, code, unit_price, cost_price,
                price, promo_price, stock, active, deleted_at, has_variations,
                category, unit, images, is_combo,
                variations:product_variations(
                    id, name, description, sku, price, promo_price, stock, image_url, active
                )
            `)
            .is('deleted_at', null)
            .order('description', { ascending: true })
            .range(from, to);

        if (data && !error) {
            const flattened = processProductData(data);
            const updatedProducts = isLoadMore ? [...products, ...flattened] : flattened;

            setProducts(updatedProducts);
            setHasMoreProducts(data.length === ITEMS_PER_PAGE);

            // Gravar no Cache para economizar requisições futuras
            sessionStorage.setItem('label_products_cache', JSON.stringify(updatedProducts));
        } else if (error) {
            console.error('Erro ao buscar produtos:', error);
            toast.error('Erro ao carregar produtos. Verifique sua conexão.');
        }
    };

    return {
        products,
        setProducts,
        hasMoreProducts,
        setHasMoreProducts,
        selectedProduct,
        setSelectedProduct,
        selectedProductToAdd,
        setSelectedProductToAdd,
        productAddQty,
        setProductAddQty,
        fetchAllProducts,
        ITEMS_PER_PAGE,
    };
};
