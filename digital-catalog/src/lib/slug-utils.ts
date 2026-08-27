/**
 * Utilitários para geração e resolução de slugs legíveis de Categorias e Ambientes no Catálogo Digital
 */

export const slugifyCategory = (cat: { id?: string; name?: string; slug?: string } | null | undefined): string => {
  if (!cat) return "";
  if (cat.slug && cat.slug.trim()) {
    return cat.slug.trim().toLowerCase();
  }
  return (cat.name || cat.id || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

/**
 * Converte slugs legíveis ou UUIDs vindos da URL nos IDs reais das categorias/ambientes
 */
export const resolveCategoryIdsFromSlugsOrIds = (
  slugsOrIds: string[],
  allCategories: any[]
): string[] => {
  if (!slugsOrIds || slugsOrIds.length === 0) return [];
  const result: string[] = [];

  for (const item of slugsOrIds) {
    if (!item) continue;
    const cleanItem = String(item).trim().toLowerCase();
    
    // 1. Verifica correspondência direta por ID
    const byId = allCategories.find(c => String(c.id).toLowerCase() === cleanItem);
    if (byId) {
      result.push(byId.id);
      continue;
    }

    // 2. Verifica correspondência por slug existente ou gerado
    const bySlug = allCategories.find(c => {
      const dbSlug = (c.slug || "").toLowerCase().trim();
      const generatedSlug = slugifyCategory(c);
      return dbSlug === cleanItem || generatedSlug === cleanItem;
    });
    if (bySlug) {
      result.push(bySlug.id);
      continue;
    }

    // 3. Fallback: normalização de nome
    const byName = allCategories.find(c => {
      const normName = (c.name || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      return normName === cleanItem.replace(/-/g, " ");
    });
    if (byName) {
      result.push(byName.id);
      continue;
    }

    // Se for UUID ou não encontrado, mantém original
    result.push(item);
  }

  return [...new Set(result)];
};

/**
 * Converte IDs de categorias/ambientes em slugs legíveis para colocar nos parâmetros de query da URL
 */
export const resolveSlugsFromCategoryIds = (
  ids: string[],
  allCategories: any[]
): string[] => {
  if (!ids || ids.length === 0) return [];
  return ids.map(id => {
    const cat = allCategories.find(c => String(c.id).toLowerCase() === String(id).toLowerCase());
    if (cat) return slugifyCategory(cat);
    return id;
  });
};
