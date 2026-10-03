import { describe, it, expect } from 'vitest';
import {
  getEffectiveTechnicalValue,
  hasVariationOverride,
  removeVariationOverride,
  setVariationOverride,
  areEffectiveValuesEqual,
  hasEffectiveDifferenceFromParent,
  computeEffectiveVariationName,
  getApplicableTechnicalFields,
  getAvailableAdditionalFields,
  getMissingRequiredTechnicalFields,
  groupCharacteristicsByTopic,
  getCharacteristicSubtitle,
  TechnicalFieldDefinition,
  TechnicalValuesMap,
} from '../technicalValuesService';

describe('technicalValuesService', () => {
  it('mantém personalizadas em características adicionais e não cria tópico removido', () => {
    const groups = groupCharacteristicsByTopic([
      { name: 'Altura', isCustom: false },
      { name: 'Acabamento especial', isCustom: true },
    ]);
    expect(groups.map((group) => group.title)).toEqual([
      'Dimensões e peso',
      'Outras características',
    ]);
    expect(groups[1].fields[0].name).toBe('Acabamento especial');
  });
  it('exige valor somente nas especificações globais obrigatórias', () => {
    const missing = getMissingRequiredTechnicalFields(['Cor', 'Estrutura'], {
      Cor: 'Branco',
      Estrutura: '',
      Observação: '',
    });

    expect(missing).toEqual(['Estrutura']);
  });

  it('herda valor padrão do produto pai quando não há override', () => {
    const parent = { Cor: 'Branco', Portas: 6 };
    const variation = {};

    expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Branco');
    expect(getEffectiveTechnicalValue(parent, variation, 'Portas')).toBe(6);
  });

  it('aplica override da variação quando definido', () => {
    const parent = { Cor: 'Branco', Portas: 6 };
    const variation = { Cor: 'Nature' };

    expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Nature');
    expect(getEffectiveTechnicalValue(parent, variation, 'Portas')).toBe(6);
  });

  it('respeita valor 0 sem confundir com ausência de valor', () => {
    const parent = { Portas: 6, Gavetas: 2 };
    const variation = { Gavetas: 0 };

    expect(getEffectiveTechnicalValue(parent, variation, 'Gavetas')).toBe(0);
  });

  it('respeita valor false sem confundir com ausência de valor', () => {
    const parent = { 'Possui Espelho': true };
    const variation = { 'Possui Espelho': false };

    expect(getEffectiveTechnicalValue(parent, variation, 'Possui Espelho')).toBe(false);
  });

  it('remove override e volta a herdar o valor do pai', () => {
    const parent = { Cor: 'Branco' };
    let variation: TechnicalValuesMap = { Cor: 'Nature' };

    expect(hasVariationOverride(variation, 'Cor')).toBe(true);
    expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Nature');

    variation = removeVariationOverride(variation, 'Cor');
    expect(hasVariationOverride(variation, 'Cor')).toBe(false);
    expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Branco');
  });

  it('detecta se a variação tem diferença real em relação ao pai', () => {
    const fields: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Cor', dataType: 'list', options: [] },
      { id: '2', name: 'Portas', dataType: 'integer', options: [] },
    ];
    const parent = { Cor: 'Branco', Portas: 6 };

    // Mesmos valores efetivos, ainda que possua override falso
    const variationEqual = { Cor: 'Branco', Portas: 6 };
    expect(hasEffectiveDifferenceFromParent(fields, parent, variationEqual)).toBe(false);

    // Valor diferente
    const variationDiff = { Cor: 'Nature', Portas: 6 };
    expect(hasEffectiveDifferenceFromParent(fields, parent, variationDiff)).toBe(true);
  });

  it('gera nome automático da variação respeitando formatação e ordem', () => {
    const fields: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Cor', dataType: 'list', nameOrder: 10, options: [] },
      { id: '2', name: 'Portas', dataType: 'integer', unit: 'Portas', nameOrder: 20, options: [] },
      {
        id: '3',
        name: 'Gavetas',
        dataType: 'integer',
        unit: 'Gavetas',
        nameOrder: 30,
        options: [],
      },
      { id: '4', name: 'Espelho', dataType: 'boolean', nameOrder: 40, options: [] },
      { id: '5', name: 'Material', dataType: 'list', includeInName: false, options: [] },
    ];

    const effectiveValues = {
      Cor: 'Nature',
      Portas: 6,
      Gavetas: 2,
      Espelho: true,
      Material: 'MDF',
    };

    const generatedName = computeEffectiveVariationName(
      'Guarda-Roupa Madrid',
      fields,
      effectiveValues
    );
    expect(generatedName).toBe('Guarda-Roupa Madrid Nature 6 Portas 2 Gavetas Com Espelho');
  });

  describe('getApplicableTechnicalFields & getAvailableAdditionalFields', () => {
    const catMesas = 'cat-mesas-uuid';
    const catGuardaRoupas = 'cat-guardaroupas-uuid';

    const mockAllFields: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Cor', dataType: 'list', categoryIds: [], options: [] }, // Global
      { id: '2', name: 'Material', dataType: 'list', categoryIds: [], options: [] }, // Global
      {
        id: '3',
        name: 'Quantidade de portas',
        dataType: 'integer',
        categoryIds: [catGuardaRoupas],
        options: [],
      }, // Específico Guarda-Roupa
      {
        id: '4',
        name: 'Quantidade de gavetas',
        dataType: 'integer',
        categoryIds: [catGuardaRoupas],
        options: [],
      }, // Específico Guarda-Roupa
      { id: '5', name: 'Formato', dataType: 'list', categoryIds: [catMesas], options: [] }, // Específico Mesa
    ];

    it('inclui apenas campos configurados para a categoria do produto', () => {
      const applicable = getApplicableTechnicalFields(mockAllFields, [catMesas], {}, []);
      const names = applicable.map((f) => f.name);

      expect(names).toEqual(['Formato']);
      expect(names).not.toContain('Cor');
      expect(names).not.toContain('Material');
      expect(names).not.toContain('Quantidade de portas');
      expect(names).not.toContain('Quantidade de gavetas');
    });

    it('inclui especificação obrigatória global mesmo sem categoria', () => {
      const applicable = getApplicableTechnicalFields(
        [
          { id: 'material', name: 'Material', dataType: 'list', isRequired: true, options: [] },
          { id: 'porta', name: 'Tipo de Porta', dataType: 'list', options: [] },
        ],
        [],
        {},
        []
      );

      expect(applicable.map((field) => field.name)).toEqual(['Material']);
    });

    it('permite adicionar manualmente campos que não são da categoria', () => {
      const applicable = getApplicableTechnicalFields(
        mockAllFields,
        [catMesas],
        {},
        ['Quantidade de portas'] // Adicionado manualmente
      );
      const names = applicable.map((f) => f.name);

      expect(names).toContain('Quantidade de portas');
      expect(names).toContain('Formato');
    });

    it('preserva campos que já possuem valores preenchidos mesmo se a categoria mudar', () => {
      // Produto originalmente tinha valor em Quantidade de portas, e agora está na categoria Mesas
      const applicable = getApplicableTechnicalFields(
        mockAllFields,
        [catMesas],
        { 'Quantidade de portas': '2' },
        []
      );
      const names = applicable.map((f) => f.name);

      expect(names).toContain('Quantidade de portas');
      expect(names).toContain('Formato');
    });

    it('retorna apenas os campos centrais ainda não presentes como opções adicionais', () => {
      const currentVisible = [
        mockAllFields[0], // Cor
        mockAllFields[1], // Material
        mockAllFields[4], // Formato
      ];

      const available = getAvailableAdditionalFields(mockAllFields, currentVisible);
      const availableNames = available.map((f) => f.name);

      expect(availableNames).toEqual(['Quantidade de portas', 'Quantidade de gavetas']);
    });

    it('agrupa corretamente novas características nos tópicos apropriados', () => {
      const groups = groupCharacteristicsByTopic([
        { name: 'Marca', isCustom: false },
        { name: 'Linha', isCustom: false },
        { name: 'Possui espelho', isCustom: false },
        { name: 'Quantidade de espelhos', isCustom: false },
        { name: 'Comprimento do espelho', isCustom: false },
        { name: 'Peso suportado por prateleira', isCustom: false },
        { name: 'Material das prateleiras', isCustom: false },
        { name: 'Pés reguláveis', isCustom: false },
        { name: 'Tipo/material da corrediça', isCustom: false },
        { name: 'Quantidade de nichos', isCustom: false },
        { name: 'Polegadas suportadas', isCustom: false },
        { name: 'Passa fios', isCustom: false },
        { name: 'Possui LED', isCustom: false },
      ]);

      const titles = groups.map((g) => g.title);
      expect(titles).toContain('Identificação e modelo');
      expect(titles).toContain('Funcionalidades');
      expect(titles).toContain('Dimensões e peso');
      expect(titles).toContain('Estrutura');
      expect(titles).toContain('Acessórios');
    });

    it('agrupa corretamente características de sala de jantar e sofás nos tópicos apropriados', () => {
      const groups = groupCharacteristicsByTopic([
        { name: 'Cadeira estofada', isCustom: false },
        { name: 'Material da cadeira', isCustom: false },
        { name: 'Material do assento', isCustom: false },
        { name: 'Material do encosto', isCustom: false },
        { name: 'Densidade do assento', isCustom: false },
        { name: 'Altura da cadeira', isCustom: false },
        { name: 'Largura da cadeira', isCustom: false },
        { name: 'Profundidade da cadeira', isCustom: false },
        { name: 'Altura do assento ao chão', isCustom: false },
        { name: 'Peso suportado por cadeira', isCustom: false },
        { name: 'Quantidade de lugares', isCustom: false },
        { name: 'Tipo de sofá', isCustom: false },
        { name: 'Retrátil', isCustom: false },
        { name: 'Reclinável', isCustom: false },
        { name: 'Quantidade de posições do reclinável', isCustom: false },
        { name: 'Tipo de mola', isCustom: false },
        { name: 'Pillow top', isCustom: false },
        { name: 'Almofadas', isCustom: false },
        { name: 'Material das almofadas', isCustom: false },
        { name: 'Entrada USB', isCustom: false },
        { name: 'Quantidade de entradas USB', isCustom: false },
        { name: 'Profundidade fechado', isCustom: false },
        { name: 'Profundidade aberto', isCustom: false },
      ]);

      const titles = groups.map((g) => g.title);
      expect(titles).toContain('Dimensões e peso');
      expect(titles).toContain('Tecido e revestimento');
      expect(titles).toContain('Estrutura');
      expect(titles).toContain('Funcionalidades');

      // Verificar que campos específicos caíram no tópico esperado
      const dimGroup = groups.find((g) => g.title === 'Dimensões e peso');
      const dimNames = (dimGroup?.fields || []).map((f) => f.name);
      expect(dimNames).toContain('Altura da cadeira');
      expect(dimNames).toContain('Altura do assento ao chão');
      expect(dimNames).toContain('Profundidade fechado');
      expect(dimNames).toContain('Profundidade aberto');

      const funcGroup = groups.find((g) => g.title === 'Funcionalidades');
      const funcNames = (funcGroup?.fields || []).map((f) => f.name);
      expect(funcNames).toContain('Retrátil');
      expect(funcNames).toContain('Reclinável');
      expect(funcNames).toContain('Entrada USB');
      expect(funcNames).toContain('Pillow top');

      const estGroup = groups.find((g) => g.title === 'Estrutura');
      const estNames = (estGroup?.fields || []).map((f) => f.name);
      expect(estNames).toContain('Tipo de sofá');
      expect(estNames).toContain('Tipo de mola');
      expect(estNames).toContain('Quantidade de lugares');
      expect(estNames).toContain('Material da cadeira');

      const tecGroup = groups.find((g) => g.title === 'Tecido e revestimento');
      const tecNames = (tecGroup?.fields || []).map((f) => f.name);
      expect(tecNames).toContain('Cadeira estofada');
      expect(tecNames).toContain('Material do assento');
      expect(tecNames).toContain('Material do encosto');
      expect(tecNames).toContain('Densidade do assento');
      expect(tecNames).toContain('Almofadas');
    });

    it('agrupa corretamente características de colchões nos tópicos apropriados', () => {
      const groups = groupCharacteristicsByTopic([
        { name: 'Tamanho do colchão', isCustom: false },
        { name: 'Firmeza', isCustom: false },
        { name: 'Dupla face', isCustom: false },
        { name: 'Revestimento', isCustom: false },
        { name: 'Peso suportado', isCustom: false },
        { name: 'Pillow top', isCustom: false },
        { name: 'Tipo de mola', isCustom: false },
      ]);

      const dimGroup = groups.find((g) => g.title === 'Dimensões e peso');
      const dimNames = (dimGroup?.fields || []).map((f) => f.name);
      expect(dimNames).toContain('Tamanho do colchão');
      expect(dimNames).toContain('Peso suportado');

      const funcGroup = groups.find((g) => g.title === 'Funcionalidades');
      const funcNames = (funcGroup?.fields || []).map((f) => f.name);
      expect(funcNames).toContain('Firmeza');
      expect(funcNames).toContain('Dupla face');
      expect(funcNames).toContain('Pillow top');

      const tecGroup = groups.find((g) => g.title === 'Tecido e revestimento');
      const tecNames = (tecGroup?.fields || []).map((f) => f.name);
      expect(tecNames).toContain('Revestimento');

      const estGroup = groups.find((g) => g.title === 'Estrutura');
      const estNames = (estGroup?.fields || []).map((f) => f.name);
      expect(estNames).toContain('Tipo de mola');
    });

    it('agrupa corretamente características de berços nos tópicos apropriados', () => {
      const groups = groupCharacteristicsByTopic([
        { name: 'Berço 3 em 1', isCustom: false },
        { name: 'Vira mini cama', isCustom: false },
        { name: 'Padrão do berço', isCustom: false },
        { name: 'Comprimento do colchão recomendado', isCustom: false },
        { name: 'Largura do colchão recomendado', isCustom: false },
        { name: 'Tamanho recomendado do colchão', isCustom: false },
        { name: 'Estrado regulável', isCustom: false },
        { name: 'Grades fixas', isCustom: false },
        { name: 'Tipo de grade', isCustom: false },
        { name: 'Acompanha colchão', isCustom: false },
        { name: 'Slow motion / Fechamento suave', isCustom: false },
      ]);

      const dimGroup = groups.find((g) => g.title === 'Dimensões e peso');
      const dimNames = (dimGroup?.fields || []).map((f) => f.name);
      expect(dimNames).toContain('Padrão do berço');
      expect(dimNames).toContain('Comprimento do colchão recomendado');
      expect(dimNames).toContain('Largura do colchão recomendado');
      expect(dimNames).toContain('Tamanho recomendado do colchão');

      const funcGroup = groups.find((g) => g.title === 'Funcionalidades');
      const funcNames = (funcGroup?.fields || []).map((f) => f.name);
      expect(funcNames).toContain('Berço 3 em 1');
      expect(funcNames).toContain('Vira mini cama');
      expect(funcNames).toContain('Acompanha colchão');
      expect(funcNames).toContain('Slow motion / Fechamento suave');

      const estGroup = groups.find((g) => g.title === 'Estrutura');
      const estNames = (estGroup?.fields || []).map((f) => f.name);
      expect(estNames).toContain('Estrado regulável');
      expect(estNames).toContain('Grades fixas');
      expect(estNames).toContain('Tipo de grade');
    });

    it('agrupa corretamente características complementares de móveis nos tópicos apropriados', () => {
      const groups = groupCharacteristicsByTopic([
        { name: 'Formato', isCustom: false },
        { name: 'Quantidade de cubas', isCustom: false },
        { name: 'Posição da cuba', isCustom: false },
        { name: 'Quantidade de bocas', isCustom: false },
        { name: 'Acompanha pia / cuba', isCustom: false },
        { name: 'Acompanha tampo', isCustom: false },
        { name: 'Acompanha válvula', isCustom: false },
        { name: 'Acompanha sifão', isCustom: false },
      ]);

      const estGroup = groups.find((g) => g.title === 'Estrutura');
      const estNames = (estGroup?.fields || []).map((f) => f.name);
      expect(estNames).toContain('Formato');
      expect(estNames).toContain('Quantidade de cubas');
      expect(estNames).toContain('Posição da cuba');
      expect(estNames).toContain('Quantidade de bocas');

      const funcGroup = groups.find((g) => g.title === 'Funcionalidades');
      const funcNames = (funcGroup?.fields || []).map((f) => f.name);
      expect(funcNames).toContain('Acompanha pia / cuba');
      expect(funcNames).toContain('Acompanha tampo');
      expect(funcNames).toContain('Acompanha válvula');
      expect(funcNames).toContain('Acompanha sifão');
    });

    it('agrupa canto arredondado e superfície de vidro nos tópicos adequados', () => {
      const groups = groupCharacteristicsByTopic([
        { name: 'Canto arredondado', isCustom: false },
        { name: 'Superfície de vidro', isCustom: false },
        { name: 'Material das gavetas', isCustom: false },
      ]);

      const estGroup = groups.find((g) => g.title === 'Estrutura');
      const estNames = (estGroup?.fields || []).map((f) => f.name);
      expect(estNames).toContain('Canto arredondado');

      const matGroup = groups.find((g) => g.title === 'Materiais e acabamento');
      const matNames = (matGroup?.fields || []).map((f) => f.name);
      expect(matNames).toContain('Superfície de vidro');
      expect(matNames).toContain('Material das gavetas');
    });
  });

  describe('getCharacteristicSubtitle', () => {
    it('retorna a explicação do corpo do móvel para Material da estrutura', () => {
      const subtitle = getCharacteristicSubtitle('Material da estrutura');
      expect(subtitle).toBeDefined();
      expect(subtitle).toContain('laterais');
      expect(subtitle).toContain('divisórias');
      expect(subtitle).toContain('tampo');
    });

    it('retorna subtítulo explicativo para portas, gavetas e prateleiras', () => {
      expect(getCharacteristicSubtitle('Material das portas')).toBe('Portas frontais ou de correr');
      expect(getCharacteristicSubtitle('Material das gavetas')).toBe('Frentes e corpo das gavetas');
      expect(getCharacteristicSubtitle('Material das prateleiras')).toBe('Prateleiras internas e removíveis');
      expect(getCharacteristicSubtitle('Material do fundo')).toBe('Painel traseiro de sustentação e fechamento');
    });

    it('retorna undefined para características sem subtítulo específico', () => {
      expect(getCharacteristicSubtitle('Cor')).toBeUndefined();
      expect(getCharacteristicSubtitle('Largura')).toBeUndefined();
    });
  });
});
