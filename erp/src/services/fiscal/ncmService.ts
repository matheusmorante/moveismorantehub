import { supabase } from '@/pages/utils/supabaseConfig';

export interface NcmSearchResult {
    code: string;
    official_description: string;
    alias_match: string | null;
    rank: number;
}

export interface NcmShortlistParams {
    title?: string;
    category?: string;
    description?: string;
    material?: string;
}

class NcmService {
    /**
     * Pesquisa NCMs no banco por código (exato ou parcial) ou texto
     * Busca tanto na descrição oficial quanto nos aliases comerciais
     */
    async searchNcms(searchTerm: string, maxResults: number = 20): Promise<NcmSearchResult[]> {
        if (!searchTerm || searchTerm.trim().length < 2) return [];

        try {
            const cleanSearchTerm = searchTerm.trim();
            
            const { data, error } = await supabase.rpc('search_ncms', { 
                search_term: cleanSearchTerm, 
                max_results: maxResults 
            });

            if (error) {
                console.error("Erro ao pesquisar NCMs via RPC:", error);
                throw error;
            }

            return data as NcmSearchResult[];
        } catch (error) {
            console.error("Erro no NcmService.searchNcms. Retornando fallback local para testes.", error);
            
            // Fallback mock para permitir o teste da interface sem o banco de dados atualizado
            const mockDb: NcmSearchResult[] = [
                { code: '94042900', official_description: 'Colchões de outras matérias', alias_match: 'Colchão', rank: 1 },
                { code: '94035000', official_description: 'Móveis de madeira dos tipos utilizados em quartos de dormir', alias_match: 'Guarda-roupa, Cama, Cabeceira, Estrutura de cama, Base de cama de madeira', rank: 1 },
                { code: '94032000', official_description: 'Outros móveis de metal', alias_match: 'Base de metal, Estrutura de cama de metal, Cama de metal', rank: 1 },
                { code: '94041000', official_description: 'Sommiers (Bases para colchões)', alias_match: 'Base box, Sommier, Estrutura de cama estofada, Base para colchão', rank: 1 },
                { code: '94036000', official_description: 'Outros móveis de madeira', alias_match: 'Mesa, Rack, Painel', rank: 1 },
                { code: '94016100', official_description: 'Outros assentos, com armação de madeira, estofados', alias_match: 'Cadeira estofada, Poltrona', rank: 1 },
                { code: '94014100', official_description: 'Assentos transformáveis em camas', alias_match: 'Sofá-cama', rank: 1 }
            ];

            const cleanQuery = searchTerm.replace(/\D/g, '');
            const textQuery = searchTerm.toLowerCase();

            const matches = mockDb.filter(m => 
                (cleanQuery && m.code.includes(cleanQuery)) || 
                m.official_description.toLowerCase().includes(textQuery) ||
                (m.alias_match && m.alias_match.toLowerCase().includes(textQuery))
            );

            return matches;
        }
    }

    /**
     * Gera uma shortlist de candidatos plausíveis de NCM para um dado produto.
     * Combina palavras-chave do título, categoria e material.
     */
    async generateShortlist(params: NcmShortlistParams): Promise<NcmSearchResult[]> {
        const { title = '', category = '', description = '', material = '' } = params;
        
        // 1. Extrair termos relevantes
        const terms = new Set<string>();
        
        const cleanTitle = title.toLowerCase().replace(/[^a-záéíóúâêôãõç0-9 ]/g, ' ');
        if (cleanTitle) {
            // Tenta o título inteiro
            terms.add(cleanTitle);
            
            // Tenta primeira e segunda palavras como composição (ex: "guarda roupa", "base box")
            const words = cleanTitle.split(/\s+/).filter(w => w.length > 2);
            if (words.length >= 2) {
                terms.add(`${words[0]} ${words[1]}`);
            }
            if (words.length >= 3) {
                terms.add(`${words[1]} ${words[2]}`);
            }
            // Adiciona palavras chave soltas
            for (const word of words) {
                terms.add(word);
            }
        }

        if (category) {
            const cleanCategory = category.toLowerCase().split('/').pop()?.trim();
            if (cleanCategory) terms.add(cleanCategory);
        }

        if (material) {
            const cleanMat = material.toLowerCase().trim();
            if (cleanMat) terms.add(cleanMat);
        }

        // Filtra "termos ruins" muito genéricos se houver outros melhores, mas no momento tenta buscar
        const searchPromises = Array.from(terms)
            .filter(t => t.length >= 3)
            .slice(0, 5) // Limita para não fuzilar o banco
            .map(term => this.searchNcms(term, 10));
            
        const results = await Promise.all(searchPromises);
        
        // Achatar e remover duplicatas, mantendo o maior rank
        const candidatesMap = new Map<string, NcmSearchResult>();
        
        for (const resList of results) {
            for (const res of resList) {
                const existing = candidatesMap.get(res.code);
                if (!existing || existing.rank < res.rank) {
                    candidatesMap.set(res.code, res);
                }
            }
        }

        // Retorna os top 15 candidatos
        return Array.from(candidatesMap.values())
            .sort((a, b) => b.rank - a.rank)
            .slice(0, 15);
    }
}

export const ncmService = new NcmService();
