import { describe, expect, it } from 'vitest';
import { findEquivalentAttributeValue, resolveInboundVariationAction } from '../inboundVariationResolution';

describe('resolução de nova variação da NF', () => {
  it('reutiliza valores de cor equivalentes sem colapsar cores diferentes', () => {
    expect(findEquivalentAttributeValue(['Branco', 'Freijó/Off White'], ' FREIJO / OFF WHITE ')).toBe('Freijó/Off White');
    expect(findEquivalentAttributeValue(['Freijó', 'Preto'], 'Branco')).toBeUndefined();
  });

  it('transforma em vínculo quando a combinação de atributos já existe', () => {
    expect(resolveInboundVariationAction([{ id: 'freijo', attributes: [{ name: 'Cor', value: 'Freijó' }] }], { color: 'FREIJO' })).toBe('LINK_EXISTING_VARIATION');
  });

  it('não cria variação sem cor confirmada', () => {
    expect(resolveInboundVariationAction([], { color: null, doors: '4' })).toBe('REQUIRE_ATTRIBUTE_CONFIRMATION');
  });
});
