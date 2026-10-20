import { describe, it, expect } from 'vitest';
import {
  SINK_CATEGORY_ID,
  isSinkCategory,
  isStructureMaterialCharacteristic,
  isSinkMaterialCharacteristic,
  isConcretadaCharacteristic,
  isValveCharacteristic,
  isHasInoxBowlCharacteristic,
  isSinkMaterialInox,
  isSinkMaterialWithInoxBowlEligible,
  getCharacteristicDependencyState,
  getApplicableTechnicalFields,
  isYesNoCharacteristic,
  TechnicalFieldDefinition,
} from '../../technicalValuesService';
import { cleanupDependentCharacteristicsOnZero } from '../../../App/Products/components/tabs/technical/technicalSyncUtils';

describe('technicalValues - Regras de Categoria Pias, Materiais e Dependências', () => {
  it('identifica corretamente a categoria Pias por ID', () => {
    expect(isSinkCategory([SINK_CATEGORY_ID])).toBe(true);
    expect(isSinkCategory(['outra-categoria'])).toBe(false);
    expect(isSinkCategory([])).toBe(false);
  });

  it('identifica características de Material da pia, Material da estrutura e Concretada?', () => {
    expect(isSinkMaterialCharacteristic('Material da pia')).toBe(true);
    expect(isSinkMaterialCharacteristic('material da pia')).toBe(true);
    expect(isSinkMaterialCharacteristic('Material da estrutura')).toBe(false);

    expect(isStructureMaterialCharacteristic('Material da estrutura')).toBe(true);
    expect(isStructureMaterialCharacteristic('material da estrutura')).toBe(true);
    expect(isStructureMaterialCharacteristic('Material da pia')).toBe(false);

    expect(isConcretadaCharacteristic('Concretada?')).toBe(true);
    expect(isConcretadaCharacteristic('concretada?')).toBe(true);
    expect(isConcretadaCharacteristic('Concretada')).toBe(true);
    expect(isConcretadaCharacteristic('Material da pia')).toBe(false);
  });

  it('identifica características de Válvula e Possui cuba de inox?', () => {
    expect(isValveCharacteristic('Possui válvula?')).toBe(true);
    expect(isValveCharacteristic('possui válvula')).toBe(true);
    expect(isValveCharacteristic('Inclui válvula?')).toBe(true);
    expect(isValveCharacteristic('inclui válvula')).toBe(true);
    expect(isValveCharacteristic('Acompanha válvula')).toBe(true);
    expect(isValveCharacteristic('Material da pia')).toBe(false);

    expect(isHasInoxBowlCharacteristic('Possui cuba de inox?')).toBe(true);
    expect(isHasInoxBowlCharacteristic('possui cuba de inox?')).toBe(true);
    expect(isHasInoxBowlCharacteristic('Possui cuba inox')).toBe(true);
    expect(isHasInoxBowlCharacteristic('Cuba de inox')).toBe(true);
    expect(isHasInoxBowlCharacteristic('Material da pia')).toBe(false);
  });

  it('detecta se Material da pia é Inox', () => {
    expect(isSinkMaterialInox({ 'Material da pia': 'Inox' })).toBe(true);
    expect(isSinkMaterialInox({ 'Material da pia': 'inox' })).toBe(true);
    expect(isSinkMaterialInox({ 'Material da pia': 'Mármore Sintético (Marmorite)' })).toBe(false);
    expect(isSinkMaterialInox({ 'Material da pia': 'Granito' })).toBe(false);
    expect(isSinkMaterialInox({})).toBe(false);
  });

  it('gerencia dependência de Concretada? com base em Material da pia = Inox', () => {
    const depInox = getCharacteristicDependencyState('Concretada?', {
      'Material da pia': 'Inox',
    });
    expect(depInox.isDependent).toBe(true);
    expect(depInox.isDisabled).toBe(false);
    expect(depInox.masterFieldLabel).toBe('Material da pia');

    const depMarmore = getCharacteristicDependencyState('Concretada?', {
      'Material da pia': 'Mármore Sintético (Marmorite)',
    });
    expect(depMarmore.isDependent).toBe(true);
    expect(depMarmore.isDisabled).toBe(true);
    expect(depMarmore.disabledReason).toContain('Disponível apenas quando Material da pia for Inox');

    const depEmpty = getCharacteristicDependencyState('Concretada?', {});
    expect(depEmpty.isDependent).toBe(true);
    expect(depEmpty.isDisabled).toBe(true);
  });

  it('determina elegibilidade de cuba de inox com base em Material da pia (Mármore Sintético, Mármore, Granito)', () => {
    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'Mármore Sintético (Marmorite)' })).toBe(true);
    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'Mármore Sintético' })).toBe(true);
    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'Marmorite' })).toBe(true);
    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'Granito' })).toBe(true);
    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'granito' })).toBe(true);
    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'Mármore' })).toBe(true);
    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'marmore' })).toBe(true);

    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'Granito com cuba de inox' })).toBe(false);
    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'Inox' })).toBe(false);
    expect(isSinkMaterialWithInoxBowlEligible({ 'Material da pia': 'inox' })).toBe(false);
    expect(isSinkMaterialWithInoxBowlEligible({})).toBe(false);
  });

  it('gerencia dependência de Possui cuba de inox? (ativa em Mármore, Mármore Sintético ou Granito)', () => {
    const depMarmoreSint = getCharacteristicDependencyState('Possui cuba de inox?', {
      'Material da pia': 'Mármore Sintético (Marmorite)',
    });
    expect(depMarmoreSint.isDependent).toBe(true);
    expect(depMarmoreSint.isDisabled).toBe(false);
    expect(depMarmoreSint.masterFieldLabel).toBe('Material da pia');

    const depGranito = getCharacteristicDependencyState('Possui cuba de inox?', {
      'Material da pia': 'Granito',
    });
    expect(depGranito.isDependent).toBe(true);
    expect(depGranito.isDisabled).toBe(false);

    const depMarmore = getCharacteristicDependencyState('Possui cuba de inox?', {
      'Material da pia': 'Mármore',
    });
    expect(depMarmore.isDependent).toBe(true);
    expect(depMarmore.isDisabled).toBe(false);

    const depInox = getCharacteristicDependencyState('Possui cuba de inox?', {
      'Material da pia': 'Inox',
    });
    expect(depInox.isDependent).toBe(true);
    expect(depInox.isDisabled).toBe(true);
    expect(depInox.disabledReason).toContain('Disponível apenas quando Material da pia for Mármore Sintético, Mármore ou Granito');

    const depGranitoComCuba = getCharacteristicDependencyState('Possui cuba de inox?', {
      'Material da pia': 'Granito com cuba de inox',
    });
    expect(depGranitoComCuba.isDependent).toBe(true);
    expect(depGranitoComCuba.isDisabled).toBe(true);
  });

  it('limpa Concretada? quando Material da pia for alterado para valor diferente de Inox', () => {
    const initial = {
      'Material da pia': 'Inox',
      'Concretada?': 'Sim',
      Largura: '120',
    };

    const changedToGranito = cleanupDependentCharacteristicsOnZero(
      initial,
      'Material da pia',
      'Granito'
    );
    expect(changedToGranito['Concretada?']).toBe('');
    expect(changedToGranito.Largura).toBe('120');

    const changedToMarmore = cleanupDependentCharacteristicsOnZero(
      initial,
      'Material da pia',
      'Mármore Sintético (Marmorite)'
    );
    expect(changedToMarmore['Concretada?']).toBe('');

    const keepInox = cleanupDependentCharacteristicsOnZero(
      initial,
      'Material da pia',
      'Inox'
    );
    expect(keepInox['Concretada?']).toBe('Sim');
  });

  it('limpa Possui cuba de inox? quando Material da pia for alterado para Inox ou Granito com cuba de inox', () => {
    const initial = {
      'Material da pia': 'Mármore Sintético (Marmorite)',
      'Possui cuba de inox?': 'Sim',
      Largura: '120',
    };

    const changedToInox = cleanupDependentCharacteristicsOnZero(
      initial,
      'Material da pia',
      'Inox'
    );
    expect(changedToInox['Possui cuba de inox?']).toBe('');
    expect(changedToInox.Largura).toBe('120');

    const changedToGranitoComCuba = cleanupDependentCharacteristicsOnZero(
      initial,
      'Material da pia',
      'Granito com cuba de inox'
    );
    expect(changedToGranitoComCuba['Possui cuba de inox?']).toBe('');

    const keepGranito = cleanupDependentCharacteristicsOnZero(
      initial,
      'Material da pia',
      'Granito'
    );
    expect(keepGranito['Possui cuba de inox?']).toBe('Sim');
  });

  it('exclui estritamente Material da estrutura e inclui Material da pia para categoria Pias', () => {
    const allFields: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Material da estrutura', categoryIds: ['outra-cat'] },
      { id: '2', name: 'Material da pia', categoryIds: [SINK_CATEGORY_ID], isRequired: true },
      { id: '3', name: 'Possui válvula?', categoryIds: [SINK_CATEGORY_ID], isRequired: true },
      { id: '4', name: 'Concretada?', categoryIds: [SINK_CATEGORY_ID], isRequired: false },
      { id: '5', name: 'Possui cuba de inox?', categoryIds: [SINK_CATEGORY_ID], isRequired: false },
    ];

    const sinkFields = getApplicableTechnicalFields(allFields, [SINK_CATEGORY_ID]);
    const sinkNames = sinkFields.map((f) => f.name);
    expect(sinkNames).toContain('Material da pia');
    expect(sinkNames).toContain('Possui válvula?');
    expect(sinkNames).toContain('Concretada?');
    expect(sinkNames).toContain('Possui cuba de inox?');
    expect(sinkNames).not.toContain('Material da estrutura');

    const otherFields = getApplicableTechnicalFields(allFields, ['outra-cat']);
    const otherNames = otherFields.map((f) => f.name);
    expect(otherNames).toContain('Material da estrutura');
    expect(otherNames).not.toContain('Material da pia');
    expect(otherNames).not.toContain('Concretada?');
    expect(otherNames).not.toContain('Possui cuba de inox?');
  });

  it('identifica Possui válvula? e Concretada? como características de escolha binária Sim/Não', () => {
    expect(
      isYesNoCharacteristic({
        id: 'v1',
        name: 'Possui válvula?',
        options: [{ value: 'Sim' }, { value: 'Não' }],
      })
    ).toBe(true);

    expect(
      isYesNoCharacteristic({
        id: 'c1',
        name: 'Concretada?',
        options: [{ value: 'Sim' }, { value: 'Não' }],
      })
    ).toBe(true);
  });
});
