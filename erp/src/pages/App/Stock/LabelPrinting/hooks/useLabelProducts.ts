import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Product from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { parseVariationImages } from '@/pages/utils/productService/productImageHelpers';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { processProductData } from '../utils/processLabelProductData';

export const ITEMS_PER_PAGE = 15;

interface UseLabelProductsProps {
  locationState?: any;
  productIdParam?: string | null;
  variationIdParam?: string | null;
  autoAddProductParam?: boolean;
}

export const useLabelProducts = (props?: UseLabelProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
  const [productAddQty, setProductAddQty] = useState<number>(1);
  const [linkedProduct, setLinkedProduct] = useState<{
    id: string;
    variationId: string | null;
    product: Product;
  } | null>(null);

  const productIdParam = props?.autoAddProductParam ? props.productIdParam?.trim() || null : null;
  const variationIdParam = props?.autoAddProductParam ? props.variationIdParam?.trim() || null : null;
  const initialProduct =
    linkedProduct?.id === productIdParam && linkedProduct.variationId === variationIdParam
      ? linkedProduct.product
      : null;

  useEffect(() => {
    let current = true;
    if (!productIdParam) {
      setLinkedProduct(null);
      return () => {
        current = false;
      };
    }

    setLinkedProduct(null);
    void (async () => {
      try {
        const response = await withTimeout(
          supabase
            .from('products')
            .select(
              variationIdParam
                ? 'id, name, description, code, sku, unit_price, cost_price, promo_price, stock, active, deleted_at, has_variations, category, unit, images, variations:product_variations(*)'
                : 'id, name, description, code, sku, unit_price, cost_price, promo_price, stock, active, deleted_at, has_variations, category, unit, images'
            )
            .eq('id', productIdParam)
            .is('deleted_at', null)
            .maybeSingle(),
          10000,
          null,
          'etiqueta-preço:carregar-produto'
        );

        if (!current) return;
        if (!response) throw new Error('A consulta do produto para etiqueta excedeu o prazo.');
        if (response.error) throw response.error;
        if (!response.data) throw new Error('Produto não encontrado para a etiqueta de preço.');
        const productData = response.data as Record<string, any>;

        let product: Product | undefined;
        if (variationIdParam) {
          const variation = Array.isArray(productData.variations)
            ? productData.variations.find((item: any) => item?.id === variationIdParam)
            : null;
          if (!variation) throw new Error('Variação não encontrada para a etiqueta.');
          const variationImages = parseVariationImages(variation.image_url, variation.images);
          product = processProductData([
            {
              ...productData,
              has_variations: true,
              hasVariations: true,
              variations: [{ ...variation, images: variationImages }],
            },
          ]).find((item: any) => item?.variationId === variationIdParam) as Product | undefined;
        } else {
          product = processProductData([productData])[0] as Product | undefined;
        }
        if (!product) throw new Error('Não foi possível preparar o produto para a etiqueta.');
        setLinkedProduct({ id: productIdParam, variationId: variationIdParam, product });
      } catch (cause) {
        if (!current) return;
        toast.error(cause instanceof Error ? cause.message : 'Falha ao carregar produto para etiqueta.');
      }
    })();

    return () => {
      current = false;
    };
  }, [productIdParam, variationIdParam]);

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
    initialProduct,
    setSelectedProductToAdd,
    productAddQty,
    setProductAddQty,
    fetchAllProducts,
    ITEMS_PER_PAGE,
  };
};
