import type {
  EcomLegibilityResult,
  PublishedCatalogEditIssue,
} from './types';

/**
 * Identifica os campos que deixaram de cumprir os requisitos de publicação no Catálogo Digital,
 * detalhando qual campo falhou e o que faltou preencher.
 */
export function getPublishedCatalogEditIssues(
  legibility: EcomLegibilityResult
): PublishedCatalogEditIssue[] {
  const issues: PublishedCatalogEditIssue[] = [];

  // Características obrigatórias da categoria
  if (legibility.missingCategoryCharacteristics.length > 0) {
    for (const characteristic of legibility.missingCategoryCharacteristics) {
      issues.push({
        field: `"${characteristic}"`,
        missing: 'característica obrigatória da categoria desativada ou sem valor preenchido',
      });
    }
  }

  // Falha na checagem de requisitos da categoria
  if (
    legibility.errors.some((err) =>
      err.includes('Não foi possível verificar as características obrigatórias')
    )
  ) {
    issues.push({
      field: 'Requisitos da Categoria',
      missing: 'não foi possível verificar as características obrigatórias da categoria',
    });
  }

  // Fotos
  if (!legibility.checks.images) {
    issues.push({
      field: 'Fotos',
      missing: 'adicione pelo menos uma foto ao produto',
    });
  }

  // Descrição do catálogo
  if (!legibility.checks.description) {
    issues.push({
      field: 'Descrição',
      missing: 'a descrição do catálogo deve ser preenchida com pelo menos 2 caracteres',
    });
  }

  // Nome do produto
  if (!legibility.checks.marketplaceTitle) {
    issues.push({
      field: 'Nome do Produto',
      missing: 'o nome do produto deve ter pelo menos 2 caracteres',
    });
  }

  // Preço promocional
  const hasPromoPriceError = legibility.errors.some((err) =>
    err.toLowerCase().includes('preço promocional') || err.toLowerCase().includes('preco promocional')
  );
  if (hasPromoPriceError) {
    issues.push({
      field: 'Preço Promocional',
      missing: 'o preço promocional deve ser menor que o preço de venda',
    });
  }

  // Preço de venda
  if (!legibility.checks.unitPrice) {
    issues.push({
      field: 'Preço de Venda',
      missing: 'o preço de venda deve ser informado e maior que zero',
    });
  }

  // Dimensões físicas
  if (!legibility.checks.dimensions) {
    issues.push({
      field: 'Dimensões',
      missing:
        'ative e preencha pelo menos uma dimensão física (altura, largura, profundidade ou comprimento) com valor maior que zero',
    });
  }

  // Categoria
  if (!legibility.checks.categories) {
    issues.push({
      field: 'Categoria',
      missing: 'selecione pelo menos uma categoria para o produto',
    });
  }

  // Fallback caso algum erro retornado em legibility.errors não tenha sido capturado acima
  if (issues.length === 0 && legibility.errors.length > 0) {
    for (const error of legibility.errors) {
      issues.push({
        field: 'Requisito do Catálogo',
        missing: error,
      });
    }
  }

  return issues;
}

/**
 * Constrói o texto explicativo do modal de confirmação para salvar produto
 * publicado que deixou de atender aos requisitos do Catálogo Digital.
 */
export function buildPublishedCatalogEditConfirmationMessage(
  legibility: EcomLegibilityResult
): string {
  const issues = getPublishedCatalogEditIssues(legibility);
  const issuesList =
    issues.length > 0
      ? issues.map((issue) => `• Campo ${issue.field}: ${issue.missing}.`).join('\n')
      : '• Requisitos do Catálogo Digital não atendidos.';

  const isSingular = issues.length <= 1;
  const complianceInstruction = isSingular
    ? 'Se quiser deixar o produto correto para ser publicado, clique em "Continuar editando" e ajuste a conformidade do campo citado acima antes de salvar.'
    : 'Se quiser deixar o produto correto para ser publicado, clique em "Continuar editando" e ajuste a conformidade dos campos citados acima antes de salvar.';

  return [
    'Este produto está atualmente publicado no Catálogo Digital, mas as alterações realizadas deixam o cadastro sem os requisitos necessários para permanecer publicado. Por esse motivo, ao salvar, ele será ocultado do Catálogo Digital.',
    '',
    'O que faltou ajustar:',
    issuesList,
    '',
    complianceInstruction,
    '',
    'Deseja salvar as alterações e ocultar o produto do Catálogo Digital?',
  ].join('\n');
}
