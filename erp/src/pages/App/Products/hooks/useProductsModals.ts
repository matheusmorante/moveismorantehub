import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Product, { Variation } from '../../types/product.type';
import { resolveProductVariation } from '../utils/resolveProductVariation';
import {
  generateVariationSku,
  getFullProduct,
  getNextSequentialProductCode,
} from '@/pages/utils/productService';
import { copyProductImages } from '@/pages/utils/storageService';
import { MAX_VARIATION_IMAGES } from '@/pages/utils/productImageLimits';

export interface StockLaunchTarget {
  product?: Product | null;
  variation?: Variation;
}

export function useProductsModals() {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<Product> | null>(null);

  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState<Variation | null>(null);
  const [variationParentProduct, setVariationParentProduct] = useState<Product | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockLaunchTarget, setStockLaunchTarget] = useState<StockLaunchTarget | null>(null);

  const openNewProduct = useCallback((mode: 'standard' | 'composition' = 'standard') => {
    setEditingProduct(null);
    setInitialFormData(mode === 'composition' ? { itemType: 'composition' } : null);
    setIsFormModalOpen(true);
  }, []);

  const openEditProduct = useCallback((p: Product, readOnly: boolean) => {
    if (readOnly) {
      setViewingProduct(p);
      return;
    }
    if (p.isVariation) {
      setVariationParentProduct(p);
      setEditingVariation(resolveProductVariation(p));
      setIsVariationModalOpen(true);
    } else {
      setEditingProduct(p);
      setIsFormModalOpen(true);
    }
  }, []);

  const openDuplicateProduct = useCallback(async (product: Product) => {
    try {
      const source = product.id ? await getFullProduct(product.id) : product;
      if (!source) throw new Error('Não foi possível carregar os dados completos do produto.');
      const code = await getNextSequentialProductCode();
      const sourceImages = Array.isArray(source.images) ? source.images : [];
      let images = sourceImages;
      if (sourceImages.length > 0) {
        try {
          images = await copyProductImages(sourceImages);
        } catch (error) {
          console.warn('[Products] Não foi possível criar cópias independentes das fotos:', error);
          toast.warn('As fotos originais foram mantidas porque não foi possível copiá-las.');
        }
      }
      const variationImages =
        (source.variations || []).length === 1
          ? images
          : images.slice(0, MAX_VARIATION_IMAGES);
      const duplicate: Product = {
        ...source,
        id: undefined,
        code,
        sku: code,
        createdAt: undefined,
        updatedAt: undefined,
        deleted: false,
        parentId: undefined,
        isVariation: false,
        isDraft: true,
        active: false,
        status: 'draft',
        images,
        variations: (source.variations || []).map((variation, index) => {
          const copy = {
            ...variation,
            id: crypto.randomUUID(),
            isVirtual: false,
            mergedToVariationId: undefined,
            sku: generateVariationSku(code, index),
            images: [...variationImages],
            active: false,
            status: 'draft' as const,
          };
          delete (copy as any).image_url;
          delete (copy as any).imageUrl;
          return copy;
        }),
      };
      setEditingProduct(duplicate);
      setInitialFormData(null);
      setIsFormModalOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível preparar a cópia do produto.'
      );
    }
  }, []);

  const openShowHistory = useCallback((p: Product) => {
    setHistoryProduct(p);
    setIsHistoryModalOpen(true);
  }, []);

  const openLaunchStock = useCallback((p: Product) => {
    if (p.isVariation) {
      setStockLaunchTarget({ variation: resolveProductVariation(p) });
    } else {
      setStockLaunchTarget({ product: p });
    }
    setIsStockModalOpen(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    setEditingProduct(null);
    setInitialFormData(null);
  }, []);

  const closeVariationModal = useCallback(() => {
    setIsVariationModalOpen(false);
    setEditingVariation(null);
    setVariationParentProduct(null);
  }, []);

  const closeHistoryModal = useCallback(() => {
    setIsHistoryModalOpen(false);
    setHistoryProduct(null);
  }, []);

  const closeStockModal = useCallback(() => {
    setIsStockModalOpen(false);
    setStockLaunchTarget(null);
  }, []);

  const closeViewingProduct = useCallback(() => {
    setViewingProduct(null);
  }, []);

  return {
    // State
    isFormModalOpen,
    editingProduct,
    viewingProduct,
    initialFormData,
    isVariationModalOpen,
    editingVariation,
    variationParentProduct,
    isHistoryModalOpen,
    historyProduct,
    isStockModalOpen,
    stockLaunchTarget,

    // Handlers
    openNewProduct,
    openEditProduct,
    openDuplicateProduct,
    openShowHistory,
    openLaunchStock,
    closeFormModal,
    closeVariationModal,
    closeHistoryModal,
    closeStockModal,
    closeViewingProduct,
  };
}
