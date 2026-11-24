import { createProductDbClient } from './serverDb';
import {
  buildNcmSearchTerms,
  isCurrentNcm,
  isWoodenBedroomFurnitureByName,
  resolveSyntheticStoneFixtureNcm,
  validateCategoryChoice,
  validateNcmChoice,
  WOODEN_BEDROOM_FURNITURE_NCM,
  type CategoryCandidate,
  type NcmCandidate,
} from './classificationCore';
import { cleanText, dateInBrazil } from './classificationBudgetAndCache';

export interface ClassificationQuestionBlock {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
}

const NCM_COLUMNS = 'code,official_description,active,is_active,start_date,end_date';

async function fetchValidNcmByCode(
  db: ReturnType<typeof createProductDbClient>,
  code: string
): Promise<NcmCandidate | null> {
  const { data } = await db.from('ncms').select(NCM_COLUMNS).eq('code', code).maybeSingle();
  return data && isCurrentNcm(data, dateInBrazil()) ? data : null;
}

export async function resolveDeterministicNcm(
  db: ReturnType<typeof createProductDbClient>,
  params: {
    isInvoice: boolean;
    hasNcm: boolean;
    classificationTitle: string;
    name: string;
    description: string;
    categoryHint: string;
    material: string;
  }
): Promise<NcmCandidate | null> {
  if (params.hasNcm) return null;

  const syntheticStoneFixtureCode = !params.isInvoice
    ? resolveSyntheticStoneFixtureNcm({
        title: params.classificationTitle,
        name: params.name,
        description: params.description,
        category: params.categoryHint,
        material: params.material,
      })
    : null;

  if (syntheticStoneFixtureCode) {
    const ncm = await fetchValidNcmByCode(db, syntheticStoneFixtureCode);
    if (ncm) return ncm;
  }

  if (isWoodenBedroomFurnitureByName(params.classificationTitle, params.material)) {
    return fetchValidNcmByCode(db, WOODEN_BEDROOM_FURNITURE_NCM);
  }

  return null;
}

export async function resolveCategoryContextAndCandidates(
  db: ReturnType<typeof createProductDbClient>,
  userDb: ReturnType<typeof createProductDbClient>,
  params: {
    isInvoice: boolean;
    productId: string;
    initialCategoryId: string;
    categoryHint: string;
    onCategoryAvailabilityCheck?: (available: boolean) => void;
  }
): Promise<{
  categoryName: string;
  question?: ClassificationQuestionBlock;
  categoryOptions: Map<string, CategoryCandidate>;
}> {
  const categoryOptions = new Map<string, CategoryCandidate>();
  if (params.isInvoice) {
    return { categoryName: '', categoryOptions };
  }

  let categoryId = params.initialCategoryId;
  if (!categoryId && params.productId) {
    const { data: product, error: productError } = await userDb
      .from('products')
      .select('category_id')
      .eq('id', params.productId)
      .maybeSingle();
    if (!productError) categoryId = cleanText(product?.category_id, 80);
    params.onCategoryAvailabilityCheck?.(Boolean(categoryId));
  }

  if (categoryId) {
    const { data } = await db
      .from('categories')
      .select('id,name,type')
      .eq('id', categoryId)
      .eq('type', 'category')
      .maybeSingle();
    return { categoryName: data?.name || params.categoryHint, categoryOptions };
  }

  const [{ data: categories, error: categoryError }, { data: relations, error: relationError }] =
    await Promise.all([
      db.from('categories').select('id,name,type').eq('type', 'category').order('name').limit(256),
      db.from('category_relationships').select('child_id').limit(5000),
    ]);
  if (categoryError || relationError) throw new Error('catalog_unavailable');

  const linked = new Set((relations || []).map((row) => row.child_id));
  const options = (categories || []).filter((row) => linked.has(row.id));

  // Não despeja centenas de categorias no prompt; acima disso, mantém a categoria manual.
  if (options.length > 0 && options.length <= 16) {
    const criteria: Record<string, string> = {};
    options.forEach((row, index) => {
      const key = `c${index}`;
      categoryOptions.set(key, { id: row.id, name: row.name, active: true, selectable: true });
      criteria[key] = row.name;
    });
    return {
      categoryName: params.categoryHint,
      categoryOptions,
      question: {
        type: 'choice',
        instructions: 'Escolha a categoria de produto mais adequada entre as opções.',
        criteria,
      },
    };
  }

  return { categoryName: params.categoryHint, categoryOptions };
}

