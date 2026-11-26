import { useState, useEffect, useCallback } from 'react';
import type Product from '@/pages/types/product.type';
import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../../../shared-utils/core/withTimeout';

interface UseVariationFormReferencesOptions {
  isOpen: boolean;
  parentId?: string;
  parentProduct: Product;
  session: { active: boolean; lock: boolean };
}

export function useVariationFormReferences({
  isOpen,
  parentId,
  parentProduct,
  session,
}: UseVariationFormReferencesOptions) {
  const [parentImagesError, setParentImagesError] = useState('');
  const [loadingParentImages, setLoadingParentImages] = useState(false);
  const [imageQueryRevision, setImageQueryRevision] = useState(0);
  const [allParentImages, setAllParentImages] = useState<string[]>([]);

  useEffect(() => {
    let accepting = true;
    if (isOpen) {
      setAllParentImages([]);
      setParentImagesError('');

      // During product editing, the form state is authoritative. Fetching the
      // persisted gallery here can bring back photos removed in the unsaved form.
      if (Array.isArray(parentProduct?.images)) {
        setAllParentImages(parentProduct.images.filter(Boolean));
        setLoadingParentImages(false);
        return () => {
          accepting = false;
        };
      }

      setLoadingParentImages(true);
      const realParentId = parentProduct?.parentId || parentId || parentProduct?.id;
      if (realParentId) {
        void withTimeout(
          supabase
            .from('product_images')
            .select('image_url')
            .eq('product_id', realParentId)
            .order('created_at', { ascending: true }),
          10000,
          null,
          'variacao:fotos-pai'
        )
          .then((response) => {
            if (!session.active || !accepting) return;
            if (!response || response.error || !Array.isArray(response.data)) {
              throw new Error('Fotos não confirmadas.');
            }
            const databaseImages = response.data.map((i) => i.image_url).filter(Boolean);
            setAllParentImages(Array.from(new Set(databaseImages)));
          })
          .catch(() => {
            if (session.active && accepting) {
              setParentImagesError('Não foi possível carregar as fotos do produto pai. Consulte novamente.');
            }
          })
          .finally(() => {
            if (session.active && accepting) {
              setLoadingParentImages(false);
            }
          });
      } else {
        setAllParentImages(parentProduct.images || []);
        setLoadingParentImages(false);
      }
    }
    return () => {
      accepting = false;
    };
  }, [
    isOpen,
    session,
    parentProduct.parentId,
    parentProduct.id,
    parentProduct.images,
    parentId,
    imageQueryRevision,
  ]);

  const retryParentImages = useCallback(() => {
    if (session.active && !session.lock) {
      setImageQueryRevision((value) => value + 1);
    }
  }, [session]);

  return {
    allParentImages,
    setAllParentImages,
    parentImagesError,
    loadingParentImages,
    retryParentImages,
  };
}
