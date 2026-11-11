import { describe, expect, it } from 'vitest';
import {
  buildAgentProductSearchFilter,
  classifyAgentProductMatch,
} from '../../../../../shared-utils/agentProductSearch';
import { getAgentOperationSearchTypes } from '../../../../../shared-utils/agentOperationPermissions';
import { normalizeAgentOrderIdentifier } from '../../../../../shared-utils/agentOrderHelpers';
import { createAgentToolCallGuard } from '../../../../../shared-utils/agentToolCallGuard';
import { sanitizeAgentToolResponseForModel } from '../../../../../shared-utils/agentToolResponse';

describe('auditoria das ferramentas do Seu Lizandro', () => {
  it('exige finalidade e modelo no balcão para pia e rejeita o balcão de canto oblíquo', () => {
    const query = 'balcão para pia Florença';
    const exact = {
      code: '000217',
      name: 'Balcão para Pia de 1,20m 3 Gavetas 100% MDF Florença',
      line: 'Florença',
    };
    const wrongType = {
      code: '004055',
      name: 'Florença - Balcão Canto Oblíquo em Madeira MDF Angelin/Cinza',
      line: 'Florença',
    };

    expect(classifyAgentProductMatch(exact, query)).toBe('corresponding');
    expect(classifyAgentProductMatch(wrongType, query)).toBe('incompatible');
    expect(classifyAgentProductMatch(exact, 'balcão pia florença')).toBe('corresponding');
    expect(classifyAgentProductMatch(exact, 'balcão para pia florensa')).toBe('alternative');

    const filter = buildAgentProductSearchFilter(query);
    expect(filter).toContain('and(');
    expect(filter.match(/name\.imatch/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('restringe uma busca ampla de operações aos tipos que o operador pode consultar', () => {
    const budgetOnly = {
      role: 'seller',
      enforced: true,
      rolePermissions: {
        viewOrders: [],
        createEditOrders: [],
        viewBudgets: ['seller'],
        viewAssistanceOrders: [],
        viewReturns: [],
        viewDeliverySchedule: [],
        startDelivery: [],
        viewAssemblyList: [],
      },
    };

    expect(getAgentOperationSearchTypes('todas', budgetOnly)).toEqual(['orcamento']);

    const assistanceOnly = {
      role: 'seller',
      enforced: true,
      rolePermissions: {
        viewOrders: [],
        createEditOrders: [],
        viewBudgets: [],
        viewAssistanceOrders: ['seller'],
        viewReturns: [],
        viewDeliverySchedule: [],
        startDelivery: [],
        viewAssemblyList: [],
      },
    };
    expect(getAgentOperationSearchTypes('todas', assistanceOnly)).toEqual(['assistencia']);
  });

  it('preserva códigos alfanuméricos como texto e rejeita sintaxe de filtro injetada', () => {
    expect(normalizeAgentOrderIdentifier('#12345')).toBe('12345');
    expect(normalizeAgentOrderIdentifier('000123')).toBe('000123');
    expect(normalizeAgentOrderIdentifier('1e5')).toBe('1e5');
    expect(normalizeAgentOrderIdentifier('1,eq.*,deleted.eq.true')).toBeNull();
    expect(normalizeAgentOrderIdentifier('')).toBeNull();
  });

  it('deduplica consultas equivalentes, conserva idempotência de mutações e limita chamadas únicas', async () => {
    const guard = createAgentToolCallGuard(3);
    let searches = 0;
    let writes = 0;

    const first = await guard.run('buscarProdutos', { termo: 'florença', limite: 5 }, async () => {
      searches += 1;
      return ['000217'];
    });
    const duplicate = await guard.run('buscarProdutos', { limite: 5, termo: 'florença' }, async () => {
      searches += 1;
      return ['duplicado'];
    });
    expect(first.status).toBe('executed');
    expect(duplicate.status).toBe('cached');
    expect(duplicate.value).toEqual(['000217']);
    expect(searches).toBe(1);

    await guard.run('criarProduto', { nome: 'Mesa' }, async () => {
      writes += 1;
      return { success: true };
    });
    await guard.run('criarProduto', { nome: 'Mesa' }, async () => {
      writes += 1;
      return { success: true };
    });
    expect(writes).toBe(1);

    const refreshed = await guard.run('buscarProdutos', { termo: 'florença', limite: 5 }, async () => {
      searches += 1;
      return ['000217 atualizado'];
    });
    expect(refreshed.status).toBe('executed');
    expect(searches).toBe(2);

    const overLimit = await guard.run('buscarClientes', { termo: 'Ana' }, async () => []);
    expect(overLimit.status).toBe('limit');
  });

  it('oculta mensagens técnicas e mantém uma orientação segura para buscas excessivamente amplas', () => {
    expect(
      sanitizeAgentToolResponseForModel({
        success: false,
        code: 'DATABASE_ERROR',
        error: 'relation secret_table does not exist',
      })
    ).toEqual({
      success: false,
      code: 'TEMPORARY_FAILURE',
      message: 'Não consegui consultar essas informações agora. Tente novamente mais tarde ou peça ajuda à equipe.',
    });
    expect(
      sanitizeAgentToolResponseForModel({
        success: false,
        code: 'SEARCH_TOO_BROAD',
        message: 'Diga modelo ou código.',
      }).code
    ).toBe('SEARCH_TOO_BROAD');
  });
});
