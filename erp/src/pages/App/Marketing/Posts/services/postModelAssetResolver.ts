import { PostModelAsset, PostTemplate } from '../types/postTemplate';

export interface SemanticProductImages {
  primary: string;
  secondary?: string;
  variations: string[];
}

export interface ResolvedModelAssets {
  primaryVisualReference?: PostModelAsset;
  logoAsset?: PostModelAsset;
  opportunityAsset?: PostModelAsset;
  installmentAsset?: PostModelAsset;
  additionalAssets: PostModelAsset[];
}

export interface GenerationPreFlightValidation {
  valid: boolean;
  errors: string[];
}

export function extractProductImagesFromProduct(product: any): SemanticProductImages {
  const variations = (product?.variations || []).filter((v: any) => v.active !== false);

  let primary = '';
  let secondary: string | undefined = undefined;
  const variationImages: string[] = [];

  if (variations.length > 0) {
    const firstVarImages = variations[0]?.images || [];
    primary = firstVarImages[0] || product?.mainImageUrl || product?.image_url || '';
    secondary = firstVarImages[1];

    for (let i = 1; i < variations.length; i++) {
      const img = variations[i]?.images?.[0];
      if (img) variationImages.push(img);
    }
  } else {
    primary = product?.mainImageUrl || product?.image_url || '';
  }

  return {
    primary,
    secondary,
    variations: variationImages,
  };
}

export function resolveModelAssets(template: PostTemplate, opportunityName?: string): ResolvedModelAssets {
  const assets = template.assets || [];

  let primaryVisualReference: PostModelAsset | undefined = assets.find(
    (a) =>
      /visual_reference|referencia_principal|referência principal|original|anúncio original|anuncio original/i.test(
        a.name + ' ' + (a.description || '')
      ) || a.fileUrl.includes('queima-salvados-original.png')
  );

  // Fallback seguro se não houver asset explicitamente registrado no template
  if (!primaryVisualReference && /queima/i.test(template.name + ' ' + (opportunityName || ''))) {
    primaryVisualReference = {
      id: 'default-visual-reference-queima',
      name: 'Referência Visual Principal — Queima dos Salvados',
      description: 'Layout, estética, tipografia e hierarquia de composição oficial.',
      fileUrl: '/assets/queima-salvados-original.png',
      mimeType: 'image/png',
    };
  }

  let logoAsset: PostModelAsset | undefined = assets.find(
    (a) => /logo|marca|morante/i.test(a.name) && !/selo|badge/i.test(a.name)
  );
  if (!logoAsset) {
    logoAsset = {
      id: 'default-morante-logo',
      name: 'Logo Oficial Móveis Morante',
      description: 'Asset oficial da marca. Não redesenhar nem alterar.',
      fileUrl: '/images/logo-morante.png',
      mimeType: 'image/png',
    };
  }

  let opportunityAsset: PostModelAsset | undefined = undefined;
  const isQueima = /queima|salvados/i.test(opportunityName || '');
  if (isQueima) {
    opportunityAsset = assets.find((a) => /selo|badge|queima/i.test(a.name));
    if (!opportunityAsset) {
      opportunityAsset = {
        id: 'default-queima-seal',
        name: 'Selo Oficial Queima dos Salvados',
        description: 'Selo exclusivo da Queima dos Salvados.',
        fileUrl: '/assets/queima-salvados-original.png',
        mimeType: 'image/png',
      };
    }
  }

  let installmentAsset: PostModelAsset | undefined = assets.find((a) =>
    /parcel|cart|bandeira|10x/i.test(a.name)
  );
  if (!installmentAsset) {
    installmentAsset = {
      id: 'default-installment-asset',
      name: 'Asset Oficial de Parcelamento',
      description: 'EM ATÉ 10X SEM JUROS com bandeiras oficiais de cartão.',
      fileUrl: '/images/installment-badge-10x-transparent.png',
      mimeType: 'image/png',
    };
  }

  const reservedIds = new Set([
    primaryVisualReference?.id,
    logoAsset?.id,
    opportunityAsset?.id,
    installmentAsset?.id,
  ]);

  const additionalAssets = assets.filter((a) => !reservedIds.has(a.id));

  return {
    primaryVisualReference,
    logoAsset,
    opportunityAsset,
    installmentAsset,
    additionalAssets,
  };
}

export function validateGenerationPreFlight(params: {
  productName?: string;
  primaryImage?: string;
  template?: PostTemplate;
  format?: string;
  finalPrompt?: string;
  primaryVisualReference?: PostModelAsset;
}): GenerationPreFlightValidation {
  const errors: string[] = [];

  if (!params.productName?.trim()) {
    errors.push('Nome do produto é obrigatório.');
  }

  if (!params.primaryImage?.trim()) {
    errors.push('Imagem principal do produto (PRIMARY_IMAGE) é obrigatória.');
  }

  if (!params.template) {
    errors.push('Modelo de post não selecionado.');
  }

  if (!params.format) {
    errors.push('Formato de proporção não selecionado.');
  }

  if (params.finalPrompt && /{{[\s\S]*?}}/.test(params.finalPrompt)) {
    errors.push('Existem variáveis não resolvidas no prompt.');
  }

  if (!params.primaryVisualReference) {
    errors.push('Referência visual principal (VISUAL_REFERENCE_PRIMARY) ausente no modelo.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
