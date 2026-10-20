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
    expect(isRequiredCharacteristicName('Modelo')).toBe(true);
    expect(isRequiredCharacteristicName('Modelo/Linha')).toBe(true);
    expect(isRequiredCharacteristicName('Linha/Modelo')).toBe(true);
    expect(isRequiredCharacteristicName('Linha')).toBe(true);
    expect(isRequiredCharacteristicName('Comprimento total')).toBe(true);
    expect(isRequiredCharacteristicName('Comprimento')).toBe(true);
    expect(isRequiredCharacteristicName('Altura')).toBe(true);
    expect(isRequiredCharacteristicName('Largura')).toBe(true);
    expect(isRequiredCharacteristicName('Profundidade')).toBe(true);

    expect(isRequiredCharacteristicName('Acabamento')).toBe(false);
    expect(isRequiredCharacteristicName('Peso')).toBe(false);
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

  it('detecta dimensões obrigatórias ausentes considerando exclusividade Profundidade/Comprimento', () => {
    const missingAll = getMissingRequiredDimensions({});
    expect(missingAll).toContain('Altura total');
    expect(missingAll).toContain('Largura total');
    expect(missingAll).toContain('Profundidade total');

    const hasDepth = getMissingRequiredDimensions({ Altura: '100', Largura: '100', Profundidade: '50' });
    expect(hasDepth).not.toContain('Profundidade total');

    const hasLength = getMissingRequiredDimensions({ Altura: '100', Largura: '100', Comprimento: '200' });
    expect(hasLength).not.toContain('Profundidade total');
  });

  it('avalia lista de campos obrigatórios ausentes ignorando dependentes bloqueados', () => {
    const values: TechnicalValuesMap = {
      'Possui portas': 'Não',
    };
    const requiredList = ['Quantidade de portas', 'Cor'];
    const missing = getMissingRequiredTechnicalFields(requiredList, values);

    // Quantidade de portas é dependente de Possui portas=Sim; como está Não, fica desabilitado e não falta
    expect(missing).not.toContain('Quantidade de portas');
    expect(missing).toContain('Cor');
  });
});
