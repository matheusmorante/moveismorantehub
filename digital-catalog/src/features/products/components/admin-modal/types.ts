import { Database } from '@/types/database';
import { storefrontVariationFormSchema } from '@/shared-utils/storefrontProductFormSchemas';
import type { z } from 'zod';

export type Category = Database['public']['Tables']['categories']['Row'];
export type StoreCategory = Category & { type?: 'category' | 'environment' };
export type CategoryRelationship = { parent_id: string; child_id: string };
export type Product = Database['public']['Tables']['products']['Row'];
export type ProductImage = Database['public']['Tables']['product_images']['Row'];
export type Opportunity = Database['public']['Tables']['opportunities']['Row'];

export type TempVariation = z.input<typeof storefrontVariationFormSchema>;

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: string;
  promo_price: string;
  is_salvado: boolean;
  opportunity_id: string | null;
  category_ids: string[];
  width: string;
  depth: string;
  height: string;
  depth_use_length: boolean;
  images: string[];
}

export interface DbAttribute {
  id: string;
  name: string;
}

export interface DbAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
}

export interface AdminProductModalProps {
  productId?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialVariationId?: string | null;
}
