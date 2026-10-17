'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export type TechnicalSpecification = { name: string; slug: string };

interface UseProductPageDisplayStateOptions {
  product: any;
  technicalSpecifications?: TechnicalSpecification[];
}

/**
 * Hook de domínio responsável pelo estado de apresentação do produto e cálculo
 * de sobrescritas dinâmicas das variações (título, preço, dimensões, imagens e especificações).
 */
export function useProductPageDisplayState({
  product,
  technicalSpecifications = [],
}: UseProductPageDisplayStateOptions) {
  const searchParams = useSearchParams();
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [activeImage, setActiveImage] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const activeVarId = searchParams?.get('var') || null;
  const activeVariation = product?.variations?.find(
    (v: any) => v.id === activeVarId && v.status !== 'hidden'
  );

  // Dynamic overrides de variação vs produto pai
  const isParentName = activeVariation ? activeVariation.use_parent_name !== false : true;
  const displayTitle =
    activeVariation && !isParentName && activeVariation.name ? activeVariation.name : product?.name || '';

  const isParentPrice = activeVariation ? activeVariation.use_parent_price !== false : true;
  const displayPrice =
    activeVariation && !isParentPrice && activeVariation.price
      ? parseFloat(activeVariation.price)
      : product?.price;

  const isParentPromo = activeVariation ? activeVariation.use_parent_promo_price !== false : true;
  const displayPromoPrice =
    activeVariation && !isParentPromo
      ? activeVariation.promo_price
        ? parseFloat(activeVariation.promo_price)
        : null
      : product?.promo_price;

  const isParentDesc = activeVariation ? activeVariation.use_parent_description !== false : true;
  const rawDescription =
    activeVariation && !isParentDesc && activeVariation.description
      ? activeVariation.description
      : product?.description;
  const displayDescription = rawDescription ? rawDescription.replace(/<br\s*\/?>/gi, '\n') : '';

  const isParentDims = activeVariation ? activeVariation.use_parent_dimensions !== false : true;
  const displayWidth =
    activeVariation && !isParentDims && activeVariation.width
      ? activeVariation.width
      : product?.width;
  const displayDepth =
    activeVariation && !isParentDims && activeVariation.depth
      ? activeVariation.depth
      : product?.depth;
  const displayHeight =
    activeVariation && !isParentDims && activeVariation.height
      ? activeVariation.height
      : product?.height;

  // Extração de espessura (seja de atributos técnicos, variações ou campos diretos)
  const extractThickness = useCallback((source: any) => {
    if (!source) return null;
    if (source.thickness) return source.thickness;
    const tValues =
      source.technical_specs?.technicalValues ||
      source.technicalValues ||
      source.technical_specs;
    if (tValues && typeof tValues === 'object') {
      for (const [key, val] of Object.entries(tValues)) {
        const lower = key.toLowerCase().trim();
        if (
          lower === 'espessura do colchão' ||
          lower === 'espessura do colchao' ||
          lower === 'espessura'
        ) {
          if (val !== null && val !== undefined && val !== '') return val;
        }
      }
    }
    if (source.attributes && typeof source.attributes === 'object') {
      for (const [key, val] of Object.entries(source.attributes)) {
        const lower = key.toLowerCase().trim();
        if (
          lower === 'espessura do colchão' ||
          lower === 'espessura do colchao' ||
          lower === 'espessura'
        ) {
          if (val !== null && val !== undefined && val !== '') return val;
        }
      }
    }
    return null;
  }, []);

  const varThickness = extractThickness(activeVariation);
  const prodThickness = extractThickness(product);
  const rawThickness =
    activeVariation && !isParentDims && varThickness ? varThickness : prodThickness;
  const displayThickness = rawThickness
    ? String(rawThickness).replace(/\s*cm$/i, '').trim()
    : null;

  // Imagens da variação ou do produto principal
  const varImages = useMemo(() => {
    return activeVariation?.image_url ? activeVariation.image_url.split(',').filter(Boolean) : [];
  }, [activeVariation?.image_url]);

  const displayImages = useMemo(() => {
    return varImages.length > 0 ? varImages : product?.images || [];
  }, [varImages, product?.images]);

  const totalImages = displayImages.length;

  // Sincroniza imagem ativa quando muda a variação ativa ou imagens
  useEffect(() => {
    if (displayImages.length > 0) {
      setActiveImage(displayImages[0]);
      setActiveIndex(0);
    }
  }, [activeVarId, product?.id, displayImages[0]]);

  // Sincroniza atributos selecionados com a variação
  useEffect(() => {
    if (activeVariation) {
      setSelectedAttributes(activeVariation.attributes || {});
    } else if (product?.variations?.[0]) {
      setSelectedAttributes(product.variations[0].attributes || {});
    }
  }, [activeVariation, product]);

  // Atributos possíveis para filtros
  const allAttributes = useMemo(() => {
    const attrs: Record<string, Set<string>> = {};
    product?.variations?.forEach((v: any) => {
      if (v.status === 'hidden') return;
      Object.entries(v.attributes || {}).forEach(([key, val]) => {
        if (!attrs[key]) attrs[key] = new Set();
        attrs[key].add(val as string);
      });
    });
    const result: Record<string, string[]> = {};
    Object.entries(attrs).forEach(([key, set]) => {
      result[key] = Array.from(set);
    });
    return result;
  }, [product]);

  // Medidas dinâmicas para a tabela de especificações
  const specsMap = product ? { ...product.technical_specs } : {};
  if (displayWidth) specsMap.largura = displayWidth;
  if (displayDepth) {
    if ((product as any)?.depth_use_length) {
      specsMap.comprimento = displayDepth;
    } else {
      specsMap.profundidade = displayDepth;
    }
  }
  if (displayHeight) specsMap.altura = displayHeight;
  if (displayThickness) specsMap.espessura = displayThickness;

  const technicalSpecs = useMemo(() => {
    if (technicalSpecifications && technicalSpecifications.length > 0 && specsMap) {
      return technicalSpecifications
        .map((specification) => [specification.name, specsMap[specification.slug]])
        .filter(([, value]) => value);
    }

    const DIMENSION_KEYS = new Set([
      'altura',
      'altura total',
      'largura',
      'largura total',
      'profundidade',
      'profundidade total',
      'comprimento',
      'comprimento total',
      'espessura',
      'espessura do colchão',
      'espessura do colchao',
    ]);

    const tValues =
      activeVariation?.technical_specs?.technicalValues ||
      activeVariation?.technicalValues ||
      product?.technical_specs?.technicalValues ||
      product?.technicalValues ||
      {};

    if (tValues && typeof tValues === 'object') {
      return Object.entries(tValues)
        .filter(([key, val]) => {
          if (!val) return false;
          if (DIMENSION_KEYS.has(key.toLowerCase().trim())) return false;
          if (
            ['draftproduct', 'variationdetails', 'testartifact', 'is_test', 'istest'].includes(
              key.toLowerCase().trim()
            )
          ) {
            return false;
          }
          return true;
        })
        .map(([key, val]) => [key, String(val)]);
    }

    return [];
  }, [technicalSpecifications, specsMap, activeVariation, product]);

  return {
    activeVarId,
    activeVariation,
    displayTitle,
    displayPrice,
    displayPromoPrice,
    displayDescription,
    displayWidth,
    displayDepth,
    displayHeight,
    displayThickness,
    displayImages,
    totalImages,
    activeImage,
    activeIndex,
    setActiveImage,
    setActiveIndex,
    selectedAttributes,
    setSelectedAttributes,
    allAttributes,
    technicalSpecs,
  };
}
