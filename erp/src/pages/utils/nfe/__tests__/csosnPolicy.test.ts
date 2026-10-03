import { describe, expect, it } from 'vitest';
import {
  initialHmlCsosnConfiguration,
  parseHmlCsosnConfiguration,
  parseItemCsosnOverrides,
  resolveItemCsosn,
} from '../../../../../../api/nfe/csosnPolicy';
import { parseFiscalEmissionCommand } from '../../../../../../api/nfe/fiscalSnapshot';

const input = {
  configuration: initialHmlCsosnConfiguration(),
  environment: 2 as const,
  issuerCrt: '1',
};
describe('padrão CSOSN decidido no backend', () => {
  it('preenche todos os itens sem código específico com o padrão de homologação', () => {
    const items = [{}, {}, {}].map((item) => resolveItemCsosn({ ...input, ...item }));
    expect(items).toEqual(Array.from({ length: 3 }, () => ({ csosn: '103', source: 'default' })));
  });
  it.each(['102', '500', '201'])('preserva exceção fiscal %s', (specificRule) => {
    expect(resolveItemCsosn({ ...input, specificRule })).toEqual({
      csosn: specificRule,
      source: 'specific_rule',
    });
  });
  it('preserva escolha manual e código persistido do item ou produto', () => {
    expect(resolveItemCsosn({ ...input, manual: '102', saved: '103' })).toEqual({
      csosn: '102',
      source: 'manual',
    });
    expect(resolveItemCsosn({ ...input, saved: '500', catalog: '103' })).toEqual({
      csosn: '500',
      source: 'saved',
    });
    expect(resolveItemCsosn({ ...input, catalog: '201' })).toEqual({
      csosn: '201',
      source: 'catalog',
    });
  });
  it('bloqueia conflito com regra específica sem substituir silenciosamente a escolha', () => {
    expect(() => resolveItemCsosn({ ...input, manual: '103', specificRule: '500' })).toThrow(
      'conflita'
    );
  });
  it.each(['2', '3', '4'])('não aplica a política CRT 1 ao regime %s', (issuerCrt) => {
    expect(() => resolveItemCsosn({ ...input, issuerCrt })).toThrow('CRT 1');
  });
  it('recusa aplicar o padrão HML em produção', () => {
    expect(() => resolveItemCsosn({ ...input, environment: 1 })).toThrow('produção');
    expect(() =>
      parseHmlCsosnConfiguration({ ...input.configuration, productionApproved: true })
    ).toThrow('fora do escopo');
  });
  it('usa alteração posterior da configuração sem alterar os outros dados do item', () => {
    const item = {
      fiscal: { ncm: '94036000', cfop: '5102', origem: '2', pisCst: '99', cofinsCst: '99' },
    };
    const before = structuredClone(item);
    expect(
      resolveItemCsosn({ ...input, configuration: { ...input.configuration, csosn: '102' } }).csosn
    ).toBe('102');
    expect(item).toEqual(before);
  });
  it('aceita somente escolhas de CSOSN por item; não aceita grupos XML nem decisões do cliente', () => {
    const command = {
      orderId: 'TEST_AUT',
      environment: 2,
      emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
      itemCsosnOverrides: { '1': '102' },
    };
    expect(parseFiscalEmissionCommand(command)).toMatchObject({
      command: { itemCsosnOverrides: { '1': '102' } },
    });
    expect(
      parseFiscalEmissionCommand({ ...command, itemCsosnOverrides: { '0': '103' } })
    ).toHaveProperty('error');
    expect(() => parseItemCsosnOverrides({ '1': '999' })).toThrow();
  });
});
