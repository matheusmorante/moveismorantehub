import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../../mobile/src/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { value: 'fake-api-key-test' } }),
          order: () => Promise.resolve({ data: [] }),
        }),
        order: () => Promise.resolve({ data: [{ id: 'cat-energia', name: 'Energia', type: 'expense' }] }),
      }),
    }),
  },
}));

import { MobileAgentClient } from '../../../../../mobile/src/services/aiAgent/mobileAgentClient';
import { MobileAgentService } from '../../../../../mobile/src/services/aiAgent/mobileAgentService';
import { MobileToolDispatcher } from '../../../../../mobile/src/services/aiAgent/mobileToolDispatcher';
import { mobileAgentTools } from '../../../../../mobile/src/services/aiAgent/mobileToolDeclarations';
import { erpAgentTools } from '../geminiToolDeclarations';

describe('Mobile AI Agent - Function Calling, Parity & Permissions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve ter classe MobileAgentClient definida com generateContent', () => {
    expect(MobileAgentClient).toBeDefined();
    expect(typeof MobileAgentClient.generateContent).toBe('function');
  });

  it('deve ter todas as 28 ferramentas declaradas com paridade completa entre ERP e Mobile', () => {
    const mobileDeclarations = mobileAgentTools[0].functionDeclarations;
    const erpDeclarations = erpAgentTools[0].functionDeclarations;

    expect(mobileDeclarations.length).toBe(28);
    expect(erpDeclarations.length).toBe(28);

    const mobileNames = mobileDeclarations.map((d) => d.name).sort();
    const erpNames = erpDeclarations.map((d) => d.name).sort();
    expect(mobileNames).toEqual(erpNames);

    // Financeiro
    expect(mobileNames).toContain('buscarCategoriasFinanceiras');
    expect(mobileNames).toContain('buscarContasAPagar');
    expect(mobileNames).toContain('buscarContasAReceber');
    expect(mobileNames).toContain('buscarMovimentacoesFinanceiras');
    expect(mobileNames).toContain('obterResumoFinanceiro');
    expect(mobileNames).toContain('criarMovimentacaoFinanceira');
    expect(mobileNames).toContain('editarMovimentacaoFinanceira');
    expect(mobileNames).toContain('cancelarOuExcluirMovimentacaoFinanceira');
    expect(mobileNames).toContain('criarContaAPagar');
    expect(mobileNames).toContain('editarContaAPagar');
    expect(mobileNames).toContain('criarContaAReceber');
    expect(mobileNames).toContain('editarContaAReceber');
    expect(mobileNames).toContain('baixarContaFinanceira');
    expect(mobileNames).toContain('registrarFeedbackAgente');

    // Pedidos, Orçamentos, Assistências, Devoluções e Pessoas
    expect(mobileNames).toContain('buscarOperacoes');
    expect(mobileNames).toContain('obterDetalhesOperacao');
    expect(mobileNames).toContain('buscarPedidosEntregas');
    expect(mobileNames).toContain('obterDetalhesPedidoEntrega');
    expect(mobileNames).toContain('criarPedidoOperacao');
    expect(mobileNames).toContain('editarPedidoOperacao');
    expect(mobileNames).toContain('buscarClientes');
    expect(mobileNames).toContain('criarOuEditarCliente');
    expect(mobileNames).toContain('buscarColaboradores');

    // Tudo sobre Produto
    expect(mobileNames).toContain('buscarProdutos');
    expect(mobileNames).toContain('obterDetalhesProduto');
    expect(mobileNames).toContain('listarCategoriasECaracteristicasProduto');
    expect(mobileNames).toContain('criarProduto');
    expect(mobileNames).toContain('editarProduto');
  });

  it('deve montar a system instruction com data de referência, ferramentas e permissões de perfil', () => {
    const instruction = MobileAgentService.buildSystemInstruction(undefined, {
      role: 'seller',
      enforced: true,
    });

    expect(instruction).toContain('DATA DE REFERENCIA DO SISTEMA');
    expect(instruction).toContain('PROIBIDO INVENTAR DADOS OU IDs');
    expect(instruction).toContain('buscarCategoriasFinanceiras');
    expect(instruction).toContain('buscarContasAPagar');
    expect(instruction).toContain('criarMovimentacaoFinanceira');
    expect(instruction).toContain('criarPedidoOperacao');
    expect(instruction).toContain('criarProduto');
    expect(instruction).toContain('editarProduto');
    expect(instruction).toContain('PERFIL DE ACESSO DO OPERADOR ATUAL');
  });

  it('deve responder a uma saudacao simples do operador', async () => {
    vi.spyOn(MobileAgentClient, 'generateContent').mockResolvedValueOnce({
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'Olá! Sou Seu Lizandro, como posso ajudar hoje?' }],
          },
        },
      ],
    });

    const { result, updatedHistory } = await MobileAgentService.sendMessage('OI');

    expect(result.answer).toBeTruthy();
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(2);
    expect(updatedHistory.length).toBeGreaterThanOrEqual(2);
  });

  it('deve exigir finalidade e forma de pagamento antes de criar a movimentação', async () => {
    const genSpy = vi.spyOn(MobileAgentClient, 'generateContent');

    genSpy.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              {
                text: 'Essa conta de luz de R$ 200,00 é da loja/empresa ou pessoal de casa? E qual foi a forma de pagamento?',
              },
            ],
          },
        },
      ],
    });

    const turno1 = await MobileAgentService.sendMessage('COTNA DE LUZ 200');
    expect(
      turno1.result.executedTools.find((t) => t.name === 'criarMovimentacaoFinanceira')
    ).toBeUndefined();
    expect(turno1.result.answer.toLowerCase()).toMatch(/loja|pessoal|empresa/);

    genSpy
      .mockResolvedValueOnce({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [
                {
                  functionCall: {
                    name: 'criarMovimentacaoFinanceira',
                    args: {
                      tipo: 'expense',
                      valor: 200,
                      descricao: 'Conta de luz',
                      finalidade: 'BUSINESS',
                      categoriaId: 'cat-energia',
                      formaPagamento: 'PIX',
                    },
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: 'Movimentação preparada no card abaixo.' }],
            },
          },
        ],
      });

    const turno2 = await MobileAgentService.sendMessage('loja no pix', turno1.updatedHistory);
    const created = turno2.result.executedTools.find(
      (t) => t.name === 'criarMovimentacaoFinanceira'
    );

    expect(created).toBeDefined();
    expect(created?.args.valor).toBe(200);
    expect(created?.args.tipo).toBe('expense');
    expect(created?.args.finalidade).toBe('BUSINESS');
    expect(created?.args.formaPagamento?.toUpperCase()).toContain('PIX');
  });

  it('deve ter campos e opções de criarMovimentacaoFinanceira estritamente iguais ao formulário de transações', () => {
    const declarations = mobileAgentTools[0].functionDeclarations;
    const criarTx = declarations.find((d) => d.name === 'criarMovimentacaoFinanceira');
    expect(criarTx).toBeDefined();

    const props = (criarTx!.parameters as any).properties;

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

  it('deve bloquear execução no MobileToolDispatcher quando o perfil do operador não tem permissão', async () => {
    const deniedFinance = await MobileToolDispatcher.execute(
      {
        name: 'criarMovimentacaoFinanceira',
        args: {
          tipo: 'expense',
          valor: 100,
          descricao: 'Teste sem permissão',
          categoriaId: 'cat-1',
          formaPagamento: 'PIX',
        },
      },
      { role: 'deliverer', enforced: true }
    );

    expect(deniedFinance.record.result.success).toBe(false);
    expect(deniedFinance.record.result.code).toBe('PERMISSION_DENIED');

    const deniedProductEdit = await MobileToolDispatcher.execute(
      {
        name: 'editarProduto',
        args: { codigoOuSku: '000001', precoVenda: 1500 },
      },
      { role: 'deliverer', enforced: true }
    );

    expect(deniedProductEdit.record.result.success).toBe(false);
    expect(deniedProductEdit.record.result.code).toBe('PERMISSION_DENIED');
  });
});
