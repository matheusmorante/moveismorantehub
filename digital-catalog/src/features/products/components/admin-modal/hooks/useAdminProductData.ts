'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  CategoryRelationship,
  DbAttribute,
  DbAttributeValue,
  Opportunity,
  Product,
  ProductFormData,
  StoreCategory,
  TempVariation,
} from '../types';
import { parseLegacyMeasures } from '../utils/measuresUtils';
import { calculateInitialDiscounts } from '../utils/priceCalculations';

interface UseAdminProductDataProps {
  isOpen: boolean;
  productId?: string | null;
  initialVariationId?: string | null;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  setDiscountPercent: React.Dispatch<React.SetStateAction<string>>;
  setDiscountFixed: React.Dispatch<React.SetStateAction<string>>;
  setProductVariations: React.Dispatch<React.SetStateAction<TempVariation[]>>;
  setVariationsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  onOpenInitialVariation?: (variation: TempVariation, index: number) => void;
}

export function useAdminProductData({
  isOpen,
  productId,
  initialVariationId,
  setFormData,
  setDiscountPercent,
  setDiscountFixed,
  setProductVariations,
  setVariationsEnabled,
  setCurrentProduct,
  setStep,
  onOpenInitialVariation,
}: UseAdminProductDataProps) {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [categoryRelationships, setCategoryRelationships] = useState<CategoryRelationship[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [dbAttributes, setDbAttributes] = useState<DbAttribute[]>([]);
  const [dbAttributeValues, setDbAttributeValues] = useState<DbAttributeValue[]>([]);

  const isLoaded = useRef(false);

  const fetchCategories = async () => {
    const [categoriesResult, relationshipsResult] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('category_relationships').select('parent_id, child_id'),
    ]);
    setCategories((categoriesResult.data || []) as StoreCategory[]);
    setCategoryRelationships((relationshipsResult.data || []) as CategoryRelationship[]);
  };

  const fetchOpportunities = async () => {
    const { data } = await supabase
      .from('opportunities')
      .select('*')
      .eq('active', true)
      .order('name');
    setOpportunities(data || []);
  };

  const fetchDbAttributes = async () => {
    try {
      const [attrRes, valRes] = await Promise.all([
        supabase.from('attributes').select('*').order('name'),
        supabase.from('attribute_values').select('*').order('value'),
      ]);
      setDbAttributes((attrRes.data || []) as DbAttribute[]);
      setDbAttributeValues((valRes.data || []) as DbAttributeValue[]);
    } catch (err) {
      console.error('Erro ao buscar atributos globais:', err);
    }
  };

  const fetchProduct = async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Erro ao carregar produto: ' + error.message);
      isLoaded.current = true;
      return;
    }

    const { data: prodCats } = await supabase
      .from('product_categories')
      .select('category_id')
      .eq('product_id', id);

    if (data) {
      setCurrentProduct(data);
      const sortedImages = [...(data.product_images || [])].sort(
        (a, b) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1)
      );
      const legacyMeasures = parseLegacyMeasures(data.measures);
      setFormData({
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        price: data.price.toString(),
        promo_price: data.promo_price ? data.promo_price.toString() : '',
        is_salvado: data.is_salvado || false,
        opportunity_id: (data as any).opportunity_id || null,
        category_ids: prodCats?.map((pc: any) => pc.category_id) || [],
        width: data.width || legacyMeasures.width,
        depth: data.depth || legacyMeasures.depth,
        height: data.height || legacyMeasures.height,
        depth_use_length: (data as any).depth_use_length || false,
        images: sortedImages.map((img: any) => img.image_url),
      });

      const discounts = calculateInitialDiscounts(data.price, data.promo_price);
      setDiscountFixed(discounts.discountFixed);
      setDiscountPercent(discounts.discountPercent);

      // Buscar variações do produto
      const { data: variationsData } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: true });

      if (variationsData && variationsData.length > 0) {
        const mappedVars: TempVariation[] = variationsData.map((v: any) => {
          return {
            id: v.id,
            name: v.name,
            sku: v.sku || '',
            price: v.price ? v.price.toString() : '',
            image_url: v.image_url || '',
            attributes: v.attributes || {},
            promo_price: v.promo_price ? v.promo_price.toString() : '',
            description: v.description || '',
            width: v.width || '',
            depth: v.depth || '',
            height: v.height || '',
            use_parent_name: v.use_parent_name !== false,
            use_parent_price: v.use_parent_price !== false,
            use_parent_promo_price: v.use_parent_promo_price !== false,
            use_parent_dimensions: v.use_parent_dimensions !== false,
            use_parent_description: v.use_parent_description !== false,
          };
        });
        setProductVariations(mappedVars);
        setVariationsEnabled(true);

        if (initialVariationId) {
          const varIndex = mappedVars.findIndex((v) => v.id === initialVariationId);
          if (varIndex !== -1 && onOpenInitialVariation) {
            setTimeout(() => {
              setStep(2);
              onOpenInitialVariation(mappedVars[varIndex], varIndex);
            }, 100);
          }
        }
      } else {
        setProductVariations([]);
        setVariationsEnabled(false);
      }

      setTimeout(() => {
        isLoaded.current = true;
      }, 50);
    }
  };

  useEffect(() => {
    if (isOpen) {
      isLoaded.current = false;
      fetchCategories();
      fetchOpportunities();
      fetchDbAttributes();
      if (productId) {
        fetchProduct(productId);
      } else {
        isLoaded.current = true;
      }
    }
  }, [isOpen, productId]);

  return {
    categories,
    categoryRelationships,
    opportunities,
    dbAttributes,
    dbAttributeValues,
    fetchCategories,
    fetchDbAttributes,
    isLoaded,
  };
}
