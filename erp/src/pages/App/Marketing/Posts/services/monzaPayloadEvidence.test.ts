import { describe, it } from 'vitest';
import { buildSingleSpecification, renderSpecificationAsPrompt } from './postSpecificationBuilder';

describe('Evidência do Payload Real do Monza', () => {
  it('imprime a especificação e o prompt final gerados', async () => {
    // Dados reais do Monza recuperados do banco
    const monzaDbProduct: any = {
      id: "b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078",
      name: "Guarda Roupa Monza 4 Portas c/ Pés",
      slug: "guarda-roupa-monza-4-portas-c-pes",
      opportunity_id: null,
      opportunityId: null,
      unitPrice: 849,
      variations: [
        {
          id: "9cbed28f-2e89-4b4c-ad72-364ca08a8318",
          name: "Guarda Roupa Monza 4 Portas c/ Pés Branco",
          active: true,
          images: [
            "https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1785165669762-1785165669761.jpg",
            "https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1785165681388-1785165681387.jpg",
            "https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1785165687443-1785165687443.jpg"
          ]
        },
        {
          id: "98d1cb49-1ffa-41b1-aed3-2bc4df986162",
          name: "Guarda Roupa Monza 4 Portas c/ Pés Freijó/Grafite",
          active: true,
          images: [
            "https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1785165697961-1785165697960.jpg",
            "https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1785165708735-1785165708735.jpg"
          ]
        },
        {
          id: "d84aa3a6-5385-4525-aa98-bccfb2f06fc3",
          name: "Guarda Roupa Monza 4 Portas c/ Pés Freijó/Off White",
          active: true,
          images: [
            "https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1785165712391-1785165712390.jpg"
          ]
        }
      ]
    };

    const campaign: any = {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Campanha Padrão',
      description: 'Campanha padrão de marketing',
      instructions: 'Siga a paleta de cores e valorize o produto.',
    };

    const models: any[] = [
      {
        id: 'm-title',
        name: 'Título Padrão',
        elementType: 'TITLE',
        prompt: 'Posicione o título com boa legibilidade.',
        referenceFiles: [],
      },
      {
        id: 'm-badge-queima',
        name: 'Selo Queima dos Salvados',
        elementType: 'BADGE',
        opportunityId: '9d8bedae-b366-4f8c-ac49-74b85b882bde',
        prompt: 'Selo oficial Queima dos Salvados.',
        generatedAssetUrl: '/assets/queima-salvados-original.png',
        referenceFiles: [],
      },
    ];

    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign,
      activeModels: models,
      globalRules: 'Regras de Marca Móveis Morante',
      product: monzaDbProduct,
    });

    console.log('\n=== REAL MONZA SPECIFICATION (productImages & elements) ===\n');
    console.log(JSON.stringify({
      productImages: spec.productImages,
      elements: spec.campaign.elements.map(e => e.elementType),
    }, null, 2));

    console.log('\n=== REAL MONZA RENDERED PROMPT ===\n');
    console.log(renderSpecificationAsPrompt(spec));
  });
});
