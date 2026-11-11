import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiToolDispatcher } from '../geminiToolDispatcher';
import { financialAgentTools } from '../financialAgentTools';
import { orderAndPeopleAgentTools } from '../orderAndPeopleAgentTools';
import { productAgentTools } from '../productAgentTools';
import { setActiveAgentPermissionContext } from '../../../../../shared-utils/agentPermissionGuard';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock('../financialAgentTools', () => ({
  financialAgentTools: {
    buscarCategoriasFinanceiras: vi.fn(),
    buscarContasAPagar: vi.fn(),
    buscarContasAReceber: vi.fn(),
    buscarMovimentacoesFinanceiras: vi.fn(),
    obterResumoFinanceiro: vi.fn(),
    criarMovimentacaoFinanceira: vi.fn(),
    editarMovimentacaoFinanceira: vi.fn(),
    cancelarOuExcluirMovimentacaoFinanceira: vi.fn(),
    criarContaAPagar: vi.fn(),
    editarContaAPagar: vi.fn(),
    criarContaAReceber: vi.fn(),
    editarContaAReceber: vi.fn(),
    baixarContaFinanceira: vi.fn(),
    registrarFeedbackAgente: vi.fn(),
  },
}));

vi.mock('../orderAndPeopleAgentTools', () => ({
  orderAndPeopleAgentTools: {
    buscarOperacoes: vi.fn(),
    obterDetalhesOperacao: vi.fn(),
    buscarPedidosEntregas: vi.fn(),
    obterDetalhesPedidoEntrega: vi.fn(),
    criarPedidoOperacao: vi.fn(),
    editarPedidoOperacao: vi.fn(),
    buscarClientes: vi.fn(),
    criarOuEditarCliente: vi.fn(),
    buscarColaboradores: vi.fn(),
  },
}));

vi.mock('../productAgentTools', () => ({
  productAgentTools: {
    buscarProdutos: vi.fn(),
    obterDetalhesProduto: vi.fn(),
    listarCategoriasECaracteristicasProduto: vi.fn(),
    criarProduto: vi.fn(),
    editarProduto: vi.fn(),
  },
}));

describe('GeminiToolDispatcher - Roteamento e Controle de Permissões por Perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActiveAgentPermissionContext(null);
  });

  it('deve despachar corretamente buscarCategoriasFinanceiras', async () => {
    (financialAgentTools.buscarCategoriasFinanceiras as any).mockResolvedValueOnce({
      success: true,
      data: [{ id: '1', nome: 'Combustível' }],
    });

    const { functionResponse, record } = await GeminiToolDispatcher.execute({
      name: 'buscarCategoriasFinanceiras',
      args: { tipo: 'expense' },
    }, { role: 'administrator', enforced: true });

    expect(functionResponse.name).toBe('buscarCategoriasFinanceiras');
    expect(functionResponse.response.output.success).toBe(true);
    expect(record.success).toBe(true);
    expect(record.label).toBe('Consultando categorias financeiras');
  });

  it('deve despachar ferramentas de Pedidos/Orçamentos/Assistências/Devoluções e Produtos para perfil autorizado', async () => {
    (orderAndPeopleAgentTools.criarPedidoOperacao as any).mockResolvedValueOnce({
      success: true,
      data: { id: 'ord-1', numeroPedido: '1050', tipoOperacao: 'orcamento' },
    });
    (productAgentTools.criarProduto as any).mockResolvedValueOnce({
      success: true,
      data: { codigo: '000999', nome: 'Sofá Retrátil' },
    });

    const orderExec = await GeminiToolDispatcher.execute(
      {
        name: 'criarPedidoOperacao',
        args: { tipoOperacao: 'orcamento', clienteNome: 'Maria' },
      },
      { role: 'manager', enforced: true }
    );
    expect(orderExec.record.success).toBe(true);
    expect(orderAndPeopleAgentTools.criarPedidoOperacao).toHaveBeenCalledOnce();

    const prodExec = await GeminiToolDispatcher.execute(
      {
        name: 'criarProduto',
        args: { nome: 'Sofá Retrátil', precoVenda: 2990 },
      },
      { role: 'manager', enforced: true }
    );
    expect(prodExec.record.success).toBe(true);
    expect(productAgentTools.criarProduto).toHaveBeenCalledWith(
      { nome: 'Sofá Retrátil', precoVenda: 2990 },
      { role: 'manager', enforced: true }
    );
  });

  it('deve bloquear com PERMISSION_DENIED quando o perfil não possui permissão para a ferramenta solicitada', async () => {
    const finDenied = await GeminiToolDispatcher.execute(
      {
        name: 'criarContaAPagar',
        args: { descricao: 'Boleto Fornecedor', valor: 1200, dataVencimento: '2026-11-15' },
      },
      { role: 'seller', enforced: true }
    );
    expect(finDenied.record.success).toBe(false);
    expect(finDenied.functionResponse.response.output.code).toBe('PERMISSION_DENIED');
    expect(financialAgentTools.criarContaAPagar).not.toHaveBeenCalled();

    const orderDenied = await GeminiToolDispatcher.execute(
      {
        name: 'criarPedidoOperacao',
        args: { tipoOperacao: 'venda', clienteNome: 'Cliente' },
      },
      { role: 'deliverer', enforced: true }
    );
    expect(orderDenied.record.success).toBe(false);
    expect(orderDenied.functionResponse.response.output.code).toBe('PERMISSION_DENIED');
    expect(orderAndPeopleAgentTools.criarPedidoOperacao).not.toHaveBeenCalled();

    // Se a matriz customizada rolePermissions liberar createEditOrders para seller, deve permitir:
    (orderAndPeopleAgentTools.criarPedidoOperacao as any).mockResolvedValueOnce({
      success: true,
      data: { id: 'ord-2', numeroPedido: '1051', tipoOperacao: 'venda' },
    });
    const orderAllowedCustom = await GeminiToolDispatcher.execute(
      {
        name: 'criarPedidoOperacao',
        args: { tipoOperacao: 'venda', clienteNome: 'Cliente' },
      },
      {
        role: 'seller',
        rolePermissions: { createEditOrders: ['manager', 'seller'] },
        enforced: true,
      }
    );
    expect(orderAllowedCustom.record.success).toBe(true);
    expect(orderAndPeopleAgentTools.criarPedidoOperacao).toHaveBeenCalledOnce();
  });

  it('deve tratar ferramenta desconhecida sem quebrar', async () => {
    const { functionResponse, record } = await GeminiToolDispatcher.execute({
      name: 'ferramentaInexistente',
      args: {},
    });

    expect(functionResponse.name).toBe('ferramentaInexistente');
    expect(functionResponse.response.output.success).toBe(false);
    expect(record.success).toBe(false);
    expect(record.error).toContain('não encontrada no ERP');
  });

  it('deve capturar exceções não tratadas do handler e retornar erro estruturado', async () => {
    (financialAgentTools.criarMovimentacaoFinanceira as any).mockRejectedValueOnce(
      new Error('Falha de conexão com PostgreSQL')
    );

    const { functionResponse, record } = await GeminiToolDispatcher.execute({
      name: 'criarMovimentacaoFinanceira',
      args: { tipo: 'expense', valor: 50, descricao: 'Teste' },
    }, { role: 'administrator', enforced: true });

    expect(functionResponse.response.output.success).toBe(false);
    expect(record.success).toBe(false);
    expect(record.error).toBe('Falha de conexão com PostgreSQL');
  });
});