export async function resolveNcmCandidates(
  db: ReturnType<typeof createProductDbClient>,
  userDb: ReturnType<typeof createProductDbClient>,
  params: {
    isInvoice: boolean;
    name: string;
    title: string;
    categoryName: string;
    material: string;
    description: string;
  }
): Promise<{
  question?: ClassificationQuestionBlock;
  ncmOptions: Map<string, NcmCandidate>;
}> {
  const ncmOptions = new Map<string, NcmCandidate>();
  const searchTitle = params.isInvoice
    ? params.title
    : [params.name, params.title].filter(Boolean).join(' ');
  const terms = buildNcmSearchTerms(
    searchTitle,
    params.isInvoice ? '' : params.categoryName,
    params.isInvoice ? '' : params.material,
    params.isInvoice ? '' : params.description
  );
  const searches = await Promise.all(
    terms.map((term) => userDb.rpc('search_ncms', { search_term: term, max_results: 10 }))
  );
  if (searches.some((search) => search.error)) throw new Error('ncm_search_unavailable');

  const ranked = new Map<string, { code: string; rank: number }>();
  for (const search of searches) {
    for (const row of search.data || []) {
      if (!ranked.has(row.code) || ranked.get(row.code)!.rank < row.rank) {
        ranked.set(row.code, row);
      }
    }
  }

  const codes = [...ranked.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8)
    .map((row) => row.code);

  if (!codes.length) return { ncmOptions };

  const { data: catalog, error: catalogError } = await db
    .from('ncms')
    .select(NCM_COLUMNS)
    .in('code', codes);
  if (catalogError) throw new Error('ncm_catalog_unavailable');

  const today = dateInBrazil();
  const valid = (catalog || []).filter((row) => isCurrentNcm(row, today));
  const criteria: Record<string, string> = {};
  valid.forEach((row, index) => {
    const key = `n${index}`;
    criteria[key] = `${row.code} — ${row.official_description}`;
    ncmOptions.set(key, row);
  });

  if (!valid.length) return { ncmOptions };

  return {
    ncmOptions,
    question: {
      type: 'choice',
      instructions:
        'Escolha somente o NCM candidato mais plausível. Esta é uma sugestão que exige revisão humana.',
      criteria,
    },
  };
}

export async function revalidateSelectedCategory(
  db: ReturnType<typeof createProductDbClient>,
  choice: unknown,
  categoryOptions: Map<string, CategoryCandidate>
): Promise<{ category: CategoryCandidate | null; choiceInOptions: boolean }> {
  const offered = typeof choice === 'string' ? categoryOptions.get(choice) : undefined;
  if (!offered) return { category: null, choiceInOptions: false };

  const [{ data: latest }, { data: relation }] = await Promise.all([
    db.from('categories').select('id,name,type').eq('id', offered.id).eq('type', 'category').maybeSingle(),
    db.from('category_relationships').select('child_id').eq('child_id', offered.id).limit(1),
  ]);

  const current = new Map<string, CategoryCandidate>();
  if (latest) {
    current.set(latest.id, {
      id: latest.id,
      name: latest.name,
      active: true,
      selectable: Boolean(relation?.length),
    });
  }
  const id = validateCategoryChoice(choice, categoryOptions, current);
  return { category: id ? current.get(id) ?? null : null, choiceInOptions: true };
}

export async function revalidateSelectedNcm(
  db: ReturnType<typeof createProductDbClient>,
  choice: unknown,
  ncmOptions: Map<string, NcmCandidate>,
  today: string
): Promise<{ ncm: NcmCandidate | null; choiceInOptions: boolean }> {
  const offered = typeof choice === 'string' ? ncmOptions.get(choice) : undefined;
  if (!offered) return { ncm: null, choiceInOptions: false };

  const { data: latest } = await db
    .from('ncms')
    .select(NCM_COLUMNS)
    .eq('code', offered.code)
    .maybeSingle();

  const current = new Map<string, NcmCandidate>();
  if (latest) current.set(latest.code, latest);
  return { ncm: validateNcmChoice(choice, ncmOptions, current, today), choiceInOptions: true };
}
