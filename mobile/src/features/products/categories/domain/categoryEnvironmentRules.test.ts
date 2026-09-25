import { describe, expect, it } from 'vitest';
import { CategoryNode, EnvironmentNode } from '../types/mobileCategory.types';
import {
  filterCategories,
  filterEnvironments,
  validateNodeName,
  canDeleteEnvironment,
  canDeleteCategory,
  toggleNodeLink,
  toggleCategoryAttribute,
  getOrphanCategories,
  unlinkCategoryFromEnvironment,
  validateAttribute,
  validateAttributeOption,
  AttributeRef,
} from './categoryEnvironmentRules';

describe('Roteiro 1: Regras de Domínio e Validação - Categorias, Ambientes e Características', () => {
  const mockCategories: CategoryNode[] = [
    { id: 'cat-1', name: 'SOFÁ', parents: ['env-1'], productCount: 5 },
    { id: 'cat-2', name: 'MESA DE JANTAR', parents: ['env-1', 'env-2'], productCount: 0 },
    { id: 'cat-3', name: 'POLTRONA ÓRFÃ', parents: [], productCount: 2 },
    { id: 'cat-4', name: 'RACK TV', parents: undefined, productCount: 0 },
  ];

  const mockEnvironments: EnvironmentNode[] = [
    { id: 'env-1', name: 'SALA DE ESTAR', categories: ['cat-1', 'cat-2'] },
    { id: 'env-2', name: 'SALA DE JANTAR', categories: ['cat-2'] },
    { id: 'env-3', name: 'VARANDA GOURMET', categories: [] },
  ];

  describe('1. Filtragem e Busca de Categorias e Ambientes', () => {
    it('filtra corretamente categorias com ambiente, sem ambiente (órfãs) e todas', () => {
      const todas = filterCategories(mockCategories, 'todas', '');
      expect(todas).toHaveLength(4);

      const comAmbiente = filterCategories(mockCategories, 'com_ambiente', '');
      expect(comAmbiente).toHaveLength(2);
      expect(comAmbiente.map(c => c.name)).toEqual(['SOFÁ', 'MESA DE JANTAR']);

      const semAmbiente = filterCategories(mockCategories, 'sem_ambiente', '');
      expect(semAmbiente).toHaveLength(2);
      expect(semAmbiente.map(c => c.name)).toEqual(['POLTRONA ÓRFÃ', 'RACK TV']);
    });

    it('aplica busca textual por nome de categoria (case-insensitive com trim)', () => {
      const busca = filterCategories(mockCategories, 'todas', '  Mesa  ');
      expect(busca).toHaveLength(1);
      expect(busca[0].name).toBe('MESA DE JANTAR');

      const buscaSemMatch = filterCategories(mockCategories, 'todas', 'inexistente');
      expect(buscaSemMatch).toHaveLength(0);
    });

    it('filtra ambientes por busca textual', () => {
      const todos = filterEnvironments(mockEnvironments, '');
      expect(todos).toHaveLength(3);

      const filtrados = filterEnvironments(mockEnvironments, 'jantar');
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].name).toBe('SALA DE JANTAR');
    });

    it('calcula categorias órfãs corretamente', () => {
      const orfas = getOrphanCategories(mockCategories);
      expect(orfas).toHaveLength(2);
      expect(orfas.map(c => c.id)).toEqual(['cat-3', 'cat-4']);
    });
  });

  describe('2. Validação e Normalização de Nomes (Categorias e Ambientes)', () => {
    it('rejeita nome vazio ou contendo apenas espaços em branco', () => {
      const vazio = validateNodeName('', mockCategories, undefined, 'Categoria');
      expect(vazio.valid).toBe(false);
      expect(vazio.error).toContain('não pode estar vazio');

      const espacos = validateNodeName('    ', mockEnvironments, undefined, 'Ambiente');
      expect(espacos.valid).toBe(false);
      expect(espacos.error).toContain('não pode estar vazio');
    });

    it('formata o nome para maiúsculas (UPPERCASE) e remove espaços nas pontas', () => {
      const res = validateNodeName('  guarda roupa planejado  ', mockCategories, undefined, 'Categoria');
      expect(res.valid).toBe(true);
      expect(res.formattedName).toBe('GUARDA ROUPA PLANEJADO');
    });

    it('bloqueia duplicidade de nome contra outros registros existentes', () => {
      const dup = validateNodeName('Sofá', mockCategories, undefined, 'Categoria');
      expect(dup.valid).toBe(false);
      expect(dup.error).toContain('Já existe uma Categoria com o nome "SOFÁ"');

      const dupEnv = validateNodeName('sala de jantar', mockEnvironments, undefined, 'Ambiente');
      expect(dupEnv.valid).toBe(false);
      expect(dupEnv.error).toContain('Já existe um Ambiente com o nome "SALA DE JANTAR"');
    });

    it('permite salvar ao editar o próprio registro com o mesmo nome', () => {
      const selfEdit = validateNodeName('SOFÁ', mockCategories, 'cat-1', 'Categoria');
      expect(selfEdit.valid).toBe(true);
      expect(selfEdit.formattedName).toBe('SOFÁ');
    });
  });

  describe('3. Regras de Exclusão e Desvinculação', () => {
    it('bloqueia exclusão de ambiente se possuir categorias vinculadas', () => {
      const res = canDeleteEnvironment(mockEnvironments[0], mockCategories);
      expect(res.canDelete).toBe(false);
      expect(res.reason).toContain('possui 2 categoria(s) vinculada(s)');
    });

    it('permite exclusão de ambiente vazio', () => {
      const res = canDeleteEnvironment(mockEnvironments[2], mockCategories);
      expect(res.canDelete).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('bloqueia exclusão de categoria com produtos vinculados', () => {
      const res = canDeleteCategory(mockCategories[0]);
      expect(res.canDelete).toBe(false);
      expect(res.reason).toContain('utilizada por 5 produto(s)');
    });

    it('permite exclusão de categoria com zero produtos vinculados', () => {
      const res = canDeleteCategory(mockCategories[1]);
      expect(res.canDelete).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('desvincula categoria de um ambiente preservando outros vínculos', () => {
      const catComDoisAmbientes = mockCategories[1]; // parents: ['env-1', 'env-2']
      const atualizada = unlinkCategoryFromEnvironment(catComDoisAmbientes, 'env-1');
      expect(atualizada.parents).toEqual(['env-2']);
      expect(getOrphanCategories([atualizada])).toHaveLength(0);

      // Desvincula do último ambiente -> torna-se órfã
      const agoraOrfa = unlinkCategoryFromEnvironment(atualizada, 'env-2');
      expect(agoraOrfa.parents).toEqual([]);
      expect(getOrphanCategories([agoraOrfa])).toHaveLength(1);
    });
  });

  describe('4. Gestão de Vínculos e Características da Categoria', () => {
    it('adiciona e remove ID em lista de links (toggleNodeLink)', () => {
      let links: string[] = ['env-1'];
      links = toggleNodeLink(links, 'env-2');
      expect(links).toEqual(['env-1', 'env-2']);

      links = toggleNodeLink(links, 'env-1');
      expect(links).toEqual(['env-2']);
    });

    it('adiciona e remove características da categoria (toggleCategoryAttribute)', () => {
      const attrCor: AttributeRef = { id: 'attr-1', name: 'COR' };
      const attrTecido: AttributeRef = { id: 'attr-2', name: 'TECIDO' };

      let selecionados: AttributeRef[] = [attrCor];

      // Adiciona nova característica
      selecionados = toggleCategoryAttribute(selecionados, attrTecido);
      expect(selecionados).toHaveLength(2);
      expect(selecionados.map(a => a.name)).toEqual(['COR', 'TECIDO']);

      // Remove característica ao marcar novamente
      selecionados = toggleCategoryAttribute(selecionados, attrCor);
      expect(selecionados).toHaveLength(1);
      expect(selecionados[0].id).toBe('attr-2');
    });
  });

  describe('5. Menu de Atributos e Características Globais', () => {
    const mockAttributes = [
      { id: 'a1', name: 'Cor' },
      { id: 'a2', name: 'Material' },
      { id: 'a3', name: 'Tamanho' },
    ];

    it('valida criação de característica com tipos de dados suportados', () => {
      const valido = validateAttribute('Voltagem', mockAttributes, undefined, 'radio');
      expect(valido.valid).toBe(true);
      expect(valido.formattedName).toBe('Voltagem');

      const tipoInvalido = validateAttribute('Peso', mockAttributes, undefined, 'invalid_type');
      expect(tipoInvalido.valid).toBe(false);
      expect(tipoInvalido.error).toContain('Tipo de dado inválido');
    });

    it('bloqueia característica duplicada e permite edição mantendo o próprio nome', () => {
      const dup = validateAttribute('cor', mockAttributes);
      expect(dup.valid).toBe(false);
      expect(dup.error).toContain('Já existe uma característica com o nome "cor"');

      const selfEdit = validateAttribute('Cor', mockAttributes, 'a1');
      expect(selfEdit.valid).toBe(true);
    });

    it('valida opções de característica impedindo valores vazios ou duplicados', () => {
      const opcoesExistentes = [
        { id: 'o1', value: 'Azul' },
        { id: 'o2', value: 'Vermelho' },
      ];

      const vazia = validateAttributeOption('   ', opcoesExistentes);
      expect(vazia.valid).toBe(false);
      expect(vazia.error).toContain('não pode estar vazio');

      const dup = validateAttributeOption('azul', opcoesExistentes);
      expect(dup.valid).toBe(false);
      expect(dup.error).toContain('já está cadastrado nesta característica');

      const valida = validateAttributeOption('Verde', opcoesExistentes);
      expect(valida.valid).toBe(true);
      expect(valida.formattedName).toBe('Verde');
    });
  });
});
