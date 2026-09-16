import { removeAccents } from './textUtils';
import { aiService } from './aiService';

export interface CategoryCandidate {
    id: string;
    name?: string;
    category?: string;
}

/**
 * Normaliza o texto removendo acentos, pontuações e convertendo para minúsculas.
 */
function normalize(value: string): string {
    return removeAccents(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Regras heurísticas de alta precisão para categorização de móveis do ERP Morante Hub.
 * Atende aos padrões estabelecidos:
 * - "balcão para pia" -> "Balcões para Pia"
 * - "paneleiro" -> "Paneleiros"
 * - "armário aéreo" -> "Armários Aéreos"
 * - "cristaleira" -> "Cristaleiras"
 * - "mesa de jantar" -> "Conjunto para Sala de Jantar"
 * - "mesa para escritório" / "escrivaninha" -> "Mesas para Escritório"
 */
export function matchCategoryByRules(title: string, categories: readonly CategoryCandidate[]): CategoryCandidate | null {
    if (!title?.trim() || !categories?.length) return null;

    const normTitle = normalize(title);

    const findByName = (targetName: string): CategoryCandidate | undefined => {
        const normTarget = normalize(targetName);
        return categories.find(c => {
            const cName = normalize(c.name || c.category || '');
            return cName === normTarget || cName.includes(normTarget);
        });
    };

    // 1. Balcões
    if (normTitle.includes('balcao') || normTitle.includes('gabinete')) {
        if (normTitle.includes('pia')) {
            const matched = findByName('Balcões para Pia') || findByName('Balcao Pia') || findByName('Pias');
            if (matched) return matched;
        }
        if (normTitle.includes('cooktop')) {
            const matched = findByName('Balcões para Cooktop');
            if (matched) return matched;
        }
        if (normTitle.includes('fruteira')) {
            const matched = findByName('Balcões com Fruteiras');
            if (matched) return matched;
        }
        if (normTitle.includes('tampo')) {
            const matched = findByName('Balcões com Tampo');
            if (matched) return matched;
        }
        if (normTitle.includes('filtro')) {
            const matched = findByName('Balcões para Filtro');
            if (matched) return matched;
        }
        // Fallback para balcão genérico com pia se não especificado
        const matched = findByName('Balcões para Pia') || findByName('Balcões com Tampo');
        if (matched) return matched;
    }

    // 2. Paneleiros
    if (normTitle.includes('paneleiro')) {
        const matched = findByName('Paneleiros') || findByName('Paneleiro');
        if (matched) return matched;
    }

    // 3. Armários Aéreos
    if (normTitle.includes('aereo') || normTitle.includes('armario aereo')) {
        const matched = findByName('Armários Aéreos') || findByName('Armario Aereo');
        if (matched) return matched;
    }

    // 4. Cristaleiras
    if (normTitle.includes('cristaleira')) {
        const matched = findByName('Cristaleiras') || findByName('Cristaleira');
        if (matched) return matched;
    }

    // 5. Mesas e Cadeiras de Escritório vs Sala de Jantar
    if (normTitle.includes('escritorio') || normTitle.includes('escrivaninha')) {
        if (normTitle.includes('cadeira')) {
            const matched = findByName('Cadeiras para Escritório');
            if (matched) return matched;
        }
        const matched = findByName('Mesas para Escritório') || findByName('Escritório');
        if (matched) return matched;
    }

    if (normTitle.includes('jantar')) {
        if (normTitle.includes('cadeira')) {
            const matched = findByName('Cadeiras para Sala de Jantar') || findByName('Sala de Jantar');
            if (matched) return matched;
        }
        const matched = findByName('Conjunto para Sala de Jantar') || findByName('Sala de Jantar');
        if (matched) return matched;
    }

    // 6. Dormitório / Quarto
    if (normTitle.includes('guarda roupa') || normTitle.includes('roupeiro') || normTitle.includes('g roupa')) {
        const matched = findByName('Guarda-Roupas') || findByName('Guarda Roupa');
        if (matched) return matched;
    }

    if (normTitle.includes('berco') || normTitle.includes('berço')) {
        const matched = findByName('Berço') || findByName('Berços');
        if (matched) return matched;
    }

    if (normTitle.includes('comoda')) {
        const matched = findByName('Cômodas') || findByName('Comoda');
        if (matched) return matched;
    }

    if (normTitle.includes('sapateira')) {
        const matched = findByName('Sapateiras') || findByName('Sapateira');
        if (matched) return matched;
    }

    if (normTitle.includes('cabeceira')) {
        const matched = findByName('Cabeceiras') || findByName('Cabeceira');
        if (matched) return matched;
    }

    if (normTitle.includes('beliche')) {
        const matched = findByName('Beliches') || findByName('Beliche');
        if (matched) return matched;
    }

    if (normTitle.includes('treliche')) {
        const matched = findByName('Treliches') || findByName('Treliche');
        if (matched) return matched;
    }

    if (normTitle.includes('colchao')) {
        const matched = findByName('Colchões') || findByName('Colchao');
        if (matched) return matched;
    }

    if (normTitle.includes('cama') || normTitle.includes('box')) {
        const matched = findByName('Camas/Bases Box') || findByName('Camas');
        if (matched) return matched;
    }

    if (normTitle.includes('cabeceira') || normTitle.includes('criado mudo') || normTitle.includes('mesa de cabeceira')) {
        const matched = findByName('Mesas de Cabeceira');
        if (matched) return matched;
    }

    // 7. Sala de Estar
    if (normTitle.includes('aparador') || normTitle.includes('buffet')) {
        const matched = findByName('Aparadores Buffets');
        if (matched) return matched;
    }

    if (normTitle.includes('rack')) {
        const matched = findByName('Racks') || findByName('Rack');
        if (matched) return matched;
    }

    if (normTitle.includes('painel')) {
        const matched = findByName('Painéis') || findByName('Painel');
        if (matched) return matched;
    }

    if (normTitle.includes('home')) {
        const matched = findByName('Homes') || findByName('Home');
        if (matched) return matched;
    }

    if (normTitle.includes('estante')) {
        const matched = findByName('Estantes') || findByName('Estante');
        if (matched) return matched;
    }

    if (normTitle.includes('poltrona')) {
        const matched = findByName('Poltronas') || findByName('Poltrona');
        if (matched) return matched;
    }

    if (normTitle.includes('sofa')) {
        const matched = findByName('Sofás') || findByName('Sofa');
        if (matched) return matched;
    }

    if (normTitle.includes('penteadeira')) {
        const matched = findByName('Penteadeiras') || findByName('Penteadeira');
        if (matched) return matched;
    }

    if (normTitle.includes('multiuso')) {
        const matched = findByName('Armários Multiuso') || findByName('Armario Multiuso') || findByName('Multiuso');
        if (matched) return matched;
    }

    return null;
}

/**
 * Resolve automaticamente a categoria do produto:
 * 1. Primeiro via regras heurísticas dos padrões do sistema (rápido e determinístico)
 * 2. Em caso de não correspondência direta, aciona a IA com o catálogo de categorias
 */
export async function resolveAutoCategory(
    title: string,
    availableCategories: readonly CategoryCandidate[]
): Promise<CategoryCandidate | null> {
    if (!title?.trim() || !availableCategories?.length) return null;

    // 1. Tentar correspondência direta por regras
    const directMatch = matchCategoryByRules(title, availableCategories);
    if (directMatch) return directMatch;

    // 2. Chamar IA para sugerir categoria dentre as disponíveis
    try {
        const categoryNames = availableCategories
            .map(c => c.name || c.category || '')
            .filter(Boolean);

        const aiResult = await aiService.suggestCategory(title, categoryNames);
        const suggestedName = typeof aiResult === 'string' ? aiResult : (aiResult?.category || '');

        if (suggestedName?.trim()) {
            const normSuggested = normalize(suggestedName);
            const found = availableCategories.find(c => {
                const normCat = normalize(c.name || c.category || '');
                return normCat === normSuggested;
            });
            if (found) return found;
        }
    } catch (err) {
        console.warn('[categoryResolutionService] Falha ao sugerir categoria via IA:', err);
    }

    return null;
}
