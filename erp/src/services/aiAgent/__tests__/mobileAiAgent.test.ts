import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../../mobile/src/services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { value: 'fake-api-key-test' } }),
          order: () => Promise.resolve({ data: [] }),
        }),
      }),
    }),
  },
}));

import { MobileAgentClient } from '../../../../../mobile/src/services/aiAgent/mobileAgentClient';
import { MobileAgentService } from '../../../../../mobile/src/services/aiAgent/mobileAgentService';
import { MobileToolDispatcher } from '../../../../../mobile/src/services/aiAgent/mobileToolDispatcher';
import { mobileAgentTools } from '../../../../../mobile/src/services/aiAgent/mobileToolDeclarations';

describe('Mobile AI Agent - Function Calling & Declarations', () => {
  it('deve ter classe MobileAgentClient definida', () => {
    expect(MobileAgentClient).toBeDefined();
    expect(typeof MobileAgentClient.getApiKey).toBe('function');
  });

  it('deve ter as 7 ferramentas declaradas com schemas JSON Schema válidos', () => {
    const declarations = mobileAgentTools[0].functionDeclarations;
    expect(declarations.length).toBe(7);

    const names = declarations.map(d => d.name);
    expect(names).toContain('buscarCategoriasFinanceiras');
    expect(names).toContain('buscarContasAPagar');
    expect(names).toContain('buscarMovimentacoesFinanceiras');
    expect(names).toContain('obterResumoFinanceiro');
    expect(names).toContain('criarMovimentacaoFinanceira');
    expect(names).toContain('cancelarOuExcluirMovimentacaoFinanceira');
    expect(names).toContain('registrarFeedbackAgente');
  });

  it('deve montar a system instruction com data de referência e proibições invioláveis', () => {
    const instruction = MobileAgentService.buildSystemInstruction();

    expect(instruction).toContain('DATA DE REFERENCIA DO SISTEMA');
    expect(instruction).toContain('PROIBIDO INVENTAR DADOS OU IDs');
    expect(instruction).toContain('buscarCategoriasFinanceiras');
    expect(instruction).toContain('buscarContasAPagar');
    expect(instruction).toContain('criarMovimentacaoFinanceira');
  });

  it('deve responder a uma saudacao simples do operador usando o modelo real do Gemini', async () => {
    const { result, updatedHistory } = await MobileAgentService.sendMessage('OI');

    expect(result.answer).toBeTruthy();
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(2);
    expect(updatedHistory.length).toBeGreaterThanOrEqual(2);
  }, 15000);

  it('deve exigir finalidade e forma de pagamento antes de criar a movimentação', async () => {
    // Turno 1: Envia despesa sem finalidade e sem forma de pagamento
    const turno1 = await MobileAgentService.sendMessage('COTNA DE LUZ 200');
    expect(turno1.result.executedTools.find(t => t.name === 'criarMovimentacaoFinanceira')).toBeUndefined();
    expect(turno1.result.answer.toLowerCase()).toMatch(/loja|pessoal|empresa/);

    // Turno 2: Usuário responde "loja no pix" informando finalidade e forma de pagamento
    const turno2 = await MobileAgentService.sendMessage('loja no pix', turno1.updatedHistory);
    const created = turno2.result.executedTools.find(t => t.name === 'criarMovimentacaoFinanceira');

    expect(created).toBeDefined();
    expect(created?.args.valor).toBe(200);
    expect(created?.args.tipo).toBe('expense');
    expect(created?.args.finalidade).toBe('BUSINESS');
    expect(created?.args.formaPagamento?.toUpperCase()).toContain('PIX');
  }, 25000);

  it('deve ter campos e opções de criarMovimentacaoFinanceira estritamente iguais ao formulário de transações', () => {
    const declarations = mobileAgentTools[0].functionDeclarations;
    const criarTx = declarations.find(d => d.name === 'criarMovimentacaoFinanceira');
    expect(criarTx).toBeDefined();

    const props = (criarTx!.parameters as any).properties;

    // Campos oficiais
    expect(props.tipo.enum).toEqual(['income', 'expense']);
    expect(props.finalidade.enum).toEqual(['BUSINESS', 'PERSONAL_PARTNER']);
    expect(props.formaPagamento.enum).toEqual([
      'PIX',
      'Cartão de Crédito',
      'Cartão de Débito',
      'Boleto',
      'Dinheiro',
      'TED',
    ]);
    expect(props.veiculo.enum).toEqual(['Strada', 'HR', 'Outro', 'Não informado']);
  });
});
