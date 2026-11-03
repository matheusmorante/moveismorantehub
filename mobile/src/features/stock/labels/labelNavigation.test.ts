import { describe, expect, it } from 'vitest';
import { buildMobileLabelsUrl, isTrustedMobileLabelsUrl } from './labelNavigation';

describe('acesso às etiquetas no aplicativo', () => {
  it('leva a variação selecionada à identificação e solicita o preenchimento da folha', () => {
    const url = new URL(buildMobileLabelsUrl('https://erp.example', {
      category: 'identificacao', productId: 'produto/1', variationId: 'variação 2', fillSheet: true,
    }));
    expect(url.pathname).toBe('/mobile/etiquetas');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      cat: 'identificacao', productId: 'produto/1', autoAddProduct: 'true',
      variationId: 'variação 2', fillSheet: '1',
    });
    expect(url.search).not.toMatch(/token|auth_email|user_id/);
  });

  it('restringe a tela que pode receber a sessão à origem e ao caminho esperados', () => {
    const base = 'https://erp.example';
    expect(isTrustedMobileLabelsUrl('https://erp.example/mobile/etiquetas?cat=identificacao', base)).toBe(true);
    expect(isTrustedMobileLabelsUrl('https://other.example/mobile/etiquetas', base)).toBe(false);
    expect(isTrustedMobileLabelsUrl('https://erp.example/login', base)).toBe(false);
    expect(isTrustedMobileLabelsUrl('https://erp.example/mobile/etiquetas?auth_email=x&user_id=y', base)).toBe(false);
    expect(isTrustedMobileLabelsUrl('http://erp.example/mobile/etiquetas', 'http://erp.example')).toBe(false);
  });
});
