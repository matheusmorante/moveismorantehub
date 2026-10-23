import { describe, expect, it } from 'vitest';
import {
  moveProductImage,
  moveProductImageGlobally,
  replaceImageUrlAcrossList,
  replaceProductImage,
  replaceProductImageGlobally,
  setProductCoverImage,
  setProductSecondaryImage,
} from './productImageOrdering';

describe('productImageOrdering', () => {
  const images = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'];

  it('reordena sem mutar a lista original', () => {
    expect(moveProductImage(images, 0, 2)).toEqual(['b.jpg', 'c.jpg', 'a.jpg', 'd.jpg']);
    expect(images).toEqual(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
  });

  it('reordena o pai e sincroniza a galeria herdada da variação única', () => {
    const product = {
      images: ['a.jpg', 'b.jpg', 'c.jpg'],
      variations: [{ images: ['a.jpg', 'b.jpg', 'c.jpg'] }],
    };

    expect(moveProductImageGlobally(product, 2, 1)).toEqual({
      images: ['a.jpg', 'c.jpg', 'b.jpg'],
      variations: [{ images: ['a.jpg', 'c.jpg', 'b.jpg'] }],
    });
    expect(product.images).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
    expect(product.variations[0].images).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('promove uma imagem a capa', () => {
    expect(setProductCoverImage(images, 2)).toEqual(['c.jpg', 'a.jpg', 'b.jpg', 'd.jpg']);
    expect(setProductCoverImage(images, 0)).toBe(images);
  });

  it('promove uma imagem a secundária (posição 1)', () => {
    expect(setProductSecondaryImage(images, 3)).toEqual(['a.jpg', 'd.jpg', 'b.jpg', 'c.jpg']);
    expect(setProductSecondaryImage(images, 1)).toBe(images);
    expect(setProductSecondaryImage(images, 0)).toBe(images);
  });

  it('substitui apenas um índice existente', () => {
    expect(replaceProductImage(images, 1, 'nova.jpg')).toEqual(['a.jpg', 'nova.jpg', 'c.jpg', 'd.jpg']);
    expect(replaceProductImage(images, 4, 'nova.jpg')).toBe(images);
  });

  it('substitui URL em lista com replaceImageUrlAcrossList', () => {
    expect(replaceImageUrlAcrossList(['a.jpg', 'b.jpg', 'a.jpg'], 'a.jpg', 'a-cropped.webp')).toEqual([
      'a-cropped.webp',
      'b.jpg',
      'a-cropped.webp',
    ]);
    expect(replaceImageUrlAcrossList(undefined, 'a.jpg', 'new.webp')).toEqual([]);
  });

  it('substitui imagem globalmente no produto pai e em todas as variações com replaceProductImageGlobally', () => {
    const product = {
      id: 'prod-1',
      name: 'Produto Teste',
      images: ['photo-1.jpg', 'photo-2.jpg', 'photo-3.jpg'],
      variations: [
        { id: 'var-1', name: 'Var 1', images: ['photo-1.jpg', 'photo-2.jpg'] },
        { id: 'var-2', name: 'Var 2', images: ['photo-2.jpg', 'photo-3.jpg'] },
        { id: 'var-3', name: 'Var 3', images: ['photo-1.jpg', 'photo-3.jpg'] },
      ],
    };

    const updated = replaceProductImageGlobally(product, 'photo-1.jpg', 'photo-1-cropped.webp');

    // Imagens do pai
    expect(updated.images).toEqual(['photo-1-cropped.webp', 'photo-2.jpg', 'photo-3.jpg']);
    // Variações que usavam photo-1.jpg foram atualizadas
    expect(updated.variations?.[0].images).toEqual(['photo-1-cropped.webp', 'photo-2.jpg']);
    expect(updated.variations?.[2].images).toEqual(['photo-1-cropped.webp', 'photo-3.jpg']);
    // Variação que NÃO usava photo-1.jpg permaneceu inalterada
    expect(updated.variations?.[1].images).toEqual(['photo-2.jpg', 'photo-3.jpg']);

    // Objeto original não foi mutado
    expect(product.images[0]).toBe('photo-1.jpg');
    expect(product.variations[0].images[0]).toBe('photo-1.jpg');
  });

  it('atualiza o campo legado da imagem principal e usa o índice quando a URL ficou desatualizada', () => {
    const product = {
      images: ['first.jpg', 'second.jpg'],
      variations: [{ image_url: 'stale-parent.jpg' }, { image_url: 'second.jpg' }],
    };

    expect(replaceProductImageGlobally(product, 'stale-parent.jpg', 'new.jpg', 1)).toEqual({
      images: ['first.jpg', 'new.jpg'],
      variations: [{ image_url: 'new.jpg' }, { image_url: 'second.jpg' }],
    });
  });
});

