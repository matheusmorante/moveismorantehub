import { PostTemplate } from '../types/postTemplate';

export interface PostTemplateDbRow {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  aspect_ratio?: string;
  formats?: Array<'4:5' | '9:16'>;
  width?: number;
  height?: number;
  image_prompt?: string;
  fields?: any;
  layout?: any;
  reserved_areas?: any;
  image_rules?: any;
  generation_config?: any;
  assets?: any;
  extras?: any;
  status?: string;
  version?: number;
  deleted?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function dbRowToTemplate(row: PostTemplateDbRow): PostTemplate {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || row.name.toLowerCase().replaceAll(' ', '-'),
    description: row.description || '',
    category: row.category || 'Promoção',
    aspectRatio: (row.aspect_ratio || '4:5') as any,
    formats: row.formats || (row.aspect_ratio === '9:16' ? ['9:16'] : ['4:5']),
    width: row.width || 1080,
    height: row.height || 1350,
    imagePrompt: row.image_prompt || '',
    fields: row.fields || [],
    layout: row.layout || [],
    reservedAreas: row.reserved_areas || [],
    imageRules: row.image_rules || { preserveProduct: true, generateEnvironment: true, fit: 'contain' },
    generationConfig: row.generation_config || { provider: 'gemini', model: 'gemini-2.5-flash-image', referenceImageRequired: true },
    assets: row.assets || [],
    extras: row.extras || [],
    status: (row.status || 'ACTIVE') as any,
    version: row.version || 1,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function templateToDbRow(t: PostTemplate): PostTemplateDbRow {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    category: t.category,
    aspect_ratio: t.aspectRatio,
    formats: t.formats,
    width: t.width,
    height: t.height,
    image_prompt: t.imagePrompt,
    fields: t.fields,
    layout: t.layout,
    reserved_areas: t.reservedAreas,
    image_rules: t.imageRules,
    generation_config: t.generationConfig,
    assets: t.assets,
    extras: t.extras,
    status: t.status,
    version: t.version,
    deleted: false,
    deleted_at: null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}
