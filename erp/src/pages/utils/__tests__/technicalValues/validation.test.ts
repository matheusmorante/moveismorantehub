import { describe, it, expect } from 'vitest';
import {
  isRequiredCharacteristicName,
  getMissingRequiredCharacteristics,
  getMissingRequiredDimensions,
  getMissingRequiredTechnicalFields,
  TechnicalValuesMap,
} from '../../technicalValuesService';

describe('technicalValues - Validação de Campos Obrigatórios', () => {
  it('identifica características obrigatórias canônicas e flexibilizações de modelo/linha', () => {
    expect(isRequiredCharacteristicName('Cor')).toBe(true);
    expect(isRequiredCharacteristicName('Modelo')).toBe(false);
    expect(isRequiredCharacteristicName('Modelo/Linha')).toBe(false);
    expect(isRequiredCharacteristicName('Linha/Modelo')).toBe(false);
    expect(isRequiredCharacteristicName('Linha')).toBe(false);
    expect(isRequiredCharacteristicName('Marca')).toBe(false);
    expect(isRequiredCharacteristicName('Comprimento total')).toBe(true);
    expect(isRequiredCharacteristicName('Comprimento')).toBe(true);
    expect(isRequiredCharacteristicName('Altura')).toBe(true);
    expect(isRequiredCharacteristicName('Largura')).toBe(true);
    expect(isRequiredCharacteristicName('Profundidade')).toBe(true);
    expect(isRequiredCharacteristicName('Peso')).toBe(false);

    expect(isRequiredCharacteristicName('Acabamento')).toBe(false);
  });

  it('detecta características obrigatórias ausentes respeitando preenchimento de Modelo ou Linha', () => {
    const missingBoth = getMissingRequiredCharacteristics({});
    expect(missingBoth).toContain('Cor');
    expect(missingBoth).toContain('Modelo');
    expect(missingBoth).toContain('Marca');

    const hasLinha = getMissingRequiredCharacteristics({ Linha: 'Pratic', Cor: 'Branco', Marca: 'Morante' });
    expect(hasLinha).not.toContain('Modelo');

    const hasModelo = getMissingRequiredCharacteristics({ Modelo: 'Soft', Cor: 'Branco', Marca: 'Morante' });
    expect(hasModelo).not.toContain('Modelo');

    const hasModeloLinha = getMissingRequiredCharacteristics({ 'Modelo/Linha': 'Soft Pratic', Cor: 'Branco', Marca: 'Morante' });
    expect(hasModeloLinha).not.toContain('Modelo');
  });

  it('valida Profundidade independentemente de Comprimento', () => {
    const missingAll = getMissingRequiredDimensions({});
    expect(missingAll).toContain('Altura total');
    expect(missingAll).toContain('Largura total');
    expect(missingAll).toContain('Profundidade total');

    const hasDepth = getMissingRequiredDimensions({ Altura: '100', Largura: '100', Profundidade: '50' });
    expect(hasDepth).not.toContain('Profundidade total');

    const hasLength = getMissingRequiredDimensions({ Altura: '100', Largura: '100', Comprimento: '200' });
    expect(hasLength).toContain('Profundidade total');
  });

  it('não exige Quantidade de portas, mesmo quando a configuração antiga a marca como obrigatória', () => {
    const noQuantity: TechnicalValuesMap = {
      'Possui portas': 'Não',
    };
    const requiredList = ['Quantidade de portas', 'Cor'];
    const missing = getMissingRequiredTechnicalFields(requiredList, noQuantity);

    expect(missing).toContain('Cor');
    expect(missing).not.toContain('Quantidade de portas');

    const zeroQuantity = getMissingRequiredTechnicalFields(requiredList, {
      'Quantidade de portas': 0,
      Cor: 'Branco',
    });
    expect(zeroQuantity).toEqual([]);

    expect(getMissingRequiredTechnicalFields(['Quantidade de gavetas'], {
      'Quantidade de gavetas': 0,
    })).toEqual([]);
    expect(getMissingRequiredTechnicalFields(['Quantidade de portas'], {
      'Quantidade de portas': '-1',
    })).not.toContain('Quantidade de portas');
  });

  it('exige material dependente apenas quando a quantidade de portas for maior que zero', () => {
    const requiredList = ['Quantidade de portas', 'Material das portas'];

    expect(
      getMissingRequiredTechnicalFields(requiredList, {
        'Quantidade de portas': 0,
        'Material das portas': '',
      })
    ).toEqual([]);

    expect(
      getMissingRequiredTechnicalFields(requiredList, {
        'Quantidade de portas': 2,
        'Material das portas': '',
      })
    ).toContain('Material das portas');
  });
});
