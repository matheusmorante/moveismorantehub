import { describe, it, expect } from 'vitest';
import {
  CANONICAL_CFOPS,
  getCfopDefinition,
  isCfopValid,
  isCfopActive,
  isCfopApplicableToModel,
  validateItemCfopMatch,
  determineSaleCfop,
  listActiveCfopOptions,
  CFOP_CATALOG_BASE,
  CFOP_SEMANTICS,
} from '../../../../../../shared-utils/fiscal-cfop-model';

describe('Modelo Modular de CFOP Fiscal (fiscal-cfop-model)', () => {
  describe('Integridade de Dados e Catálogo Base (data/ & catalog.ts)', () => {
    it('garante que todos os CFOPs da base possuem classificação semântica correspondente', () => {
      expect(CFOP_CATALOG_BASE.length).toBeGreaterThan(0);
      expect(CFOP_CATALOG_BASE.length).toBe(Object.keys(CFOP_SEMANTICS).length);
    });

    it('não possui códigos de CFOP duplicados no catálogo', () => {
      const codes = CFOP_CATALOG_BASE.map((item) => item.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('monta a lista canônica CANONICAL_CFOPS com metadados semânticos completos', () => {
      expect(CANONICAL_CFOPS.length).toBe(CFOP_CATALOG_BASE.length);
      for (const item of CANONICAL_CFOPS) {
        expect(item.code).toBeDefined();
        expect(item.direction).toBeDefined();
        expect(item.scope).toBeDefined();
        expect(item.operationType).toBeDefined();
        expect(item.merchandiseOrigin).toBeDefined();
        expect(item.allowedModels.length).toBeGreaterThan(0);
      }
    });

    it('getCfopDefinition recupera corretamente com código numérico ou formatado', () => {
      const def5102 = getCfopDefinition('5102');
      expect(def5102).toBeDefined();
      expect(def5102?.code).toBe('5102');
      expect(def5102?.operationType).toBe('sale');
      expect(def5102?.scope).toBe('internal');

      // Formatação com caracteres não numéricos
      expect(getCfopDefinition('5.102')?.code).toBe('5102');

      // CFOP inexistente ou nulo
      expect(getCfopDefinition('9999')).toBeUndefined();
      expect(getCfopDefinition(null)).toBeUndefined();
      expect(getCfopDefinition(undefined)).toBeUndefined();
    });

    it('isCfopValid e isCfopActive verificam status de catálogo', () => {
      expect(isCfopValid('5102')).toBe(true);
      expect(isCfopValid('9999')).toBe(false);
      expect(isCfopActive('5102')).toBe(true);
      expect(isCfopActive('9999')).toBe(false);
    });

    it('isCfopApplicableToModel valida compatibilidade com modelos 55 e 65', () => {
      expect(isCfopApplicableToModel('5102', '55')).toBe(true);
      expect(isCfopApplicableToModel('5102', '65')).toBe(true);
      // Interestadual (6102) não pode ser emitido em NFC-e 65
      expect(isCfopApplicableToModel('6102', '65')).toBe(false);
      expect(isCfopApplicableToModel('6102', '55')).toBe(true);
    });
  });

  describe('Validação de Item e CFOP (validation.ts)', () => {
    it('aprova operação válida de venda interna padrão', () => {
      const result = validateItemCfopMatch({
        cfop: '5102',
        destination: '1',
        model: '55',
        direction: 'outbound',
        itemType: 'product',
        operationType: 'sale',
        merchandiseOrigin: 'third_party',
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('rejeita NFC-e (modelo 65) com destino interestadual ou CFOP não iniciado em 5', () => {
      const resInterstate = validateItemCfopMatch({
        cfop: '6102',
        destination: '2',
        model: '65',
      });
      expect(resInterstate.valid).toBe(false);
      expect(resInterstate.reason).toContain('NFC-e (modelo 65) não permite operação interestadual');
    });

    it('rejeita incompatibilidade entre direção (entrada vs saída)', () => {
      const res = validateItemCfopMatch({
        cfop: '1202', // entrada
        destination: '1',
        model: '55',
        direction: 'outbound',
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('é de entrada, mas a operação é de saída');
    });

    it('rejeita incompatibilidade de escopo geográfico (idDest vs CFOP scope)', () => {
      const res = validateItemCfopMatch({
        cfop: '5102', // interno
        destination: '2', // interestadual
        model: '55',
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('incompatível com operação interestadual');
    });

    it('rejeita exigência e ausência de Substituição Tributária (ST)', () => {
      // 5405 exige ST
      const resWithoutSt = validateItemCfopMatch({
        cfop: '5405',
        destination: '1',
        model: '55',
        isSt: false,
      });
      expect(resWithoutSt.valid).toBe(false);
      expect(resWithoutSt.reason).toContain('exige item sujeito a ST');

      // 5102 não se aplica a ST
      const resWithSt = validateItemCfopMatch({
        cfop: '5102',
        destination: '1',
        model: '55',
        isSt: true,
      });
      expect(resWithSt.valid).toBe(false);
      expect(resWithSt.reason).toContain('não se aplica a item sujeito a ST');
    });
  });

  describe('Resolução Canônica de CFOP de Venda (resolution.ts)', () => {
    it('resolve 5102 para venda interna comum', () => {
      expect(determineSaleCfop({ destination: '1' })).toBe('5102');
    });

    it('resolve 6102 para venda interestadual para contribuinte', () => {
      expect(determineSaleCfop({ destination: '2', recipientIeIndicator: '1' })).toBe('6102');
    });

    it('resolve 6108 para venda interestadual para não contribuinte (ieIndicator=9)', () => {
      expect(determineSaleCfop({ destination: '2', recipientIeIndicator: '9' })).toBe('6108');
    });

    it('rejeita determinação para serviço ou produção própria sem matriz aprovada', () => {
      expect(() => determineSaleCfop({ destination: '1', itemType: 'service' })).toThrow();
      expect(() => determineSaleCfop({ destination: '1', isOwnProduction: true })).toThrow();
    });
  });

  describe('Listagem e Filtragem de Opções de UI (options.ts)', () => {
    it('retorna apenas opções ativas formatadas com label e valor', () => {
      const options = listActiveCfopOptions({ direction: 'outbound', scope: 'internal', model: '55' });
      expect(options.length).toBeGreaterThan(0);
      for (const opt of options) {
        expect(opt.value).toBeDefined();
        expect(opt.label).toContain(opt.value);
        expect(opt.operationType).toBeDefined();
        expect(opt.merchandiseOrigin).toBeDefined();
      }
    });

    it('filtra opções específicas para NFC-e (modelo 65)', () => {
      const options65 = listActiveCfopOptions({ model: '65' });
      expect(options65.length).toBeGreaterThan(0);
      for (const opt of options65) {
        const def = getCfopDefinition(opt.value);
        expect(def?.allowedModels).toContain('65');
        expect(def?.scope).toBe('internal');
      }
    });
  });
});
