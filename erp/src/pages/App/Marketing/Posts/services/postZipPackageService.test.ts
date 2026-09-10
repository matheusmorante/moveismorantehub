import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { generatePostContextZip } from './postZipPackageService';
import { PostCreationSpecification } from '../types/postSpecification';

describe('postZipPackageService — Pacote post-context.zip para IA', () => {
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const pngBytes = Uint8Array.from(
    atob(pngBase64),
    character => character.charCodeAt(0),
  );
  const imageResponse = (bytes = pngBytes, contentType = 'image/png') => ({
    ok: true,
    status: 200,
    headers: { get: (name: string) => name.toLowerCase() === 'content-type' ? contentType : null },
    arrayBuffer: () => Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
  });

  const badgeOnlySpec = (source: string): PostCreationSpecification => ({
    ...dummySpec,
    productImages: undefined,
    officialAssets: {
      logo: { name: 'Logo omitido no teste', url: '', role: 'OFFICIAL_ASSET' },
      badge: {
        name: 'Selo da Biblioteca',
        url: source,
        role: 'OFFICIAL_ASSET',
        opportunityId: 'opp-queima',
        opportunityName: 'Queima dos Salvados',
      },
    },
    campaign: { ...dummySpec.campaign, elements: [] },
  });

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
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(imageResponse() as any));

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
      expect(fileNames).toContain('prompt.md');
      expect(fileNames.filter(name => name.endsWith('.md'))).toEqual(['prompt.md']);
      expect(fileNames).not.toContain('specification.json');

      // 2. Pasta product/ (com arquivos reais em formato PNG)
      expect(fileNames).toContain('product/primary.png');
      expect(fileNames).toContain('product/secondary.png');
      expect(fileNames).toContain('product/variations/variation-01-branco.png');
      expect(fileNames).toContain('product/variations/variation-02-freijo-grafite.png');

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

      // 5. Conteúdo do prompt.md (prompt completo centralizado)
      const promptContent = await unzipped.file('prompt.md')?.async('text');
      expect(promptContent).toBeDefined();
      expect(promptContent).toContain('MÓVEIS MORANTE — INSTRUÇÕES DE CRIAÇÃO DE POST');
      expect(promptContent).toContain(dummySpec.product.catalogUrl);
      expect(promptContent?.match(/https?:\/\//gi)).toHaveLength(1);
      expect(promptContent).toContain('IMAGENS OFICIAIS DO PRODUTO');
      expect(promptContent).toContain('Campanha Padrão');
      expect(promptContent).toContain('IMAGEM SECUNDÁRIA');
      expect(promptContent).toContain('flutuando, sem borda');
      expect(promptContent).toContain('borda branca SOMENTE');
      expect(promptContent).toContain('product/primary.png');
      expect(promptContent).toContain('product/secondary.png');
      expect(promptContent).toContain('official-assets/logo.png');

      const packagedAssets = fileNames.filter(name => !unzipped.files[name].dir && name !== 'prompt.md');
      for (const assetName of packagedAssets) {
        expect(promptContent).toContain(`\`${assetName}\``);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('deve incluir anexos estruturados com nomes estáveis, sem colisão e referenciados no prompt', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(imageResponse() as any));

    try {
      const specification: PostCreationSpecification = {
        ...dummySpec,
        campaign: {
          ...dummySpec.campaign,
          elements: [{
            elementType: 'TITLE',
            prompt: 'Título com contraste e hierarquia.',
            resources: [
              { role: 'REFERENCE', elementType: 'TITLE', name: 'Referência', url: 'https://exemplo.com/a.jpg', mimeType: 'image/jpeg' },
              { role: 'REFERENCE', elementType: 'TITLE', name: 'Referência', url: 'https://exemplo.com/b.jpg', mimeType: 'image/jpeg' },
            ],
          }],
        },
      };
      const zipBlob = await generatePostContextZip({ specification });

      const arrayBuffer = await zipBlob.arrayBuffer();
      const unzipped = await JSZip.loadAsync(arrayBuffer);
      const fileNames = Object.keys(unzipped.files);

      // Deve conter o arquivo da referência em PNG
      expect(fileNames).toContain('references/01-title/01-referencia.png');
      expect(fileNames).toContain('references/01-title/02-referencia.png');

      const promptContent = await unzipped.file('prompt.md')?.async('text');
      expect(promptContent).toContain(dummySpec.product.catalogUrl);
      expect(promptContent?.match(/https?:\/\//gi)).toHaveLength(1);
      expect(promptContent).toContain('`references/01-title/01-referencia.png`');
      expect(promptContent).toContain('`references/01-title/02-referencia.png`');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('deve empacotar o selo selecionado uma única vez e ignorar a referência duplicada do elemento BADGE', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(imageResponse() as any));

    try {
      const badgeUrl = 'https://exemplo.com/biblioteca/selo-queima-com-fogos.png';
      const specification: PostCreationSpecification = {
        ...dummySpec,
        officialAssets: {
          ...dummySpec.officialAssets!,
          badge: {
            name: 'Selo Queima dos Salvados',
            url: badgeUrl,
            role: 'OFFICIAL_ASSET',
            opportunityId: 'opp-queima',
            opportunityName: 'Queima dos Salvados',
          },
        },
        campaign: {
          ...dummySpec.campaign,
          elements: [{
            elementType: 'BADGE',
            prompt: 'Aplicar o selo da oportunidade no topo direito.',
            resources: [{
              role: 'OFFICIAL_ASSET',
              elementType: 'BADGE',
              name: 'Selo duplicado legado',
              url: badgeUrl,
              mimeType: 'image/png',
            }],
          }],
        },
      };

      const zipBlob = await generatePostContextZip({ specification });
      const unzipped = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      const fileNames = Object.keys(unzipped.files);
      const promptContent = await unzipped.file('prompt.md')?.async('text') || '';

      expect(fileNames).toContain('official-assets/badge.png');
      expect(fileNames.filter(name => name.includes('badge') && !unzipped.files[name].dir)).toEqual([
        'official-assets/badge.png',
      ]);
      expect(fileNames.some(name => name.startsWith('references/') && name.endsWith('.png'))).toBe(false);
      expect(promptContent.split('`official-assets/badge.png`')).toHaveLength(2);
      expect(promptContent).not.toContain('Selo duplicado legado');
    } finally {
      global.fetch = originalFetch;
    }
  });

  const jpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
  const webpBytes = Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, 0x08, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  ]);
  const svgText = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
  const svgBytes = new TextEncoder().encode(svgText);

  it.each([
    { label: 'data URL PNG', source: `data:image/png;base64,${pngBase64}`, bytes: pngBytes, mime: 'image/png', extension: 'png' },
    { label: 'base64 puro', source: pngBase64, bytes: pngBytes, mime: '', extension: 'png' },
    { label: 'data URL SVG codificada', source: `data:image/svg+xml,${encodeURIComponent(svgText)}`, bytes: svgBytes, mime: 'image/svg+xml', extension: 'svg' },
    { label: 'blob URL', source: 'blob:https://morantehub.vercel.app/badge-id', bytes: pngBytes, mime: 'image/png', extension: 'png' },
    { label: 'URL JPEG', source: 'https://example.com/badge', bytes: jpegBytes, mime: 'image/jpeg', extension: 'jpg' },
    { label: 'JPEG com Content-Type incorreto', source: 'https://example.com/badge-mal-tipado', bytes: jpegBytes, mime: 'image/png', extension: 'jpg' },
    { label: 'URL WebP', source: 'https://example.com/badge.webp', bytes: webpBytes, mime: 'image/webp', extension: 'webp' },
  ])('deve preservar bytes e extensão real do selo vindo de $label', async ({ source, bytes, mime, extension }) => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(imageResponse(bytes, mime) as any));

    try {
      const zipBlob = await generatePostContextZip({ specification: badgeOnlySpec(source) });
      const unzipped = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      const badgePath = `official-assets/badge.${extension}`;
      const packagedBytes = await unzipped.file(badgePath)?.async('uint8array');
      const promptContent = await unzipped.file('prompt.md')?.async('text') || '';

      expect(packagedBytes).toEqual(bytes);
      expect(promptContent).toContain(`\`${badgePath}\``);
      expect(promptContent.split(`\`${badgePath}\``)).toHaveLength(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('deve omitir HTML/JSON inválido e ainda gerar um ZIP íntegro sem referência órfã', async () => {
    const originalFetch = global.fetch;
    const htmlBytes = new TextEncoder().encode('<html><body>Access denied</body></html>');
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(imageResponse(htmlBytes, 'image/png') as any));

    try {
      const zipBlob = await generatePostContextZip({
        specification: badgeOnlySpec('https://example.com/badge-protegido'),
      });
      const unzipped = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      const fileNames = Object.keys(unzipped.files);
      const promptContent = await unzipped.file('prompt.md')?.async('text') || '';

      expect(fileNames.some(name => name.startsWith('official-assets/badge.'))).toBe(false);
      expect(promptContent).not.toContain('official-assets/badge.');
      expect(promptContent).not.toContain('ELEMENTO: BADGE');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it.each([
    { label: 'HTTP 404', response: { ok: false, status: 404, headers: { get: () => 'text/html' }, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) } },
    { label: 'CORS/Failed to fetch', response: new TypeError('Failed to fetch') },
  ])('deve continuar gerando ZIP sem selo quando ocorrer $label', async ({ response }) => {
    const originalFetch = global.fetch;
    global.fetch = response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue(response as any);

    try {
      const zipBlob = await generatePostContextZip({
        specification: badgeOnlySpec('https://www.moveismorante.com.br/assets/queima-salvados-original.png'),
      });
      const unzipped = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      const fileNames = Object.keys(unzipped.files);
      const promptContent = await unzipped.file('prompt.md')?.async('text') || '';

      expect(fileNames).toContain('prompt.md');
      expect(fileNames.some(name => name.startsWith('official-assets/badge.'))).toBe(false);
      expect(promptContent).not.toContain('official-assets/badge.');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('deve preferir bytes locais do referenceFiles quando a URL pública do selo estiver quebrada', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const specification = badgeOnlySpec('https://www.moveismorante.com.br/assets/queima-salvados-original.png');

    try {
      const zipBlob = await generatePostContextZip({
        specification,
        activeModels: [{
          id: 'badge-model',
          name: 'Selo Queima com Fogos',
          elementType: 'BADGE',
          contentKind: 'STATIC_VISUAL',
          opportunityId: 'opp-queima',
          prompt: 'Aplicar o selo oficial da oportunidade.',
          referenceFiles: [{
            id: 'badge-local',
            name: 'Selo local',
            fileUrl: `data:image/png;base64,${pngBase64}`,
            mimeType: 'image/png',
          }],
          generatedAssetUrl: 'https://www.moveismorante.com.br/assets/queima-salvados-original.png',
          generationVersion: 1,
          status: 'UPDATED',
          createdAt: '2026-09-09T00:00:00Z',
          updatedAt: '2026-09-09T00:00:00Z',
        }],
      });
      const unzipped = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      const badgeBytes = await unzipped.file('official-assets/badge.png')?.async('uint8array');
      const promptContent = await unzipped.file('prompt.md')?.async('text') || '';

      expect(badgeBytes).toEqual(pngBytes);
      expect(promptContent.split('`official-assets/badge.png`')).toHaveLength(2);
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
