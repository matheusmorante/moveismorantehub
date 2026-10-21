export const WOODEN_BEDROOM_FURNITURE_NCM = '94035000';
export const WOODEN_KITCHEN_FURNITURE_NCM = '94034000';
export const WOODEN_OFFICE_FURNITURE_NCM = '94033000';
export const OTHER_WOODEN_FURNITURE_NCM = '94036000';
export const METAL_OFFICE_FURNITURE_NCM = '94031000';
export const OTHER_METAL_FURNITURE_NCM = '94032000';
export const PLASTIC_FURNITURE_NCM = '94037000';
export const UPHOLSTERED_WOODEN_SEATS_NCM = '94016100';
export const OTHER_WOODEN_SEATS_NCM = '94016900';
export const UPHOLSTERED_METAL_SEATS_NCM = '94017100';
export const OTHER_METAL_SEATS_NCM = '94017900';
export const OTHER_SEATS_NCM = '94018000';
export const FOAM_MATTRESS_NCM = '94042100';
export const OTHER_MATTRESS_NCM = '94042900';
export const MATTRESS_SUPPORT_NCM = '94041000';
export const BEDDING_ARTICLES_NCM = '94049000';

export function normalizeNcmSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\bgeroupas?\b/g, 'guarda roupa')
    .replace(/\bguardaroupas?\b/g, 'guarda roupa')
    .replace(/\bguarda\s+roupas?\b/g, 'guarda roupa')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isWoodenBedroomFurnitureByName(title: string, material = ''): boolean {
  const normalizedTitle = normalizeNcmSearchText(title);
  const normalizedMaterial = normalizeNcmSearchText(`${title} ${material}`);
  const nameMatches =
    /\b(guarda\s*roupas?|geroupas?|roupeiros?|closet|armario (de )?(quarto|dormitorio)|comoda|cama|cabeceira|criado\s*mudo|mesa de cabeceira|penteadeira|beliche|treliche|berco)\b/.test(
      normalizedTitle
    );
  const explicitNonWoodMaterial =
    /\b(aco|metal|inox|plastico|pvc|vidro|aluminio|acrilico|resina)\b/.test(normalizedMaterial);
  return nameMatches && !explicitNonWoodMaterial;
}

export interface SemanticNcmFacts {
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  material?: string;
}

/**
 * Resolve o NCM por regras semânticas determinísticas baseadas na classificação
 * oficial da Receita Federal (Capítulo 94 do NCM/SH).
 */
