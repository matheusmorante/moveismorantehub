import { describe, it, expect } from 'vitest';
import {
  resolveProductImages,
  toAbsoluteHttpsUrl,
  isForbiddenProductImageUrl,
} from './postProductImageResolver';

describe('postProductImageResolver — Seleção e Estruturação de Imagens', () => {
  it('1. produto com uma variação: Foto 1 = PRIMARY', () => {
    const product: any = {
      id: 'prod-1',
      name: 'Mesa de Jantar 4 Lugares',
      variations: [
        {
          id: 'var-1',
          name: 'Madeira Natural',
          images: ['https://example.com/mesa-1.jpg'],
        },
      ],
    };

    const { productImages, validation } = resolveProductImages({ product });
    expect(validation.valid).toBe(true);
    expect(productImages.primary?.role).toBe('PRIMARY');
    expect(productImages.primary?.url).toBe('https://example.com/mesa-1.jpg');
    expect(productImages.openView).toBeNull();
    // Variação única: a variação principal já é PRIMARY, não há demais variações
    expect(productImages.variations).toHaveLength(0);
  });

  it('2. produto com primeira variação contendo Foto 2: OPEN_VIEW correto', () => {
    const product: any = {
      id: 'prod-monza',
      name: 'Guarda-Roupa Monza 4 Portas',
      variations: [
        {
          id: 'var-branco',
          name: 'Branco',
          images: [
            'https://example.com/monza-fechado.jpg',
            'https://example.com/monza-aberto.jpg',
          ],
        },
      ],
    };

    const { productImages, validation } = resolveProductImages({ product });
    expect(validation.valid).toBe(true);
    expect(productImages.primary?.role).toBe('PRIMARY');
    expect(productImages.primary?.url).toBe('https://example.com/monza-fechado.jpg');
    expect(productImages.openView?.role).toBe('OPEN_VIEW');
    expect(productImages.openView?.url).toBe('https://example.com/monza-aberto.jpg');
    expect(productImages.variations).toHaveLength(0);
  });

  it('3. produto com 3 variações: primeira foto de cada uma das DEMAIS variações em variations', () => {
    const product: any = {
      id: 'prod-monza',
      name: 'Guarda-Roupa Monza 4 Portas',
      variations: [
        {
          id: 'var-branco',
          name: 'Branco',
          images: ['https://example.com/branco-1.jpg', 'https://example.com/branco-2.jpg'],
        },
        {
          id: 'var-freijo',
          name: 'Freijó',
          images: ['https://example.com/freijo-1.jpg', 'https://example.com/freijo-2.jpg'],
        },
        {
          id: 'var-cinamomo',
          name: 'Cinamomo',
          images: ['https://example.com/cinamomo-1.jpg'],
        },
      ],
    };

    const { productImages, validation } = resolveProductImages({ product });
    expect(validation.valid).toBe(true);
    // Branco é a variação principal (PRIMARY/OPEN_VIEW) e não repete em variations
    expect(productImages.variations).toHaveLength(2);
    expect(productImages.variations[0].url).toBe('https://example.com/freijo-1.jpg');
    expect(productImages.variations[0].variationName).toBe('Freijó');
    expect(productImages.variations[1].url).toBe('https://example.com/cinamomo-1.jpg');
    expect(productImages.variations[1].variationName).toBe('Cinamomo');
  });

  it('4. imagem da variação 2 nunca vira primary da variação 1', () => {
    const product: any = {
      id: 'prod-armario',
      name: 'Armário Multiuso',
      variations: [
        {
          id: 'var-1',
          name: 'Amêndoa',
          images: ['https://example.com/amendoa.jpg'],
        },
        {
          id: 'var-2',
          name: 'Preto',
          images: ['https://example.com/preto.jpg'],
        },
      ],
    };

    const { productImages } = resolveProductImages({ product });
    expect(productImages.primary?.url).toBe('https://example.com/amendoa.jpg');
    expect(productImages.primary?.variationName).toBe('Amêndoa');
    expect(productImages.primary?.url).not.toBe('https://example.com/preto.jpg');
  });

  it('5, 6, 7. badges, logos e banners não entram em productImages', () => {
    expect(isForbiddenProductImageUrl('https://example.com/banners/promocao.jpg')).toBe(true);
    expect(isForbiddenProductImageUrl('https://example.com/logos/morante.png')).toBe(true);
    expect(isForbiddenProductImageUrl('https://example.com/badges/queima-salvados.png')).toBe(true);
    expect(isForbiddenProductImageUrl('https://example.com/opportunities/selo.png')).toBe(true);

    const product: any = {
      id: 'prod-comoda',
      name: 'Cômoda 4 Gavetas',
      variations: [
        {
          id: 'var-1',
          name: 'Branco',
          images: [
            'https://example.com/banners/banner_topo.jpg',
            'https://example.com/comoda_real.jpg',
          ],
        },
      ],
    };

    const { productImages } = resolveProductImages({ product });
    expect(productImages.primary?.url).toBe('https://example.com/comoda_real.jpg');
  });

  it('12. URLs são normalizadas para HTTPS absolutas', () => {
    expect(toAbsoluteHttpsUrl('http://example.com/foto.jpg')).toBe('https://example.com/foto.jpg');
    expect(toAbsoluteHttpsUrl('//example.com/foto.jpg')).toBe('https://example.com/foto.jpg');
    expect(toAbsoluteHttpsUrl('/uploads/foto.jpg', 'https://www.moveismorante.com.br')).toBe(
      'https://www.moveismorante.com.br/uploads/foto.jpg'
    );
    expect(toAbsoluteHttpsUrl('uploads/foto.jpg', 'https://www.moveismorante.com.br')).toBe(
      'https://www.moveismorante.com.br/uploads/foto.jpg'
    );
  });

  it('14. produto sem OPEN_VIEW: não inventa', () => {
    const product: any = {
      id: 'prod-sofa',
      name: 'Sofá 2 Lugares',
      variations: [
        {
          id: 'var-cinza',
          name: 'Cinza',
          images: ['https://example.com/sofa-cinza.jpg'],
        },
      ],
    };

    const { productImages, validation } = resolveProductImages({ product });
    expect(productImages.openView).toBeNull();
    expect(validation.warnings.some(w => w.toLowerCase().includes('secundária') || w.toLowerCase().includes('foto 2'))).toBe(true);
  });

  it('17. validação emite erro claro se não houver foto principal', () => {
    const product: any = {
      id: 'prod-vazio',
      name: 'Produto sem foto',
      variations: [
        {
          id: 'var-1',
          name: 'Variação 1',
          images: [],
        },
      ],
    };

    const { validation } = resolveProductImages({ product });
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('O produto selecionado não possui foto principal cadastrada.');
  });
});
