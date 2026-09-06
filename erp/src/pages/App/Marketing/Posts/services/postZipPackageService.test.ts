import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { generatePostContextZip } from './postZipPackageService';
import { PostCreationSpecification } from '../types/postSpecification';

describe('postZipPackageService — Pacote post-context.zip para IA', () => {
  const dummySpec: PostCreationSpecification = {
    schemaVersion: '1.0',
    purpose: 'AI_POST_CREATION_INSTRUCTIONS',
    brand: { name: 'Móveis Morante' },
    product: {
      catalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza',
      id: 'prod-monza',
      name: 'Guarda Roupa Monza 4 Portas c/ Pés',
      price: 1299.9,
    },
    productImages: {
      primary: {
        url: 'https://exemplo.com/monza-branco.jpg',
        role: 'PRIMARY',
        variationName: 'Branco',
      },
      openView: {
        url: 'https://exemplo.com/monza-aberto.jpg',
        role: 'OPEN_VIEW',
        description: 'Visão interna',
      },
      variations: [
        {
          variationId: 'var-1',
          variationName: 'Branco',
          url: 'https://exemplo.com/monza-branco.jpg',
          role: 'VARIATION_PRIMARY',
        },
        {
          variationId: 'var-2',
          variationName: 'Freijó/Grafite',
          url: 'https://exemplo.com/monza-freijo.jpg',
          role: 'VARIATION_PRIMARY',
        },
      ],
    },
    officialAssets: {
      logo: {
        name: 'Logo Oficial',
        url: 'https://www.moveismorante.com.br/logo.png',
        role: 'OFFICIAL_ASSET',
      },
      badge: null,
    },
    campaign: {
      id: 'camp-1',
      name: 'Campanha Padrão',
      elements: [],
    },
    formats: [
      { key: 'FEED_4_5', name: 'Feed', aspectRatio: '4:5', referenceSize: '1080 × 1350' },
      { key: 'STORY_STATUS_9_16', name: 'Story', aspectRatio: '9:16', referenceSize: '1080 × 1920' },
    ],
    globalRules: 'Regras da loja',
    generatedAt: '2026-09-06T00:00:00Z',
    configurationVersion: 'test-hash',
  };

  it('deve gerar o arquivo ZIP com a árvore correta de diretórios e arquivos', async () => {
    // Mock simples de fetch para retornar buffer simulado
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer),
      } as any)
    );

    try {
      const zipBlob = await generatePostContextZip({
        specification: dummySpec,
        activeModels: [],
      });

      expect(zipBlob).toBeDefined();
      expect(zipBlob.size).toBeGreaterThan(0);

      const arrayBuffer = await zipBlob.arrayBuffer();
      const unzipped = await JSZip.loadAsync(arrayBuffer);
      const fileNames = Object.keys(unzipped.files);

      // 1. Arquivos raiz obrigatórios
      expect(fileNames).toContain('INSTRUCOES.md');
      expect(fileNames).toContain('specification.json');

      // 2. Pasta product/
      expect(fileNames).toContain('product/primary.jpg');
      expect(fileNames).toContain('product/open-view.jpg');
      expect(fileNames).toContain('product/variations/branco.jpg');
      expect(fileNames).toContain('product/variations/freijo-grafite.jpg');

      // 3. Pasta official-assets/
      expect(fileNames).toContain('official-assets/logo.png');

      // 4. Conteúdo do INSTRUCOES.md
      const instrucoesContent = await unzipped.file('INSTRUCOES.md')?.async('text');
      expect(instrucoesContent).toContain('INSTRUÇÕES DE CRIAÇÃO DE POST PUBLICITÁRIO');
      expect(instrucoesContent).toContain('NÃO REDESENHE O PRODUTO');
      expect(instrucoesContent).toContain('product/primary');
      expect(instrucoesContent).toContain('official-assets/logo');

      // 5. Conteúdo do specification.json (duplo identificador file e url + role semântica)
      const specJson = JSON.parse((await unzipped.file('specification.json')?.async('text')) || '{}');
      expect(specJson.product.name).toBe('Guarda Roupa Monza 4 Portas c/ Pés');
      expect(specJson.productImages.primary.file).toBe('product/primary.jpg');
      expect(specJson.productImages.primary.url).toBe('https://exemplo.com/monza-branco.jpg');
      expect(specJson.productImages.primary.role).toBe('PRIMARY');

      expect(specJson.productImages.openView.file).toBe('product/open-view.jpg');
      expect(specJson.productImages.openView.url).toBe('https://exemplo.com/monza-aberto.jpg');
      expect(specJson.productImages.openView.role).toBe('OPEN_VIEW');

      expect(specJson.productImages.variations[0].file).toBe('product/variations/branco.jpg');
      expect(specJson.productImages.variations[0].role).toBe('VARIATION');
      expect(specJson.productImages.variations[1].file).toBe('product/variations/freijo-grafite.jpg');
      expect(specJson.productImages.variations[1].role).toBe('VARIATION');

      expect(specJson.officialAssets.logo.file).toBe('official-assets/logo.png');
      expect(specJson.officialAssets.logo.role).toBe('OFFICIAL_ASSET');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