export function resolveSemanticNcmCode(facts: SemanticNcmFacts): string | null {
  const parts = [facts.title, facts.name, facts.description, facts.category, facts.material]
    .filter((p): p is string => Boolean(p && typeof p === 'string' && p.trim().length > 0));

  if (parts.length === 0) return null;

  const combined = normalizeNcmSearchText(parts.join(' '));
  const materialText = normalizeNcmSearchText(facts.material || '');

  const isMetal =
    /\b(aco|metal|aluminio|ferro|tubular|inox)\b/.test(materialText) ||
    (/\b(aco|metal|aluminio|ferro|inox)\b/.test(combined) &&
      !/\b(madeira|mdp|mdf)\b/.test(combined));

  const isPlastic =
    /\b(plastico|polipropileno|acrilico|resina|pvc)\b/.test(materialText) ||
    (/\b(plastico|polipropileno)\b/.test(combined) && !/\b(madeira|mdp|mdf)\b/.test(combined));

  const isFoam = /\b(espuma|alveolar|viscoelastico|visco|d28|d33|d45|d20|d23|d26)\b/.test(combined);

  // 1. Artigos de Cama e Têxteis (travesseiro, almofada, edredom...)
  if (
    /\b(travesseiro|almofada|edredom|cobertor|manta|lencol|fronha|protetor de colchao|pillow top)\b/.test(
      combined
    )
  ) {
    return BEDDING_ARTICLES_NCM;
  }

  // 2. Colchões e Sommiers / Cama Box
  if (/\b(colchao|colchonete)\b/.test(combined)) {
    return isFoam ? FOAM_MATTRESS_NCM : OTHER_MATTRESS_NCM;
  }
  if (/\b(cama\s*box|base\s*box|box\s*bau|sommier|estrado)\b/.test(combined)) {
    return MATTRESS_SUPPORT_NCM;
  }

  // 3. Estofados e Assentos (Sofás, Poltronas, Cadeiras, Banquetas, Puffs)
  const isChairOrStool = /\b(cadeira|banqueta|mocho)\b/.test(combined);
  if (isChairOrStool) {
    const hasNegativePadding = /\b(sem|nao)\s+(estofad\w*|almofad\w*|revestid\w*)\b/.test(combined);
    const isExplicitlyPadded =
      !hasNegativePadding &&
      /\b(estofad\w*|almofad\w*|revestid\w*|linho|veludo|courino|suede)\b/.test(combined);
    if (isExplicitlyPadded) {
      return isMetal ? UPHOLSTERED_METAL_SEATS_NCM : UPHOLSTERED_WOODEN_SEATS_NCM;
    }
    if (isPlastic) return OTHER_SEATS_NCM;
    if (isMetal) return OTHER_METAL_SEATS_NCM;
    return OTHER_WOODEN_SEATS_NCM;
  }

  const isUpholstered =
    !/\b(sem|nao)\s+estofad\w*\b/.test(combined) &&
    /\b(sofa|estofado|poltrona|chaise|recamier|diva|puff|pufe|namoradeira)\b/.test(combined);
  if (isUpholstered) {
    return isMetal ? UPHOLSTERED_METAL_SEATS_NCM : UPHOLSTERED_WOODEN_SEATS_NCM;
  }

  // 4. Dormitório / Quarto (Guarda-roupa, Roupeiro, Cômoda, Cama, Cabeceira, Criado-mudo...)
  // Regra do MoranteHub: guarda-roupa é móvel de quarto; por padrão é madeira -> 9403.50.00
  const isBedroomFurniture =
    /\b(guarda\s*roupa|roupeiro|closet|armario (de )?(quarto|dormitorio)|comoda|cama|cabeceira|criado\s*mudo|mesa de cabeceira|penteadeira|beliche|treliche|berco|quarto infantil|dormitorio)\b/.test(
      combined
    );
  if (isBedroomFurniture) {
    if (isPlastic) return PLASTIC_FURNITURE_NCM;
    if (isMetal) return OTHER_METAL_FURNITURE_NCM;
    return WOODEN_BEDROOM_FURNITURE_NCM;
  }

  // 5. Cozinha (Armário de cozinha, balcão de cozinha, pia, paneleiro, fruteira...)
  const isKitchenFurniture =
    /\b(cozinha|armario (de )?cozinha|balcao (de )?(cozinha|pia|fruteira)|gabinete (de )?(cozinha|pia)|paneleiro|fruteira|ilha (de )?cozinha|modulo cozinha|armario aereo)\b/.test(
      combined
    );
  if (isKitchenFurniture) {
    if (isMetal) return OTHER_METAL_FURNITURE_NCM;
    return WOODEN_KITCHEN_FURNITURE_NCM;
  }

  // 6. Escritório (Escrivaninha, mesa para computador, mesa gamer, gaveteiro...)
  const isOfficeFurniture =
    /\b(escritorio|office|escrivaninha|mesa (para |de )?computador|mesa gamer|gaveteiro|arquivo de aco|estante de aco)\b/.test(
      combined
    );
  if (isOfficeFurniture) {
    if (isMetal) return METAL_OFFICE_FURNITURE_NCM;
    return WOODEN_OFFICE_FURNITURE_NCM;
  }

  // 7. Sala / Jantar / Estar / Outros móveis (Rack, Painel TV, Estante, Buffet, Mesa de Centro, Mesa de Jantar...)
  const isLivingOrDiningFurniture =
    /\b(rack|painel (de |para )?tv|painel tv|estante|buffet|aparador|cristaleira|mesa (de )?(centro|canto|jantar)|mesa|balcao|sapateira|home theater|bar)\b/.test(
      combined
    );
  if (isLivingOrDiningFurniture) {
    if (isPlastic) return PLASTIC_FURNITURE_NCM;
    if (isMetal) return OTHER_METAL_FURNITURE_NCM;
    return OTHER_WOODEN_FURNITURE_NCM;
  }

  return null;
}
