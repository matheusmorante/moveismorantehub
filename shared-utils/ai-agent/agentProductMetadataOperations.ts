import { getNextSequentialProductCodeFromValues } from '../productSequentialCode';

export interface AgentSupabaseQueryError {
  message?: string;
  code?: string;
}

export interface AgentSupabaseResponse<T = unknown> {
  data: T | null;
  error: AgentSupabaseQueryError | null;
}

export interface AgentSupabaseQueryBuilder {
  select: (columns: string) => AgentSupabaseQueryBuilder;
  insert: (rows: Record<string, unknown>[]) => AgentSupabaseQueryBuilder;
  update: (patch: Record<string, unknown>) => AgentSupabaseQueryBuilder;
  eq: (column: string, value: unknown) => AgentSupabaseQueryBuilder;
  or: (filters: string) => AgentSupabaseQueryBuilder;
  order: (column: string, options: { ascending: boolean }) => AgentSupabaseQueryBuilder;
  limit: (count: number) => AgentSupabaseQueryBuilder;
  range: (from: number, to: number) => Promise<AgentSupabaseResponse<unknown[]>>;
  single: () => Promise<AgentSupabaseResponse<Record<string, unknown>>>;
  maybeSingle: () => Promise<AgentSupabaseResponse<Record<string, unknown>>>;
}

export interface AgentSupabaseClient {
  from: (table: string) => AgentSupabaseQueryBuilder;
}

interface AgentCategoryRow {
  name?: string | null;
  is_environment?: boolean | null;
  active?: boolean | null;
}

interface AgentCharacteristicRow {
  name?: string | null;
  group_name?: string | null;
  field_type?: string | null;
  options?: unknown;
}

const AGENT_PRODUCT_METADATA_PAGE_SIZE = 200;

export function getAgentOperationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

async function fetchAllAgentProductMetadata<T>(
  buildPageQuery: (from: number, to: number) => PromiseLike<AgentSupabaseResponse<unknown[]>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += AGENT_PRODUCT_METADATA_PAGE_SIZE) {
    const { data, error } = await buildPageQuery(
      from,
      from + AGENT_PRODUCT_METADATA_PAGE_SIZE - 1,
    );
    if (error) throw error;
    const page = Array.isArray(data) ? (data as T[]) : [];
    rows.push(...page);
    if (page.length < AGENT_PRODUCT_METADATA_PAGE_SIZE) return rows;
  }
};

export async function listProductCategoriesAndCharacteristicsForAgent(
  supabase: AgentSupabaseClient,
): Promise<{
  success: boolean;
  data?: {
    categorias: Array<{ nome: string; ambiente: boolean; ativo: boolean }>;
    caracteristicas: Array<{
      nome: string;
      grupo?: string;
      tipo?: string;
      opcoes?: string[];
    }>;
  };
  message?: string;
  error?: string;
  code?: string;
}> {
  try {
    const [categoryRows, characteristicRows] = await Promise.all([
      fetchAllAgentProductMetadata<AgentCategoryRow>((from, to) =>
        supabase
          .from('categories')
          .select('name, is_environment, active')
          .order('name', { ascending: true })
          .range(from, to),
      ),
      fetchAllAgentProductMetadata<AgentCharacteristicRow>((from, to) =>
        supabase
          .from('product_characteristics')
          .select('name, group_name, field_type, options')
          .order('name', { ascending: true })
          .range(from, to),
      ),
    ]);

    const categorias = categoryRows
      .filter((category): category is AgentCategoryRow & { name: string } => Boolean(category?.name))
      .map((category) => ({
        nome: String(category.name),
        ambiente: Boolean(category.is_environment),
        ativo: category.active !== false,
      }));

    const caracteristicas = characteristicRows
      .filter((characteristic): characteristic is AgentCharacteristicRow & { name: string } =>
        Boolean(characteristic?.name),
      )
      .map((characteristic) => ({
        nome: String(characteristic.name),
        grupo: characteristic.group_name ? String(characteristic.group_name) : undefined,
        tipo: characteristic.field_type ? String(characteristic.field_type) : undefined,
        opcoes: Array.isArray(characteristic.options)
          ? characteristic.options.map(String)
          : undefined,
      }));

    return {
      success: true,
      data: {
        categorias,
        caracteristicas,
      },
      message: `${categorias.length} categoria(s) e ${caracteristicas.length} característica(s) carregadas.`,
    };
  } catch (err: unknown) {
    console.warn(
      '[AgentProductMetadata] Falha ao carregar categorias/características:',
      getAgentOperationErrorMessage(err, 'erro desconhecido'),
    );
    return {
      success: false,
      code: 'PRODUCT_METADATA_ERROR',
      error: 'Não consegui carregar categorias e características agora. Tente novamente mais tarde.',
    };
  }
}

export async function resolveNextSequentialCode(supabase: AgentSupabaseClient): Promise<string> {
  try {
    const codes: unknown[] = [];
    const { data: prodRows } = await (
      supabase
        .from('products')
        .select('code, sku')
        .order('code', { ascending: false })
        .limit(50) as unknown as Promise<AgentSupabaseResponse<Array<{ code?: unknown; sku?: unknown }>>>
    );
    if (Array.isArray(prodRows)) {
      for (const r of prodRows) {
        if (r?.code) codes.push(r.code);
        if (r?.sku) codes.push(r.sku);
      }
    }
    return getNextSequentialProductCodeFromValues(codes);
  } catch (err: unknown) {
    console.warn(
      '[AgentProductMetadata] Fallback para código sequencial inicial:',
      getAgentOperationErrorMessage(err, 'erro desconhecido'),
    );
    return '000001';
  }
}
