import { canAgentViewProductCost } from './agentPermissionGuard';

export interface AgentVariationInput {
  sku?: string;
  nome?: string;
  precoVenda?: number;
  precoPromocional?: number | null;
  precoCusto?: number;
  estoque?: number;
  ativo?: boolean;
  atributos?: Record<string, string>;
  alturaCm?: number;
  larguraCm?: number;
  profundidadeCm?: number;
  pesoKg?: number;
}

export interface AgentCreateProductInput {
  nome: string;
  codigo?: string;
  titulo?: string;
  descricao?: string;
  categoria?: string;
  ambiente?: string;
  marca?: string;
  linha?: string;
  condicao?: 'novo' | 'usado' | 'salvado';
  precoVenda?: number;
  precoPromocional?: number | null;
  precoCusto?: number;
  custoFrete?: number;
  estoque?: number;
  estoqueMinimo?: number;
  unidade?: string;
  alturaCm?: number;
  larguraCm?: number;
  profundidadeCm?: number;
  pesoKg?: number;
  material?: string;
  cores?: string;
  diferencialPrincipal?: string;
  naoIncluso?: string;
  ncm?: string;
  caracteristicasTecnicas?: Record<string, any>;
  ativo?: boolean;
  rascunho?: boolean;
  variacoes?: AgentVariationInput[];
}

export interface AgentUpdateProductInput extends Partial<AgentCreateProductInput> {
  codigoOuSku: string;
  moverParaLixeira?: boolean;
  restaurarDaLixeira?: boolean;
}

export interface SanitizedProductVariationForAgent {
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

export interface SanitizedProductDetailForAgent {
  codigo: string;
  sku: string;
  nome: string;
  titulo?: string;
  descricao?: string;
  categoria: string;
  ambiente?: string;
  marca?: string;
  linha?: string;
  condicao?: string;
  ativo: boolean;
  naLixeira?: boolean;
  rascunho?: boolean;
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
  variacoes: SanitizedProductVariationForAgent[];
  fiscal?: {
    ncm?: string;
  };
}

export const normalizeSlugSimple = (text: string): string =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `produto-${Date.now()}`;

export function sanitizeRawDbProductForAgent(
  row: any,
  canViewCost?: boolean
): SanitizedProductDetailForAgent {
  const allowCost = canViewCost !== undefined ? canViewCost : canAgentViewProductCost();
  const parentCode = String(row.code || row.sku || '').trim();
  const rawVars = Array.isArray(row.product_variations)
    ? row.product_variations
    : Array.isArray(row.variations)
      ? row.variations
      : [];

  const mappedVars: SanitizedProductVariationForAgent[] = rawVars.map((v: any, idx: number) => {
    const attrs: Record<string, string> = {};
    if (Array.isArray(v.attributes)) {
      for (const item of v.attributes) {
        if (item?.name && item?.value !== undefined) {
          attrs[String(item.name)] = String(item.value);
        }
      }
    } else if (v.attributes && typeof v.attributes === 'object') {
      for (const [k, val] of Object.entries(v.attributes)) {
        if (val !== undefined && val !== null) attrs[k] = String(val);
      }
    }

    const hasDims =
      v.height !== undefined ||
      v.width !== undefined ||
      v.depth !== undefined ||
      v.weight !== undefined;

    return {
      sku: String(v.sku || (parentCode ? `${parentCode}-${String(idx + 1).padStart(2, '0')}` : '')),
      nome: String(v.name || row.name || ''),
      preco: Number(v.unit_price ?? v.price ?? row.unit_price ?? row.price ?? 0),
      precoPromocional:
        v.promo_price !== undefined && v.promo_price !== null ? Number(v.promo_price) : undefined,
      precoCusto:
        allowCost && v.cost_price !== undefined && v.cost_price !== null
          ? Number(v.cost_price)
          : undefined,
      estoque: Number(v.stock ?? 0),
      ativo: v.active !== false,
      atributos: attrs,
      fotos: Array.isArray(v.images) ? v.images : [],
      dimensoes: hasDims
        ? {
            alturaCm: v.height !== undefined && v.height !== null ? Number(v.height) : undefined,
            larguraCm: v.width !== undefined && v.width !== null ? Number(v.width) : undefined,
            profundidadeCm: v.depth !== undefined && v.depth !== null ? Number(v.depth) : undefined,
            pesoKg: v.weight !== undefined && v.weight !== null ? Number(v.weight) : undefined,
          }
        : undefined,
    };
  });

  const technicalValues =
    row.technical_specs?.technicalValues &&
    typeof row.technical_specs.technicalValues === 'object' &&
    Object.keys(row.technical_specs.technicalValues).length > 0
      ? row.technical_specs.technicalValues
      : undefined;

  return {
    codigo: parentCode,
    sku: String(row.sku || parentCode),
    nome: String(row.name || row.marketplace_title || row.title || row.description || ''),
    titulo: String(row.marketplace_title || row.title || row.name || ''),
    descricao: String(row.description || ''),
    categoria: String(row.category || 'Sem Categoria'),
    ambiente: row.environment ? String(row.environment) : undefined,
    marca: String(row.brand || ''),
    linha: String(row.line || ''),
    condicao: String(row.condition || 'novo'),
    ativo: Boolean(row.active !== false && !row.deleted),
    naLixeira: Boolean(row.deleted),
    rascunho: Boolean(row.is_draft),
    precos: {
      precoVenda: Number(row.unit_price ?? row.price ?? 0),
      precoPromocional:
        row.promo_price !== undefined && row.promo_price !== null
          ? Number(row.promo_price)
          : undefined,
      precoCusto:
        allowCost && row.cost_price !== undefined && row.cost_price !== null
          ? Number(row.cost_price)
          : undefined,
      custoFrete:
        allowCost && row.freight_cost !== undefined && row.freight_cost !== null
          ? Number(row.freight_cost)
          : undefined,
    },
    estoque: {
      atual: Number(row.stock ?? 0),
      minimo:
        row.min_stock !== undefined && row.min_stock !== null ? Number(row.min_stock) : undefined,
      unidade: String(row.unit || 'UN'),
    },
    dimensoes: {
      alturaCm: row.height !== undefined && row.height !== null && row.height !== '' ? Number(row.height) : undefined,
      larguraCm: row.width !== undefined && row.width !== null && row.width !== '' ? Number(row.width) : undefined,
      profundidadeCm:
        row.depth !== undefined && row.depth !== null && row.depth !== '' ? Number(row.depth) : undefined,
      pesoKg: row.weight !== undefined && row.weight !== null ? Number(row.weight) : undefined,
    },
    caracteristicas: {
      material: row.material || undefined,
      cores: row.colors || undefined,
      diferencialPrincipal: row.main_differential || undefined,
      naoIncluso: row.not_included || undefined,
      valoresTecnicos: technicalValues,
    },
    fotos: Array.isArray(row.images) ? row.images : [],
    possuiVariacoes: Boolean(row.has_variations || mappedVars.length > 1),
    quantidadeVariacoes: mappedVars.length,
    variacoes: mappedVars,
    fiscal: row.fiscal?.ncm ? { ncm: String(row.fiscal.ncm) } : undefined,
  };
}
