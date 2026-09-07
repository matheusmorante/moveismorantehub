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
      expect(fileNames).toContain('prompt.txt');
      expect(fileNames).toContain('INSTRUCOES.txt');
      expect(fileNames).toContain('INSTRUCOES.md');
      expect(fileNames).toContain('specification.json');

      // 2. Pasta product/ (com arquivos reais)
      expect(fileNames).toContain('product/primary.jpg');
      expect(fileNames).toContain('product/open-view.jpg');
      expect(fileNames).toContain('product/variations/branco.jpg');
      expect(fileNames).toContain('product/variations/freijo-grafite.jpg');

      // 3. Pasta official-assets/ (com arquivos reais)
      expect(fileNames).toContain('official-assets/logo.png');

      // 4. Pastas vazias terminantemente proibidas:
      // Como activeModels estava vazio, NENHUMA entrada references/ deve existir
      const referenceEntries = fileNames.filter(f => f.startsWith('references'));
      expect(referenceEntries).toHaveLength(0);

      // Todas as pastas existentes no ZIP devem conter pelo menos 1 arquivo real dentro
      const folders = fileNames.filter(f => unzipped.files[f].dir);
      for (const folder of folders) {
        const filesInFolder = fileNames.filter(f => !unzipped.files[f].dir && f.startsWith(folder));
        expect(filesInFolder.length).toBeGreaterThan(0);
      }

      // 5. Conteúdo do prompt.txt (prompt completo centralizado)
      const promptContent = await unzipped.file('prompt.txt')?.async('text');
      expect(promptContent).toBeDefined();
      expect(promptContent).toContain('MÓVEIS MORANTE — INSTRUÇÕES DE CRIAÇÃO DE POST');
      expect(promptContent).toContain('guarda-roupa-monza');
      expect(promptContent).toContain('IMAGENS OFICIAIS DO PRODUTO');
      expect(promptContent).toContain('Campanha Padrão');

      // 6. Conteúdo do INSTRUCOES.md
      const instrucoesContent = await unzipped.file('INSTRUCOES.md')?.async('text');
      expect(instrucoesContent).toContain('INSTRUÇÕES DO PACOTE DE CRIAÇÃO — MÓVEIS MORANTE');
      expect(instrucoesContent).toContain('prompt.txt');
      expect(instrucoesContent).toContain('NÃO REDESENHE O PRODUTO');
      expect(instrucoesContent).toContain('product/primary');
      expect(instrucoesContent).toContain('official-assets/logo');

      // 7. Conteúdo do specification.json (duplo identificador file e url + role semântica)
      const specJson = JSON.parse((await unzipped.file('specification.json')?.async('text')) || '{}');
      expect(specJson.product.name).toBe('Guarda Roupa Monza 4 Portas c/ Pés');
      expect(specJson.productImages.primary.file).toBe('product/primary.jpg');
      expect(specJson.productImages.primary.url).toBe('https://exemplo.com/monza-branco.jpg');
      expect(specJson.productImages.primary.role).toBe('PRIMARY');

      expect(specJson.productImages.openView.file).toBe('product/open-view.jpg');
      expect(specJson.productImages.openView.url).toBe('https://exemplo.com/monza-aberto.jpg');
      expect(specJson.productImages.openView.role).toBe('OPEN_VIEW');

      expect(specJson.productImages.variations[0].file).toBe('product/variations/branco.jpg');
      expect(specJson.productImages.variations[0].role).toBe('VARIATION_PRIMARY');
      expect(specJson.productImages.variations[1].file).toBe('product/variations/freijo-grafite.jpg');
      expect(specJson.productImages.variations[1].role).toBe('VARIATION_PRIMARY');

      expect(specJson.officialAssets.logo.file).toBe('official-assets/logo.png');
      expect(specJson.officialAssets.logo.role).toBe('OFFICIAL_ASSET');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('deve incluir imagens de referências na pasta references/ apenas quando houver arquivo real', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new Uint8Array([5, 6, 7, 8]).buffer),
      } as any)
    );

    try {
      const zipBlob = await generatePostContextZip({
        specification: dummySpec,
        activeModels: [
          {
            id: 'm1',
            name: 'Título Impactante Minimalista',
            category: 'title',
            imageUrl: 'https://exemplo.com/ref-title.jpg',
            visualPrompt: 'Estilo de título em bold com contraste',
          } as any,
          {
            id: 'm2',
            name: 'Modelo Sem Imagem',
            category: 'badge',
            imageUrl: '', // sem imagem
            visualPrompt: 'Prompt sem imagem',
          } as any,
        ],
      });

      const arrayBuffer = await zipBlob.arrayBuffer();
      const unzipped = await JSZip.loadAsync(arrayBuffer);
      const fileNames = Object.keys(unzipped.files);

      // Deve conter o arquivo da referência que tinha imagem
      expect(fileNames).toContain('references/title/titulo-impactante-minimalista.jpg');
      // NÃO deve conter pasta vazia para badge (que não tinha imagem)
      const badgeEntries = fileNames.filter(f => f.includes('references/badge'));
      expect(badgeEntries).toHaveLength(0);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
