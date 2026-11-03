import type Order from '@/pages/types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ncmService, type NcmInferenceFacts } from '@/services/fiscal/ncmService';

export type NcmSuggestion = { code: string; description: string };
type NcmCatalogEntry = NonNullable<Awaited<ReturnType<typeof ncmService.getCatalogEntry>>>;

function isCurrentCatalogEntry(
  entry: NcmCatalogEntry | null,
  today: string
): entry is NcmCatalogEntry {
  return Boolean(
    entry?.active &&
      entry.is_active &&
      (!entry.start_date || entry.start_date <= today) &&
      (!entry.end_date || entry.end_date >= today)
  );
}

export type DbProductFiscalFact = {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  category_id?: string;
  material?: string;
  fiscal?: { ncm?: string; ncmDescription?: string };
};

export async function resolveNcmForOrderItem(
  item: Order['items'][number],
  dbProductsMap: Map<string, DbProductFiscalFact>
): Promise<NcmSuggestion | null> {
  const productId = item.productId || item.fiscalSnapshotProductId;
  const isRegistered = Boolean(productId && !item.isTemporaryProduct && dbProductsMap.has(productId));
  const dbProduct = isRegistered && productId ? dbProductsMap.get(productId) : null;

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // 1. Se o produto for cadastrado e já possuir NCM de 8 dígitos no cadastro da loja
  if (dbProduct?.fiscal?.ncm && /^\d{8}$/.test(dbProduct.fiscal.ncm)) {
    try {
      const entry = await ncmService.getCatalogEntry(dbProduct.fiscal.ncm);
      if (isCurrentCatalogEntry(entry, today)) {
        return { code: entry.code, description: entry.official_description };
      }
    } catch {
      // Continua para inferência caso a consulta do NCM cadastrado falhe
    }
  }

  // 2. Inferência de NCM baseada no título, descrição e características:
  // Se o produto for cadastrado, busca a descrição cadastrada do produto (e dados cadastrados);
  // Se não for cadastrado, utiliza o nome do item no pedido.
  const facts: NcmInferenceFacts = isRegistered && dbProduct
    ? {
        title: dbProduct.title || dbProduct.name || item.description,
        name: dbProduct.name,
        description: dbProduct.description || item.description,
        category: dbProduct.category,
        material: dbProduct.material || item.fiscal?.material,
      }
    : {
        title: item.description,
        name: item.description,
        description: item.description,
        material: item.fiscal?.material,
      };

  try {
    const inference = await ncmService.inferProductNcm(facts);
    if (inference) {
      const current = await ncmService.getCatalogEntry(inference.code);
      if (isCurrentCatalogEntry(current, today)) {
        return { code: current.code, description: current.official_description };
      }
    }
  } catch {
    // Continua para o fallback da API caso a inferência local falhe
  }

  // 3. Fallback: Consulta o classificador da API caso a inferência não resolva

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return null;
    const response = await fetch('/api/products/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        source: 'invoice',
        title: facts.title || '',
        ncm: '',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as { ncm?: { code?: string } | null };
    const code = result.ncm?.code || '';
    if (!/^\d{8}$/.test(code)) return null;
    const current = await ncmService.getCatalogEntry(code);
    return isCurrentCatalogEntry(current, today)
      ? { code: current.code, description: current.official_description }
      : null;
  } catch {
    return null;
  }
}
