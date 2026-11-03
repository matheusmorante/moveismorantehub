export function createCategoryEnvironmentFixtures(testRunId: string) {
  return {
    environments: [
      {
        id: `env-sala-${testRunId}`,
        name: `[TESTE_AUT] SALA DE ESTAR`,
        slug: `sala-de-estar-${testRunId}`,
        type: 'environment'
      },
      {
        id: `env-quarto-${testRunId}`,
        name: `[TESTE_AUT] QUARTO CASAL`,
        slug: `quarto-casal-${testRunId}`,
        type: 'environment'
      },
      {
        id: `env-varanda-${testRunId}`,
        name: `[TESTE_AUT] VARANDA VAZIA`,
        slug: `varanda-vazia-${testRunId}`,
        type: 'environment'
      },
      {
        id: `env-escritorio-${testRunId}`,
        name: `[TESTE_AUT] ESCRITORIO`,
        slug: `escritorio-${testRunId}`,
        type: 'environment'
      },
      {
        id: `env-jardim-${testRunId}`,
        name: `[TESTE_AUT] JARDIM`,
        slug: `jardim-${testRunId}`,
        type: 'environment'
      }
    ],
    categories: [
      {
        id: `cat-sofa-${testRunId}`,
        name: `[TESTE_AUT] SOFÁ COM PRODUTOS`,
        slug: `sofa-${testRunId}`,
        type: 'category'
      },
      {
        id: `cat-pufe-${testRunId}`,
        name: `[TESTE_AUT] PUFE COM AMBIENTES SEM PRODUTOS`,
        slug: `pufe-${testRunId}`,
        type: 'category'
      },
      {
        id: `cat-isolada-${testRunId}`,
        name: `[TESTE_AUT] CATEGORIA TOTALMENTE LIVRE`,
        slug: `isolada-${testRunId}`,
        type: 'category'
      },
      {
        id: `cat-multi-env-${testRunId}`,
        name: `[TESTE_AUT] CADEIRA MULTI AMBIENTES`,
        slug: `cadeira-multi-${testRunId}`,
        type: 'category'
      }
    ],
    // Vínculos N:N
    relationships: [
      { parent_id: `env-sala-${testRunId}`, child_id: `cat-sofa-${testRunId}` },
      { parent_id: `env-sala-${testRunId}`, child_id: `cat-pufe-${testRunId}` },
      { parent_id: `env-quarto-${testRunId}`, child_id: `cat-pufe-${testRunId}` },
      { parent_id: `env-sala-${testRunId}`, child_id: `cat-multi-env-${testRunId}` },
      { parent_id: `env-quarto-${testRunId}`, child_id: `cat-multi-env-${testRunId}` },
      { parent_id: `env-escritorio-${testRunId}`, child_id: `cat-multi-env-${testRunId}` },
      { parent_id: `env-jardim-${testRunId}`, child_id: `cat-multi-env-${testRunId}` }
    ],
    // Produtos vinculados
    productCategories: [
      { product_id: `prod-1-${testRunId}`, category_id: `cat-sofa-${testRunId}` },
      { product_id: `prod-2-${testRunId}`, category_id: `cat-sofa-${testRunId}` }
    ]
  };
}
