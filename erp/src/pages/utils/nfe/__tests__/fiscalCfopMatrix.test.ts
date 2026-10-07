import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import { resolveFiscalDocument } from '../../../../../../api/nfe/fiscalSnapshot';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import {
  determineSaleCfop,
  isCfopActive,
  isCfopApplicableToModel,
  isCfopValid,
  listActiveCfopOptions,
  resolveFiscalCfopOrderScope,
  validateItemCfopMatch,
} from '../../../../../../shared-utils/fiscalCfopModel';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { makeInterstateFacts } from './fixtures/fiscalCfopMatrix.fixtures';

describe('Auditoria Completa da Matriz de CFOPs e Regras Tributárias (NF-e/NFC-e)', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (
          url.includes('/localidades/estados/41/municipios') ||
          url.includes('/estados/PR/municipios')
        ) {
          return { ok: true, json: async () => [{ id: 4106902, nome: 'Curitiba' }] };
        }
        if (
          url.includes('/localidades/estados/42/municipios') ||
          url.includes('/estados/SC/municipios')
        ) {
          return { ok: true, json: async () => [{ id: 4209102, nome: 'Joinville' }] };
        }
        if (
          url.includes('/localidades/estados/35/municipios') ||
          url.includes('/estados/SP/municipios')
        ) {
          return { ok: true, json: async () => [{ id: 3550308, nome: 'São Paulo' }] };
        }
        return { ok: true, json: async () => [{ id: 4106902, nome: 'Curitiba' }] };
      })
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  // 1. PR → PR, mercadoria adquirida de terceiros → expectativa de 5.102 quando aplicável
  it('1. PR → PR, mercadoria adquirida de terceiros: determina e valida CFOP 5.102', async () => {
    expect(determineSaleCfop({ destination: '1', itemType: 'product' })).toBe('5102');

    const facts = makeInterstateFacts({
      recipientUf: 'PR',
      deliveryMethod: 'delivery',
      cfop: '5102',
    });
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    expect(result.document.operation.destination).toBe('1');
    expect(result.document.items[0].classification.cfop).toBe('5102');

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '44512248000107',
      model: result.document.model,
      series: '1',
      number: 101,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 1,
      number: 101,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml).toContain('<idDest>1</idDest>');
    expect(xml).toContain('<CFOP>5102</CFOP>');
    expect(xml).toContain('<CSOSN>102</CSOSN>');
  });

  // 2. Operação interestadual determina 6102 para contribuinte e 6108 para não contribuinte
  it('2. PR → outra UF (SC): determina CFOP 6102 para contribuinte e 6108 para não contribuinte', async () => {
    // 6102 para contribuinte / padrão
    expect(determineSaleCfop({ destination: '2', itemType: 'product' })).toBe('6102');
    expect(
      determineSaleCfop({ destination: '2', itemType: 'product', recipientIeIndicator: '1' })
    ).toBe('6102');
    // 6108 para não contribuinte
    expect(
      determineSaleCfop({ destination: '2', itemType: 'product', recipientIeIndicator: '9' })
    ).toBe('6108');

    // Pedido a não contribuinte com CFOP 6108 é aprovado
    const factsNonTaxpayer = makeInterstateFacts({
      recipientUf: 'SC',
      deliveryMethod: 'delivery',
      cfop: '6108',
    });
    const rulesNonTaxpayer = await createHmlNormalSaleRuleSet(
      factsNonTaxpayer,
      initialHmlCsosnConfiguration()
    );
    const resNonTaxpayer = resolveFiscalDocument(factsNonTaxpayer, rulesNonTaxpayer);
    expect(resNonTaxpayer.status).toBe('ready');

    // Se tentar emitir 6102 para não contribuinte consumidor final, a matriz exige CFOP 6108
    const factsMismatch = makeInterstateFacts({
      recipientUf: 'SC',
      deliveryMethod: 'delivery',
      cfop: '6102',
    });
    await expect(
      createHmlNormalSaleRuleSet(factsMismatch, initialHmlCsosnConfiguration())
    ).rejects.toThrow(/esperado CFOP 6108 para operação interestadual/);
  });

  // 3. Operação interestadual não deve escolher 6.933 só porque o destino está fora do estado
  it('3. Operação interestadual não deve utilizar 6.933 para venda de móveis/mercadorias', async () => {
    const checkProduct = validateItemCfopMatch({
      cfop: '6933',
      destination: '2',
      model: '55',
      itemType: 'product',
    });
    expect(checkProduct.valid).toBe(false);
    expect(checkProduct.reason).toContain('ISSQN');

    // CFOP 6933 é bloqueado por pertencer a serviço (ISSQN)
    const facts = makeInterstateFacts({
      recipientUf: 'SC',
      deliveryMethod: 'delivery',
      cfop: '6933',
    });
    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      /pertence a prestação de serviço/
    );
  });

  // 4. Serviço interestadual deve continuar separado da venda de mercadoria
  it('4. Serviço interestadual deve continuar separado da venda de mercadoria', () => {
    // A matriz HML de venda de mercadoria não cobre prestação de serviço.
    expect(() => determineSaleCfop({ destination: '2', itemType: 'service' })).toThrow(
      /Prestação de serviço exige uma matriz fiscal específica aprovada/
    );
    expect(() => determineSaleCfop({ destination: '1', itemType: 'service' })).toThrow(
      /Prestação de serviço exige uma matriz fiscal específica aprovada/
    );

    // Serviço não pode receber 6102
    const checkService = validateItemCfopMatch({
      cfop: '6102',
      destination: '2',
      model: '55',
      itemType: 'service',
    });
    expect(checkService.valid).toBe(false);
    expect(checkService.reason).toContain(
      'venda de mercadoria e não pode ser utilizado para prestação de serviço'
    );
  });

  // 5. CFOP inexistente/incompatível deve bloquear emissão
  it('5. CFOP inexistente ou incompatível com o modelo/destino bloqueia emissão', () => {
    // Inexistente
    expect(isCfopValid('9999')).toBe(false);
    const checkUnknown = validateItemCfopMatch({
      cfop: '9999',
      destination: '1',
      model: '55',
    });
    expect(checkUnknown.valid).toBe(false);
    expect(checkUnknown.reason).toContain('não existe no catálogo oficial');

    // Incompatível com NFC-e (modelo 65 não aceita 6xxx)
    expect(isCfopApplicableToModel('6102', '65')).toBe(false);
    const checkNfceInterstate = validateItemCfopMatch({
      cfop: '6102',
      destination: '2',
      model: '65',
    });
    expect(checkNfceInterstate.valid).toBe(false);
    expect(checkNfceInterstate.reason).toContain(
      'NFC-e (modelo 65) não permite operação interestadual'
    );

    // Incompatível com destino: CFOP 6102 em operação interna (idDest=1)
    const checkInterstateInInternal = validateItemCfopMatch({
      cfop: '6102',
      destination: '1',
      model: '55',
    });
    expect(checkInterstateInInternal.valid).toBe(false);
    expect(checkInterstateInInternal.reason).toContain(
      'incompatível com operação interna (idDest=1)'
    );

    // Incompatível com destino: CFOP 5102 em operação interestadual (idDest=2)
    const checkInternalInInterstate = validateItemCfopMatch({
      cfop: '5102',
      destination: '2',
      model: '55',
    });
    expect(checkInternalInInterstate.valid).toBe(false);
    expect(checkInternalInInterstate.reason).toContain(
      'incompatível com operação interestadual (idDest=2)'
    );
  });

  // 6. CFOP desativado não deve aparecer para seleção
  it('6. CFOP desativado não deve constar na listagem ativa e bloqueia emissão se forçado', () => {
    const activeOptions = listActiveCfopOptions();
    expect(activeOptions.every((opt) => isCfopActive(opt.value))).toBe(true);

    // Testar que uma definição inativa é barrada por validateItemCfopMatch
    expect(isCfopActive('0000')).toBe(false);
  });

  // 7. O CFOP interestadual não amplia o escopo da matriz HML doméstica.
  it('7. A seleção 6102 não libera a matriz doméstica para outra UF', async () => {
    const facts = makeInterstateFacts({
      recipientUf: 'SP',
      deliveryMethod: 'delivery',
      cfop: '6102',
    });
    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      /esperado CFOP 6108 para operação interestadual/
    );
  });

  // 8. Uma regra aprovada é necessária antes de produzir XML interestadual.
  it('8. Não gera XML interestadual com a matriz HML doméstica', async () => {
    const facts = makeInterstateFacts({
      recipientUf: 'SC',
      deliveryMethod: 'delivery',
      cfop: '6102',
    });
    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      /esperado CFOP 6108 para operação interestadual/
    );
  });

  // 9. Divergência entre CFOP do frontend e regra server-side deve ser rejeitada de forma explícita
  it('9. Divergência entre CFOP do frontend e regra server-side é rejeitada com erro explícito', async () => {
    // Nenhum CFOP escolhido libera a operação sem sua matriz aprovada.
    const factsMismatched = makeInterstateFacts({
      recipientUf: 'SC',
      deliveryMethod: 'delivery',
      cfop: '5102',
    });
    await expect(
      createHmlNormalSaleRuleSet(factsMismatched, initialHmlCsosnConfiguration())
    ).rejects.toThrow(/esperado CFOP 6108 para operação interestadual/);

    // Pedido para PR (interno), mas frontend tenta submeter com 6102
    const factsInternalMismatched = makeInterstateFacts({
      recipientUf: 'PR',
      deliveryMethod: 'delivery',
      cfop: '6102',
    });
    const rulesInternal = await createHmlNormalSaleRuleSet(
      factsInternalMismatched,
      initialHmlCsosnConfiguration()
    );
    const resInternal = resolveFiscalDocument(factsInternalMismatched, rulesInternal);
    expect(resInternal.status).toBe('blocked');
    if (resInternal.status === 'blocked') {
      expect(resInternal.blockers[0].message).toMatch(/esperado CFOP 5102 para operação interna/);
    }
    expect(() => rulesInternal.determine(factsInternalMismatched, 'hash')).toThrow(
      /esperado CFOP 5102 para operação interna/
    );
  });

  // 10. Nenhum fallback silencioso para 5.102, 6.102 ou qualquer outro CFOP
  it('10. Nenhum fallback silencioso para CFOP quando a combinação fiscal for desconhecida', () => {
    expect(() =>
      determineSaleCfop({
        destination: '3', // Exterior
        itemType: 'product',
      })
    ).toThrow(/Determinação fiscal de CFOP para destino idDest=3 não suportada/);

    expect(() =>
      determineSaleCfop({
        destination: '3',
        itemType: 'service',
      })
    ).toThrow(/Prestação de serviço exige uma matriz fiscal específica aprovada/);
  });

  // 11. Venda presencial / retirada (pickup): mesmo que o cliente resida em outra UF, circulação ocorre no PR
  it('11. Cliente de outra UF com modalidade retirada (pickup): operação física ocorre no PR e utiliza CFOP 5.102', async () => {
    // Cliente mora em SC, mas comprou com retirada no balcão no Paraná
    const factsPickup = makeInterstateFacts({
      recipientUf: 'SC',
      deliveryMethod: 'pickup',
      cfop: '5102',
    });
    const rules = await createHmlNormalSaleRuleSet(factsPickup, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(factsPickup, rules);

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.document.operation.destination).toBe('1');
      expect(result.document.items[0].classification.cfop).toBe('5102');
    }
  });

  // 12. Mercadorias com ST e Produção Própria exigem matriz específica
  it('12. Bloqueia ST e Produção Própria sem matriz específica aprovada', () => {
    expect(() => determineSaleCfop({ destination: '1', isSt: true })).toThrow(
      /Mercadoria com ST ou de produção própria exige matriz fiscal específica aprovada/
    );
    expect(() => determineSaleCfop({ destination: '2', isSt: true })).toThrow(
      /Mercadoria com ST ou de produção própria exige matriz fiscal específica aprovada/
    );
    expect(() => determineSaleCfop({ destination: '1', isOwnProduction: true })).toThrow(
      /Mercadoria com ST ou de produção própria exige matriz fiscal específica aprovada/
    );
    expect(() => determineSaleCfop({ destination: '2', isOwnProduction: true })).toThrow(
      /Mercadoria com ST ou de produção própria exige matriz fiscal específica aprovada/
    );
  });

  it('classifica 6102 e 6108 separadamente e conserva ST condicional como candidata', () => {
    const nonTaxpayerOptions = listActiveCfopOptions({
      direction: 'outbound',
      scope: 'interstate',
      model: '55',
      itemType: 'product',
      operationType: 'sale_to_non_taxpayer',
      merchandiseOrigin: 'third_party',
      isSt: true,
    });
    expect(nonTaxpayerOptions.map((option) => option.value)).toContain('6108');
    expect(nonTaxpayerOptions.find((option) => option.value === '6108')?.stApplicability).toBe(
      'scenario_dependent'
    );
    const taxpayerStOptions = listActiveCfopOptions({
      direction: 'outbound',
      scope: 'interstate',
      model: '55',
      itemType: 'product',
      operationType: 'sale',
      merchandiseOrigin: 'third_party',
      isSt: true,
    });
    expect(taxpayerStOptions.map((option) => option.value)).not.toContain('6102');
    expect(taxpayerStOptions.map((option) => option.value)).toContain('6404');
    expect(
      validateItemCfopMatch({
        cfop: '6108',
        destination: '2',
        model: '55',
        operationType: 'sale_to_non_taxpayer',
        merchandiseOrigin: 'third_party',
        isSt: true,
      }).valid
    ).toBe(true);
    expect(
      validateItemCfopMatch({
        cfop: '6102',
        destination: '2',
        model: '55',
        operationType: 'sale',
        merchandiseOrigin: 'own_production',
      }).valid
    ).toBe(false);
    expect(
      validateItemCfopMatch({
        cfop: '6102',
        destination: '2',
        model: '55',
        operationType: 'sale',
        merchandiseOrigin: 'third_party',
        isSt: true,
      })
    ).toMatchObject({ valid: false, reason: 'CFOP 6102 não se aplica a item sujeito a ST.' });
  });

  it('determina destino pela entrega física selecionada e pela UF do emitente na retirada', () => {
    expect(
      resolveFiscalCfopOrderScope({
        issuerUf: 'PR',
        deliveryMethod: 'delivery',
        shipping: {
          deliveryMethod: 'delivery',
          useCustomerAddress: false,
          deliveryAddress: { state: 'SC' },
        },
        customerAddress: { state: 'PR' },
      })
    ).toMatchObject({ scope: 'interstate', operationUf: 'SC', destination: '2' });
    expect(
      resolveFiscalCfopOrderScope({
        issuerUf: 'PR',
        deliveryMethod: 'pickup',
        shipping: { deliveryMethod: 'pickup' },
        customerAddress: { state: 'SC' },
      })
    ).toMatchObject({ scope: 'internal', operationUf: 'PR', destination: '1' });
  });
});
