import Product, { Variation } from '@/pages/types/product.type';

// Interfaces de transporte exclusivas para o Agente IA (sem IDs de banco)

export interface ProductSummaryForAgent {
  codigo: string;
  sku: string;
  nome: string;
  categoria: string;
  marca: string;
  linha?: string;
  condicao: string;
  preco: number;
  precoPromocional?: number;
  precoCusto?: number;
  estoque: number;
  unidade: string;
  ativo: boolean;
  quantidadeVariacoes: number;
  skusVariacoes: string[];
}

export interface ProductVariationDetailForAgent {
  sku: string;
  nome: string;
  preco: number;
  precoPromocional?: number;
  precoCusto?: number;
  estoque: number;
  ativo: boolean;
  atributos: Record<string, string>;
  fotos: string[];
  dimensoes?: {
    alturaCm?: number;
    larguraCm?: number;
    profundidadeCm?: number;
    pesoKg?: number;
  };
}

export interface ProductDetailForAgent {
  codigo: string;
  sku: string;
  nome: string;
  titulo?: string;
  descricao?: string;
  categoria: string;
  marca?: string;
  linha?: string;
  condicao?: string;
  ativo: boolean;
  precos: {
    precoVenda: number;
    precoPromocional?: number;
    precoCusto?: number;
    custoFrete?: number;
  };
  estoque: {
    atual: number;
    minimo?: number;
    unidade: string;
  };
  dimensoes: {
    alturaCm?: number;
    larguraCm?: number;
    profundidadeCm?: number;
    pesoKg?: number;
    embalagem?: {
      alturaCm?: number;
      larguraCm?: number;
      profundidadeCm?: number;
    };
    adicionais?: Array<{ rotulo: string; valor: string }>;
  };
  caracteristicas?: {
    material?: string;
    cores?: string;
    diferencialPrincipal?: string;
    naoIncluso?: string;
    valoresTecnicos?: Record<string, any>;
  };
  fotos: string[];
  possuiVariacoes: boolean;
  quantidadeVariacoes: number;
  variacoes: ProductVariationDetailForAgent[];
  fiscal?: {
    ncm?: string;
  };
}

export interface ProductToolResponse<T = any> {
  success: boolean;
  data?: T;
  total?: number;
  message?: string;
  error?: string;
  code?: string;
}

export const PRODUCT_DETAIL_COLUMNS =
  'id,code,sku,name,title,marketplace_title,description,category,category_id,brand,line,condition,unit_price,price,promo_price,cost_price,freight_cost,stock,min_stock,unit,active,deleted,item_type,is_draft,status,product_kind,is_salvado,width,height,depth,weight,pkg_width,pkg_height,pkg_depth,extra_dimensions,material,colors,main_differential,not_included,images,product_variations(id,product_id,sku,name,unit_price,price,promo_price,cost_price,stock,active,attributes,images,height,width,depth,weight),product_categories(category_id,categories(name)),product_images(image_url,is_main),technical_specs,fiscal';

// Sanitizadores para garantia absoluta de omissão de IDs do banco

export const sanitizeVariationForAgent = (
  v: Variation,
  allowCost = false
): ProductVariationDetailForAgent => {
  const attrs: Record<string, string> = {};
  if (Array.isArray(v.attributes)) {
    for (const attr of v.attributes) {
      if (attr && attr.name && attr.value !== undefined && attr.value !== null) {
        attrs[attr.name] = String(attr.value);
      }
    }
  }

  const hasDims =
    v.height !== undefined ||
    v.width !== undefined ||
    v.depth !== undefined ||
    v.weight !== undefined;

  return {
    sku: v.sku || '',
    nome: v.name || '',
    preco: Number(v.unitPrice ?? 0),
    precoPromocional:
      v.promoPrice !== undefined && v.promoPrice !== null ? Number(v.promoPrice) : undefined,
    precoCusto:
      allowCost && v.costPrice !== undefined && v.costPrice !== null
        ? Number(v.costPrice)
        : undefined,
    estoque: Number(v.stock ?? 0),
    ativo: Boolean(v.active),
    atributos: attrs,
    fotos: Array.isArray(v.images) ? v.images : [],
    dimensoes: hasDims
      ? {
          alturaCm: v.height,
          larguraCm: v.width,
          profundidadeCm: v.depth,
          pesoKg: v.weight,
        }
      : undefined,
  };
};

