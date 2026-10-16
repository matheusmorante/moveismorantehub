import { useState, useEffect, useCallback } from 'react';
import type Product from '@/pages/types/product.type';
import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { sortAttributeValuesNaturally } from '@/pages/utils/attributeValueSorting';

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
  const [referenceErrors, setReferenceErrors] = useState({ attributes: '', images: '' });
  const [referenceLoading, setReferenceLoading] = useState({ attributes: false, images: false });
  const [imageQueryRevision, setImageQueryRevision] = useState(0);

  const [dbAttributes, setDbAttributes] = useState<{ id: string; name: string }[]>([
    { id: 'b9d3bcb2-18fb-4c87-8bcc-a59fc4300870', name: 'Cor' },
    { id: 'a50a7b4d-aad6-4dfe-aae0-a909e4b9bc06', name: 'Tamanho' },
  ]);
  const [dbAttributeValues, setDbAttributeValues] = useState<
    { id: string; attribute_id: string; value: string }[]
  >([]);
  const [isManageAttributesOpen, setIsManageAttributesOpen] = useState(false);
  const [allParentImages, setAllParentImages] = useState<string[]>([]);

  const fetchDbAttributes = useCallback(async () => {
    if (!session.active || session.lock) return;
    setReferenceLoading((previous) => ({ ...previous, attributes: true }));
    setReferenceErrors((previous) => ({ ...previous, attributes: '' }));
    try {
      const result = await withTimeout(
        Promise.all([
          supabase.from('attributes').select('*').order('name'),
          supabase.from('attribute_values').select('*').order('value'),
        ]),
        10000,
        null,
        'variacao:atributos'
      );
      if (!session.active) return;
      if (!result || result.some((response) => response.error || !Array.isArray(response.data))) {
        throw new Error('Não foi possível carregar os atributos. Consulte novamente.');
      }
      const [attrRes, valRes] = result;
      setDbAttributes(attrRes.data as { id: string; name: string }[]);
      setDbAttributeValues(
        sortAttributeValuesNaturally(
          (valRes.data || []) as { id: string; attribute_id: string; value: string }[]
        )
      );
    } catch {
      if (session.active) {
        setReferenceErrors((previous) => ({
          ...previous,
          attributes: 'Não foi possível carregar os atributos. Consulte novamente.',
        }));
      }
    } finally {
      if (session.active) {
        setReferenceLoading((previous) => ({ ...previous, attributes: false }));
      }
    }
  }, [session]);

  useEffect(() => {
    let accepting = true;
    if (isOpen) {
      setAllParentImages([]);
      setReferenceLoading((previous) => ({ ...previous, images: true }));
      setReferenceErrors((previous) => ({ ...previous, images: '' }));
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
            const formImages = (parentProduct?.images || []).filter(Boolean);
            setAllParentImages(Array.from(new Set([...databaseImages, ...formImages])));
          })
          .catch(() => {
            if (session.active && accepting) {
              setReferenceErrors((previous) => ({
                ...previous,
                images: 'Não foi possível carregar as fotos do produto pai. Consulte novamente.',
              }));
            }
          })
          .finally(() => {
            if (session.active && accepting) {
              setReferenceLoading((previous) => ({ ...previous, images: false }));
            }
          });
      } else {
        setAllParentImages(parentProduct.images || []);
        setReferenceLoading((previous) => ({ ...previous, images: false }));
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

  const retryReferences = useCallback(() => {
    if (session.active && !session.lock) {
      void fetchDbAttributes();
      setImageQueryRevision((value) => value + 1);
    }
  }, [session, fetchDbAttributes]);

  return {
    dbAttributes,
    dbAttributeValues,
    isManageAttributesOpen,
    setIsManageAttributesOpen,
    fetchDbAttributes,
    allParentImages,
    setAllParentImages,
    referenceErrors,
    referenceLoading,
    retryReferences,
  };
}
