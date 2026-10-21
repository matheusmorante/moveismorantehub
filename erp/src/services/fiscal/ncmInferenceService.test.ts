import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  resolveSemanticNcmCode,
  inferNcmFromProductFacts,
} from './ncmInferenceService';
import { ncmService } from './ncmService';

vi.mock('./ncmService', () => ({
  ncmService: {
    getCatalogEntry: vi.fn(),
    searchNcms: vi.fn(),
  },
}));

describe('ncmInferenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveSemanticNcmCode (regras determinísticas)', () => {
    it('infere guarda-roupa como móveis de madeira para quarto (94035000)', () => {
      expect(resolveSemanticNcmCode({ title: 'Guarda Roupa Sidney 6 Portas' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Guarda-roupa Casal Branco' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Roupeiro 4 Portas Solteiro' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Closet Aberto Modulado' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Geroupa 3 portas' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Armário de quarto com espelho' })).toBe('94035000');
    });

    it('infere outros móveis de quarto como 94035000', () => {
      expect(resolveSemanticNcmCode({ title: 'Cômoda 4 Gavetas com Sapateira' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Cabeceira Queen Veludo' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Criado Mudo 2 Gavetas' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Mesa de cabeceira moderna' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Penteadeira com LED e Espelho' })).toBe('94035000');
      expect(resolveSemanticNcmCode({ title: 'Beliche Infantil Madeira Maciça' })).toBe('94035000');
    });

    it('infere móveis de quarto de metal como 94032000', () => {
      expect(
        resolveSemanticNcmCode({
          title: 'Guarda Roupa Organizador',
          material: 'Aço carbono',
        })
      ).toBe('94032000');
      expect(
        resolveSemanticNcmCode({
          title: 'Beliche Tubular de Ferro',
        })
      ).toBe('94032000');
    });

    it('infere móveis de cozinha como 94034000', () => {
      expect(resolveSemanticNcmCode({ title: 'Armário Aéreo de Cozinha' })).toBe('94034000');
      expect(resolveSemanticNcmCode({ title: 'Balcão de Pia Cozinha 120cm' })).toBe('94034000');
      expect(resolveSemanticNcmCode({ title: 'Paneleiro Duplo 4 Portas' })).toBe('94034000');
      expect(resolveSemanticNcmCode({ title: 'Fruteira com Tampo em Granito' })).toBe('94034000');
    });

    it('infere móveis de escritório como 94033000 (madeira) ou 94031000 (metal)', () => {
      expect(resolveSemanticNcmCode({ title: 'Escrivaninha Office com Gaveta' })).toBe('94033000');
      expect(resolveSemanticNcmCode({ title: 'Mesa para Computador Gamer' })).toBe('94033000');
      expect(resolveSemanticNcmCode({ title: 'Arquivo de Aço 4 Gavetas' })).toBe('94031000');
    });

    it('infere estofados como 94016100 (madeira) ou 94017100 (metal)', () => {
      expect(resolveSemanticNcmCode({ title: 'Sofá Retrátil e Reclinável 3 Lugares' })).toBe('94016100');
      expect(resolveSemanticNcmCode({ title: 'Poltrona Decorativa Sala' })).toBe('94016100');
      expect(resolveSemanticNcmCode({ title: 'Poltrona Base Giratória Metal', material: 'Metal' })).toBe('94017100');
      expect(resolveSemanticNcmCode({ title: 'Puff Quadrado Suede' })).toBe('94016100');
    });

    it('infere cadeiras estofadas e não estofadas', () => {
      expect(resolveSemanticNcmCode({ title: 'Cadeira de Jantar Estofada' })).toBe('94016100');
      expect(resolveSemanticNcmCode({ title: 'Cadeira Madeira Maciça Sem Estofado' })).toBe('94016900');
      expect(resolveSemanticNcmCode({ title: 'Cadeira de Metal Tubular' })).toBe('94017900');
      expect(resolveSemanticNcmCode({ title: 'Cadeira de Plástico Monobloco', material: 'Plástico' })).toBe('94018000');
    });

    it('infere colchões e bases box', () => {
      expect(resolveSemanticNcmCode({ title: 'Colchão de Molas Ensacadas Casal' })).toBe('94042900');
      expect(resolveSemanticNcmCode({ title: 'Colchão de Espuma D33 Solteiro' })).toBe('94042100');
      expect(resolveSemanticNcmCode({ title: 'Base Cama Box Casal' })).toBe('94041000');
      expect(resolveSemanticNcmCode({ title: 'Box Baú Queen Courino' })).toBe('94041000');
    });

    it('infere artigos têxteis de cama como 94049000', () => {
      expect(resolveSemanticNcmCode({ title: 'Travesseiro Nasa Viscoelástico' })).toBe('94049000');
      expect(resolveSemanticNcmCode({ title: 'Edredom Casal Dupla Face' })).toBe('94049000');
    });

    it('infere outros móveis de madeira (sala/estar/jantar) como 94036000', () => {
      expect(resolveSemanticNcmCode({ title: 'Rack para TV até 65 Polegadas' })).toBe('94036000');
      expect(resolveSemanticNcmCode({ title: 'Painel de TV Sala' })).toBe('94036000');
      expect(resolveSemanticNcmCode({ title: 'Mesa de Jantar 6 Cadeiras' })).toBe('94036000');
      expect(resolveSemanticNcmCode({ title: 'Buffet 3 Portas Sala de Jantar' })).toBe('94036000');
      expect(resolveSemanticNcmCode({ title: 'Aparador Retrô' })).toBe('94036000');
    });
  });

  describe('inferNcmFromProductFacts (integração com catálogo)', () => {
    it('retorna o NCM validado pelo catálogo para guarda-roupa', async () => {
      vi.mocked(ncmService.getCatalogEntry).mockResolvedValue({
        code: '94035000',
        official_description: 'Móveis de madeira, do tipo utilizado em quartos de dormir',
        active: true,
        is_active: true,
        start_date: null,
        end_date: null,
      });

      const result = await inferNcmFromProductFacts({
        title: 'Guarda-Roupa Casal 6 Portas',
        description: 'Amplo espaço interno com gavetas e cabideiros',
      });

      expect(result).not.toBeNull();
      expect(result?.code).toBe('94035000');
      expect(result?.description).toBe('Móveis de madeira, do tipo utilizado em quartos de dormir');
      expect(result?.source).toBe('semantic_rule');
      expect(ncmService.getCatalogEntry).toHaveBeenCalledWith('94035000');
    });

    it('faz busca no catálogo quando o produto for de outra categoria sem regra semântica', async () => {
      vi.mocked(ncmService.getCatalogEntry).mockImplementation(async (code) => {
        if (code === '84181000') {
          return {
            code: '84181000',
            official_description: 'Refrigeradores combinados com congelador',
            active: true,
            is_active: true,
            start_date: null,
            end_date: null,
          };
        }
        return null;
      });

      vi.mocked(ncmService.searchNcms).mockResolvedValue([
        {
          code: '84181000',
          official_description: 'Refrigeradores combinados com congelador',
          alias_match: 'Geladeira Frost Free',
          rank: 0.95,
        },
      ]);

      const result = await inferNcmFromProductFacts({
        title: 'Geladeira Frost Free Inox 400L',
        category: 'Eletrodomésticos',
        material: 'Inox',
      });

      expect(result).not.toBeNull();
      expect(result?.code).toBe('84181000');
      expect(result?.source).toBe('catalog_search');
      expect(ncmService.searchNcms).toHaveBeenCalledWith('eletrodomesticos', 10);
      expect(ncmService.searchNcms).toHaveBeenCalledWith('geladeira frost inox', 10);
    });

    it('descarta código se ele estiver inativo na loja e busca alternativa', async () => {
      // 94035000 está inativo
      vi.mocked(ncmService.getCatalogEntry).mockImplementation(async (code) => {
        if (code === '94035000') {
          return {
            code: '94035000',
            official_description: 'Móveis de madeira para quarto',
            active: false, // Inativo!
            is_active: false,
            start_date: null,
            end_date: null,
          };
        }
        if (code === '94036000') {
          return {
            code: '94036000',
            official_description: 'Outros móveis de madeira',
            active: true,
            is_active: true,
            start_date: null,
            end_date: null,
          };
        }
        return null;
      });

      vi.mocked(ncmService.searchNcms).mockResolvedValue([
        {
          code: '94036000',
          official_description: 'Outros móveis de madeira',
          alias_match: 'Guarda Roupa',
          rank: 0.8,
        },
      ]);

      const result = await inferNcmFromProductFacts({
        title: 'Guarda Roupa Especial',
      });

      expect(result).not.toBeNull();
      expect(result?.code).toBe('94036000');
      expect(result?.source).toBe('catalog_search');
    });

  });
});