export const sanitizeProductDetailForAgent = (
  p: Product,
  allowCost = false
): ProductDetailForAgent => {
  const variations = (p.variations || []).map((v) => sanitizeVariationForAgent(v, allowCost));

  return {
    codigo: p.code || '',
    sku: p.sku || p.code || '',
    nome: p.name || p.title || p.description || '',
    titulo: p.title || p.name || '',
    descricao: p.description || '',
    categoria: p.category || 'Sem Categoria',
    marca: p.brand || '',
    linha: p.line || '',
    condicao: p.condition || 'novo',
    ativo: Boolean(p.active),
    precos: {
      precoVenda: Number(p.unitPrice ?? 0),
      precoPromocional:
        p.promoPrice !== undefined && p.promoPrice !== null ? Number(p.promoPrice) : undefined,
      precoCusto:
        allowCost && p.costPrice !== undefined && p.costPrice !== null
          ? Number(p.costPrice)
          : undefined,
      custoFrete:
        p.freightCost !== undefined && p.freightCost !== null ? Number(p.freightCost) : undefined,
    },
    estoque: {
      atual: Number(p.stock ?? 0),
      minimo: p.minStock !== undefined && p.minStock !== null ? Number(p.minStock) : undefined,
      unidade: p.unit || 'UN',
    },
    dimensoes: {
      alturaCm: p.height,
      larguraCm: p.width,
      profundidadeCm: p.depth,
      pesoKg: p.weight,
      embalagem:
        p.pkgHeight || p.pkgWidth || p.pkgDepth
          ? {
              alturaCm: p.pkgHeight,
              larguraCm: p.pkgWidth,
              profundidadeCm: p.pkgDepth,
            }
          : undefined,
      adicionais: Array.isArray(p.extraDimensions)
        ? p.extraDimensions.map((e) => ({ rotulo: e.label, valor: e.value }))
        : undefined,
    },
    caracteristicas: {
      material: p.material || undefined,
      cores: p.colors || undefined,
      diferencialPrincipal: p.mainDifferential || undefined,
      naoIncluso: p.notIncluded || undefined,
      valoresTecnicos:
        p.technicalValues && Object.keys(p.technicalValues).length > 0
          ? p.technicalValues
          : undefined,
    },
    fotos: Array.isArray(p.images) ? p.images : [],
    possuiVariacoes: Boolean(p.hasVariations || variations.length > 1),
    quantidadeVariacoes: variations.length,
    variacoes: variations,
    fiscal: p.fiscal?.ncm ? { ncm: p.fiscal.ncm } : undefined,
  };
};

export const sanitizeProductSummaryForAgent = (
  p: Product,
  allowCost = false
): ProductSummaryForAgent => {
  const skus = (p.variations || []).map((v) => v.sku).filter(Boolean);

  return {
    codigo: p.code || '',
    sku: p.sku || p.code || '',
    nome: p.name || p.title || p.description || '',
    categoria: p.category || 'Sem Categoria',
    marca: p.brand || '',
    condicao: p.condition || 'novo',
    preco: Number(p.unitPrice ?? 0),
    precoPromocional:
      p.promoPrice !== undefined && p.promoPrice !== null ? Number(p.promoPrice) : undefined,
    precoCusto:
      allowCost && p.costPrice !== undefined && p.costPrice !== null
        ? Number(p.costPrice)
        : undefined,
    estoque: Number(p.stock ?? 0),
    unidade: p.unit || 'UN',
    ativo: Boolean(p.active),
    quantidadeVariacoes: skus.length,
    skusVariacoes: skus,
  };
};
