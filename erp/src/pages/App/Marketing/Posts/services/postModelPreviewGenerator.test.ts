import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));
import {
  assertNoUnresolvedPlaceholders,
  interpolateTemplatePrompt,
  resolveOpportunityRules,
  ANTI_HALLUCINATION_COMMERCIAL_RULES,
} from './postModelPromptBuilder';
import {
  extractProductImagesFromProduct,
  resolveModelAssets,
  validateGenerationPreFlight,
} from './postModelAssetResolver';
import { assemblePreviewPrompt } from './postModelPreviewGenerator';
import { PostTemplate } from '../types/postTemplate';

describe('Pipeline de Geração de Preview de Modelos de Posts', () => {
  describe('1. Resolução e Assert de Placeholders', () => {
    it('bloqueia e lança erro quando houver placeholders não resolvidos', () => {
      const promptComErro = 'Produto: {{product.name}} Preço: {{product.unknownVar}}';
      expect(() => assertNoUnresolvedPlaceholders(promptComErro)).toThrow(
        /Existem variáveis não resolvidas no prompt/
      );
    });

    it('permite prompt quando todos os placeholders forem devidamente resolvidos', () => {
      const rawPrompt = 'Compre {{product.name}} por {{product.price}} em {{product.installment}}';
      const resolved = interpolateTemplatePrompt(rawPrompt, {
        name: 'Guarda Roupa Infantil Q Encanto Slim',
        price: 'R$ 899,00',
        installment: '10x de R$ 89,90 sem juros',
      });

      expect(() => assertNoUnresolvedPlaceholders(resolved)).not.toThrow();
      expect(resolved).toContain('Guarda Roupa Infantil Q Encanto Slim');
      expect(resolved).toContain('R$ 899,00');
      expect(resolved).not.toContain('{{product.name}}');
    });
  });

  describe('2. Anti-Alucinação de Cópia Comercial', () => {
    it('contém regras explícitas proibindo termos inventados', () => {
      expect(ANTI_HALLUCINATION_COMMERCIAL_RULES).toContain('Do not invent any promotional claims');
      expect(ANTI_HALLUCINATION_COMMERCIAL_RULES).toContain('Últimas unidades');
      expect(ANTI_HALLUCINATION_COMMERCIAL_RULES).toContain('Oferta imperdível');
      expect(ANTI_HALLUCINATION_COMMERCIAL_RULES).toContain('Compre agora!');
    });
  });

  describe('3. Oportunidade Exclusiva', () => {
    it('se QUEIMA DOS SALVADOS: proíbe estritamente Última unidade e Liquidação', () => {
      const rules = resolveOpportunityRules('Queima dos Salvados 2026');
      expect(rules.normalized).toBe('QUEIMA_DOS_SALVADOS');
      expect(rules.strictlyProhibitedTerms).toContain('Última unidade');
      expect(rules.strictlyProhibitedTerms).toContain('Liquidação');
      expect(rules.instruction).toContain('OPORTUNIDADE EXCLUSIVA: QUEIMA DOS SALVADOS');
    });

    it('se ÚLTIMA UNIDADE: proíbe estritamente Queima dos Salvados e Liquidação', () => {
      const rules = resolveOpportunityRules('Última Unidade');
      expect(rules.normalized).toBe('ULTIMA_UNIDADE');
      expect(rules.strictlyProhibitedTerms).toContain('Queima dos Salvados');
      expect(rules.strictlyProhibitedTerms).toContain('Liquidação');
    });

    it('se sem oportunidade: não aplica nenhum selo', () => {
      const rules = resolveOpportunityRules('');
      expect(rules.normalized).toBe('SEM_OPORTUNIDADE');
      expect(rules.instruction).toContain('NENHUMA OPORTUNIDADE SELECIONADA');
    });
  });

  describe('4 e 5. Extração Semântica de Imagens', () => {
    it('V1/F1 -> primary, V1/F2 -> secondary, V2+/F1 -> variations', () => {
      const mockProduct = {
        mainImageUrl: 'https://exemplo.com/main.jpg',
        variations: [
          {
            id: 'v1',
            images: ['https://exemplo.com/v1_f1.jpg', 'https://exemplo.com/v1_f2.jpg'],
          },
          {
            id: 'v2',
            images: ['https://exemplo.com/v2_f1.jpg', 'https://exemplo.com/v2_f2.jpg'],
          },
          {
            id: 'v3',
            images: ['https://exemplo.com/v3_f1.jpg'],
          },
        ],
      };

      const extracted = extractProductImagesFromProduct(mockProduct);
      expect(extracted.primary).toBe('https://exemplo.com/v1_f1.jpg');
      expect(extracted.secondary).toBe('https://exemplo.com/v1_f2.jpg');
      expect(extracted.variations).toEqual([
        'https://exemplo.com/v2_f1.jpg',
        'https://exemplo.com/v3_f1.jpg',
      ]);
    });
  });

  describe('6 e 7. Montagem do Prompt com Diretrizes Semânticas', () => {
    it('quando secondary image existir, inclui instrução obrigatória de presença', () => {
      const mockTemplate: PostTemplate = {
        id: 't1',
        name: 'Queima dos Salvados',
        slug: 'queima',
        description: '',
        status: 'ACTIVE',
        category: 'Promoção',
        aspectRatio: '4:5',
        width: 1080,
        height: 1350,
        imagePrompt: 'Destaque {{product.name}} por {{product.price}}',
        fields: [],
        layout: [],
        reservedAreas: [],
        imageRules: { preserveProduct: true, generateEnvironment: true, fit: 'contain' },
        generationConfig: { provider: 'gemini', model: 'gemini-2.5-flash-image', referenceImageRequired: true },
        createdAt: '',
        updatedAt: '',
        version: 1,
      };

      const promptComSecundaria = assemblePreviewPrompt({
        template: mockTemplate,
        product: {
          name: 'Guarda Roupa Slim',
          price: 'R$ 799,00',
          mainImageUrl: 'https://exemplo.com/p1.jpg',
        },
        format: '4:5',
        opportunityName: 'Queima dos Salvados',
        images: {
          primary: 'https://exemplo.com/p1.jpg',
          secondary: 'https://exemplo.com/p2.jpg',
          variations: ['https://exemplo.com/v1.jpg'],
        },
        assets: resolveModelAssets(mockTemplate, 'Queima dos Salvados'),
      });

      expect(promptComSecundaria).toContain('SECONDARY_IMAGE is required and must be visibly present');
      expect(promptComSecundaria).toContain('CONTAINER DE VARIAÇÕES (OBRIGATÓRIO)');
      expect(promptComSecundaria).not.toContain('{{product.name}}');
      expect(promptComSecundaria).toContain('Guarda Roupa Slim');
    });
  });

  describe('14. Validação Pre-Flight antes da chamada', () => {
    it('rejeita chamada se nome ou imagem principal estiver ausente', () => {
      const res = validateGenerationPreFlight({
        productName: '',
        primaryImage: '',
        format: '4:5',
      });

      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Nome do produto é obrigatório.');
      expect(res.errors).toContain('Imagem principal do produto (PRIMARY_IMAGE) é obrigatória.');
    });
  });
});
