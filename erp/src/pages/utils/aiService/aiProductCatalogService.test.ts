import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  aiProductCatalogService,
  sanitizeGeneratedProductDescription,
} from './aiProductCatalogService';
import { callGeminiDirect } from './aiDirectClient';

vi.mock('./aiDirectClient', () => ({
  callGeminiDirect: vi.fn(),
}));

describe('aiProductCatalogService — Descrição de Produto com IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeGeneratedProductDescription', () => {
    it('remove linhas de característica de Cor do texto gerado', () => {
      const input = `Sofá Retrátil Confort é a escolha ideal para sua sala.

Características:
Modelo: Confort
Cor: Bege
Material: Veludo
- Cor: Castor
* cor: cinza grafite
Estrutura: Madeira de Eucalipto

Dimensões:
Altura: 105 cm`;

      const result = sanitizeGeneratedProductDescription(input);

      expect(result).not.toMatch(/cor\s*:/i);
      expect(result).toContain('Modelo: Confort');
      expect(result).toContain('Material: Veludo');
      expect(result).toContain('Estrutura: Madeira de Eucalipto');
    });

    it('substitui Modelo/Linha com barra por Modelo ou Linha sem barra', () => {
      const input = `Mesa de Jantar Elegance 6 Lugares.

Características:
Modelo/Linha: Elegance
Linha/Modelo: Linha Paris
- Modelo/Linha: Modelo Supreme
Material: MDF

Dimensões:
Largura: 160 cm`;

      const result = sanitizeGeneratedProductDescription(input);

      expect(result).not.toContain('Modelo/Linha:');
      expect(result).not.toContain('Linha/Modelo:');
      expect(result).not.toContain('/');
      expect(result).toContain('Modelo: Elegance');
      expect(result).toContain('Linha: Paris');
      expect(result).toContain('- Modelo: Supreme');
    });

    it('retorna string vazia caso o texto seja nulo ou indefinido', () => {
      expect(sanitizeGeneratedProductDescription('')).toBe('');
      expect(sanitizeGeneratedProductDescription(undefined as any)).toBe('');
    });
  });

  describe('improveProductDescription', () => {
    it('exclui Cor das informações técnicas enviadas no prompt e instrui a IA sobre Modelo/Linha e Cor', async () => {
      let capturedPrompt = '';
      vi.mocked(callGeminiDirect).mockImplementation(async (prompt) => {
        capturedPrompt = prompt;
        return `Sofá Dallas Retrátil 3 Lugares.

Características:
Modelo: Dallas
Material: Linho
Cor: Azul Petróleo

Dimensões:
Largura: 220 cm`;
      });

      const result = await aiProductCatalogService.improveProductDescription({
        title: 'Sofá Dallas Retrátil 3 Lugares',
        currentDescription: '',
        brand: 'Morante',
        line: 'Linha Ouro',
        model: 'Dallas',
        width: 220,
        height: 100,
        depth: 105,
        technicalValues: {
          'Modelo/Linha': 'Dallas',
          Cor: 'Azul Petróleo',
          Estrutura: 'Madeira Maciça',
        },
      });

      // 1. O prompt enviado ao Gemini NÃO deve ter "- Cor: Azul Petróleo" nas informações técnicas
      expect(capturedPrompt).not.toContain('- Cor: Azul Petróleo');
      expect(capturedPrompt).toContain('- Estrutura: Madeira Maciça');

      // 2. Não deve vazar a chave bruta "Modelo/Linha:" nas informações técnicas enviadas
      expect(capturedPrompt).not.toContain('- Modelo/Linha: Dallas');
      expect(capturedPrompt).toContain('Linha e/ou Modelo informado: Dallas');

      // 3. Prompt deve ter as diretrizes mandatórias
      expect(capturedPrompt).toContain('NUNCA escreva o termo "Modelo/Linha" ou "Linha/Modelo" com barra "/"');
      expect(capturedPrompt).toContain('A característica "Cor" NUNCA deve ser apresentada na descrição');

      // 4. A resposta final higienizada não deve ter "Cor:" nem barra "/"
      expect(result.improvedDescription).not.toMatch(/cor\s*:/i);
      expect(result.improvedDescription).toContain('Modelo: Dallas');
    });

    it('lida com produto que tem apenas Linha informada', async () => {
      let capturedPrompt = '';
      vi.mocked(callGeminiDirect).mockImplementation(async (prompt) => {
        capturedPrompt = prompt;
        return 'Guarda Roupa Linha Paris 6 Portas.';
      });

      await aiProductCatalogService.improveProductDescription({
        title: 'Guarda Roupa Paris',
        currentDescription: '',
        line: 'Paris',
      });

      expect(capturedPrompt).toContain('- Linha: Paris');
      expect(capturedPrompt).not.toContain('- Modelo:');
    });
  });

  describe('generateDescriptionFromInformativeText', () => {
    it('instrui a IA a não usar barra em Modelo/Linha e a não incluir cor', async () => {
      let capturedPrompt = '';
      vi.mocked(callGeminiDirect).mockImplementation(async (prompt) => {
        capturedPrompt = prompt;
        return `Cama Box Queen.

Características:
Modelo/Linha: Queen Confort
Cor: Cinza`;
      });

      const result = await aiProductCatalogService.generateDescriptionFromInformativeText({
        productName: 'Cama Box Queen',
        informativeText: 'Cama queen molas ensacadas, cor cinza, modelo Queen Confort',
        brand: 'Morante Sleep',
      });

      expect(capturedPrompt).toContain('NUNCA use o termo com barra "Modelo/Linha" ou "Linha/Modelo"');
      expect(capturedPrompt).toContain('NUNCA inclua a característica "Cor"');

      // Higienização automática
      expect(result.description).not.toMatch(/cor\s*:/i);
      expect(result.description).not.toContain('Modelo/Linha:');
      expect(result.description).toContain('Modelo: Queen Confort');
    });
  });
});
