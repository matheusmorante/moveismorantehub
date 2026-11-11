import { describe, it, expect, vi } from 'vitest';
import {
  checkAgentToolPermission,
  describeOperatorPermissionsForPrompt,
  canAgentViewProductCost,
  filterAgentToolsByPermission,
} from '../../../../../shared-utils/agentPermissionGuard';
import { getAgentOperationSearchTypes } from '../../../../../shared-utils/agentOperationPermissions';
import {
  createOrderOperationForAgent,
  updateOrderOperationForAgent,
  upsertCustomerForAgent,
  parseScheduleTimes,
  normalizeDeliveryMethod,
} from '../../../../../shared-utils/agentOrderAndPeopleOperations';
import { erpAgentTools } from '../geminiToolDeclarations';
import {
  createProductForAgent,
  listProductCategoriesAndCharacteristicsForAgent,
  updateProductForAgent,
  sanitizeRawDbProductForAgent,
} from '../../../../../shared-utils/agentProductOperations';

describe('Extended Agent Tools & Profile Permission Guard (ERP & Mobile Parity)', () => {
  it('verifica permissões de perfil (role + rolePermissions) para Financeiro, Pedidos/Orçamentos/Assistências/Devoluções e Produtos', () => {
    // 1. Administrador tem acesso total
    expect(
      checkAgentToolPermission(
        'criarMovimentacaoFinanceira',
        {},
        { role: 'administrator', enforced: true }
      ).allowed
    ).toBe(true);
    expect(
      checkAgentToolPermission(
        'criarPedidoOperacao',
        { tipoOperacao: 'orcamento' },
        { role: 'administrator', enforced: true }
      ).allowed
    ).toBe(true);
    expect(
      checkAgentToolPermission('criarProduto', {}, { role: 'administrator', enforced: true })
        .allowed
    ).toBe(true);

    // 2. Estoquista (stockist): pode consultar produtos e ajustar estoque, mas não pode operar Financeiro nem criar Pedidos
    expect(
      checkAgentToolPermission('buscarProdutos', {}, { role: 'stockist', enforced: true }).allowed
    ).toBe(true);
    expect(
      checkAgentToolPermission(
        'editarProduto',
        { codigoOuSku: '000010', estoque: 15 },
        { role: 'stockist', enforced: true }
      ).allowed
    ).toBe(true);
    expect(
      checkAgentToolPermission(
        'criarMovimentacaoFinanceira',
        {},
        { role: 'stockist', enforced: true }
      ).allowed
    ).toBe(false);
    expect(
      checkAgentToolPermission(
        'criarPedidoOperacao',
        { tipoOperacao: 'venda' },
        { role: 'stockist', enforced: true }
      ).allowed
    ).toBe(false);

    // 3. Vendedor (seller) com matriz rolePermissions liberando Orçamentos e Pedidos
    const sellerWithCustomPerms = {
      role: 'seller',
      rolePermissions: {
        viewOrders: ['manager', 'seller'],
        createEditOrders: ['manager', 'seller'],
        viewBudgets: ['manager', 'seller'],
      },
      enforced: true,
    };
    expect(
      checkAgentToolPermission(
        'criarPedidoOperacao',
        { tipoOperacao: 'orcamento' },
        sellerWithCustomPerms
      ).allowed
    ).toBe(true);
    expect(
      checkAgentToolPermission(
        'buscarOperacoes',
        { tipo: 'orcamento' },
        sellerWithCustomPerms
      ).allowed
    ).toBe(true);
    expect(
      checkAgentToolPermission('baixarContaFinanceira', {}, sellerWithCustomPerms).allowed
    ).toBe(false);

    const promptDesc = describeOperatorPermissionsForPrompt(sellerWithCustomPerms);
    expect(promptDesc).toContain('PERFIL DE ACESSO DO OPERADOR ATUAL');
    expect(promptDesc).toContain('Orçamentos (consulta)');
  });

  it('cria e edita Pedido de Venda, Orçamento, Assistência e Devolução com dados estruturados', async () => {
    const insertedOrders: any[] = [];
    const updatedOrders: any[] = [];

    const mockSupabase = {
      from: (table: string) => {
        if (table === 'products') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: {
                        id: 'prod-uuid-1',
                        code: '000123',
                        sku: '000123',
                        name: 'Guarda-Roupa 6 Portas',
                        unit_price: 1800,
                        cost_price: 950,
                      },
                    }),
                }),
              }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: insertedOrders[0] || {
                        id: 'ord-uuid-1',
                        status: 'draft',
                        order_data: {
                          orderNumber: '123456',
                          orderType: 'budget',
                          customerData: { fullName: 'Ana Paula' },
                          items: [],
                          payments: [],
                        },
                      },
                      error: null,
                    }),
                }),
              }),
            }),
            insert: (rows: any[]) => {
              const row = { id: 'ord-uuid-1', ...rows[0] };
              insertedOrders.push(row);
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: row, error: null }),
                }),
              };
            },
            update: (patch: any) => {
              const row = { ...(insertedOrders[0] || {}), id: 'ord-uuid-1', ...patch };
              updatedOrders.push(row);
              return {
                eq: () => Promise.resolve({ data: row, error: null }),
              };
            },
          };
        }
        return {};
      },
    };

    const createdBudget = await createOrderOperationForAgent(mockSupabase, {
      tipoOperacao: 'orcamento',
      clienteNome: 'Ana Paula',
      itens: [{ codigoOuSku: '000123', nome: 'Guarda-Roupa 6 Portas', quantidade: 2 }],
    });

    expect(createdBudget.tipo).toBe('orçamento');
    expect(createdBudget.status).toBe('quoted');
    expect(createdBudget.valorTotal).toBe(3600);

    const editedToSale = await updateOrderOperationForAgent(mockSupabase, {
      pedidoId: '11111111-1111-4111-8111-111111111111',
      tipoOperacao: 'venda',
      status: 'scheduled',
      dataAgendamento: '2026-11-20',
    });

    expect(editedToSale.tipo).toBe('pedido de venda');
    expect(editedToSale.status).toBe('scheduled');
    expect(updatedOrders.length).toBe(1);
  });

  it('cria e edita cliente em people', async () => {
    const mockSupabase = {
      from: () => ({
        insert: (rows: any[]) => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: 'cust-1', ...rows[0] },
                error: null,
              }),
          }),
        }),
      }),
    };

    const res = await upsertCustomerForAgent(mockSupabase, {
      nome: 'Carlos Eduardo',
      telefone: '41999998888',
      cidade: 'Curitiba',
    });

    expect(res.acao).toBe('criado');
    expect(res.nome).toBe('Carlos Eduardo');
    expect(res.cidade).toBe('Curitiba');
  });

  it('alinha contratos de parâmetros: normaliza modalidadeEntrega, horário agendado, pagamentos e endereço do cliente', async () => {
    let capturedOrder: any = null;
    let capturedPerson: any = null;

    const mockSupabase = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            insert: (rows: any[]) => {
              capturedOrder = rows[0];
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: 'ord-100', ...rows[0] }, error: null }),
                }),
              };
            },
          };
        }
        if (table === 'people') {
          return {
            insert: (rows: any[]) => {
              capturedPerson = rows[0];
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: 'person-100', ...rows[0] }, error: null }),
                }),
              };
            },
          };
        }
        return {};
      },
    };

    // 1. Criação de pedido com parâmetros conforme declaração do agente
    const orderRes = await createOrderOperationForAgent(mockSupabase, {
      tipoOperacao: 'venda',
      clienteNome: 'Mariana Lima',
      modalidadeEntrega: 'entrega',
      horarioAgendamento: 'Manhã',
      dataAgendamento: '2026-11-25',
      descontoTotal: 80,
      itens: [
        {
          descricao: 'Mesa de Jantar 6 Cadeiras',
          quantidade: 1,
          precoUnitario: 1200,
        },
      ],
      pagamentos: [
        {
          metodo: 'PIX',
          valor: 1120,
          parcelas: 1,
        },
      ],
    });

    expect(orderRes.tipo).toBe('pedido de venda');
    expect(capturedOrder.delivery_method).toBe('delivery');
    expect(capturedOrder.scheduled_start_time).toBe('08:00');
    expect(capturedOrder.scheduled_end_time).toBe('12:00');
    expect(capturedOrder.total_discount).toBe(80);
    expect(capturedOrder.order_data.items[0].description).toBe('Mesa de Jantar 6 Cadeiras');
    expect(capturedOrder.order_data.payments[0].method).toBe('PIX');

    // 2. Cadastro de cliente com rua, estado e ativo=false
    await upsertCustomerForAgent(mockSupabase, {
      nome: 'Mariana Lima',
      rua: 'Avenida Sete de Setembro',
      estado: 'pr',
      ativo: false,
    });

    expect(capturedPerson.full_address.street).toBe('Avenida Sete de Setembro');
    expect(capturedPerson.full_address.state).toBe('PR');
    expect(capturedPerson.active).toBe(false);
  });

  it('lista categorias/características, cria e edita produto sem expor IDs internos do banco e respeitando deleted=true na Lixeira', async () => {
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'categories') {
          return {
            select: () => ({
              order: () => ({
                range: () =>
                  Promise.resolve({
                    data: [{ name: 'Sofás', is_environment: false, active: true }],
                  }),
              }),
            }),
          };
        }
        if (table === 'product_characteristics') {
          return {
            select: () => ({
              order: () => ({
                range: () =>
                  Promise.resolve({
                    data: [
                      {
                        name: 'Material da estrutura',
                        group_name: 'Estrutura',
                        field_type: 'select',
                        options: ['Eucalipto', 'Pinus'],
                      },
                    ],
                  }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [{ code: '000050', sku: '000050' }] }),
              }),
              or: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'internal-uuid-prod-51',
                      code: '000051',
                      sku: '000051',
                      name: 'Sofá Retrátil 3 Lugares',
                      category: 'Sofás',
                      brand: 'Morante',
                      unit_price: 2500,
                      price: 2500,
                      stock: 4,
                      active: true,
                      deleted: false,
                      product_variations: [
                        {
                          id: 'internal-uuid-var-1',
                          product_id: 'internal-uuid-prod-51',
                          sku: '000051-01',
                          name: 'Sofá Retrátil 3 Lugares',
                          price: 2500,
                          stock: 4,
                          active: true,
                        },
                      ],
                    },
                    error: null,
                  }),
              }),
            }),
            insert: (rows: any[]) => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'internal-uuid-prod-51',
                      ...rows[0],
                    },
                    error: null,
                  }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        id: 'internal-uuid-prod-51',
                        code: '000051',
                        sku: '000051',
                        name: patch.name || 'Sofá Retrátil 3 Lugares',
                        category: 'Sofás',
                        unit_price: patch.unit_price ?? 2500,
                        price: patch.price ?? 2500,
                        stock: patch.stock ?? 4,
                        active: patch.active ?? true,
                        deleted: patch.deleted ?? false,
                        product_variations: [],
                      },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        if (table === 'product_variations') {
          return {
            insert: (rows: any[]) => ({
              select: () => Promise.resolve({ data: rows }),
            }),
            update: (patch: any) => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: () => Promise.resolve({ data: patch }),
                }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const meta = await listProductCategoriesAndCharacteristicsForAgent(mockSupabase);
    expect(meta.success).toBe(true);
    expect(meta.data?.categorias[0].nome).toBe('Sofás');
    expect(meta.data?.caracteristicas[0].nome).toBe('Material da estrutura');

    const created = await createProductForAgent(mockSupabase, {
      nome: 'Sofá Retrátil 3 Lugares',
      categoria: 'Sofás',
      marca: 'Morante',
      precoVenda: 2500,
      estoque: 4,
    });
    expect(created.success).toBe(true);
    expect(created.data?.codigo).toBe('000051');
    expect((created.data as any).id).toBeUndefined();
    expect((created.data?.variacoes[0] as any).id).toBeUndefined();
    expect((created.data?.variacoes[0] as any).product_id).toBeUndefined();

    const trashed = await updateProductForAgent(mockSupabase, {
      codigoOuSku: '000051',
      moverParaLixeira: true,
    });
    expect(trashed.success).toBe(true);
    expect(trashed.data?.naLixeira).toBe(true);
    expect((trashed.data as any).id).toBeUndefined();
  });

  it('pagina categorias e características no servidor e não simula sucesso quando uma página falha', async () => {
    const rangeCalls = new Map<string, number[]>();
    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          order: () => ({
            range: vi.fn((from: number, _to: number) => {
              const calls = rangeCalls.get(table) || [];
              calls.push(from);
              rangeCalls.set(table, calls);
              if (table === 'categories') {
                return Promise.resolve({
                  data: from === 0
                    ? Array.from({ length: 200 }, (_, index) => ({ name: `Categoria ${index}` }))
                    : [{ name: 'Categoria 200' }],
                  error: null,
                });
              }
              return Promise.resolve({
                data: [{ name: 'Material', group_name: 'Estrutura' }],
                error: null,
              });
            }),
          }),
        }),
      }),
    };

    const result = await listProductCategoriesAndCharacteristicsForAgent(mockSupabase);
    expect(result.success).toBe(true);
    expect(result.data?.categorias).toHaveLength(201);
    expect(rangeCalls.get('categories')).toEqual([0, 200]);
    expect(rangeCalls.get('product_characteristics')).toEqual([0]);

    const failingSupabase = {
      from: () => ({
        select: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: null, error: new Error('db internal') }),
          }),
        }),
      }),
    };
    const failure = await listProductCategoriesAndCharacteristicsForAgent(failingSupabase);
    expect(failure.success).toBe(false);
    expect(failure.code).toBe('PRODUCT_METADATA_ERROR');
  });

  it('impede vazamento de preço de custo (viewProductCost) e bloqueia tentativas indevidas com fail-closed', () => {
    // 1. Entregador (deliverer): pode consultar entregas, mas não criar pedidos nem produtos nem financeiro
    const delivererCtx = { role: 'deliverer', enforced: true };
    expect(checkAgentToolPermission('buscarPedidosEntregas', {}, delivererCtx).allowed).toBe(true);
    expect(checkAgentToolPermission('obterDetalhesPedidoEntrega', {}, delivererCtx).allowed).toBe(true);
    expect(checkAgentToolPermission('criarPedidoOperacao', {}, delivererCtx).allowed).toBe(false);
    expect(checkAgentToolPermission('criarProduto', {}, delivererCtx).allowed).toBe(false);
    expect(checkAgentToolPermission('criarMovimentacaoFinanceira', {}, delivererCtx).allowed).toBe(false);

    // 2. Usuário sem perfis ativos: bloqueio imediato (fail-closed)
    const emptyCtx = { roles: [], enforced: true };
    const emptyCheck = checkAgentToolPermission('buscarProdutos', {}, emptyCtx);
    expect(emptyCheck.allowed).toBe(false);
    expect(emptyCheck.code).toBe('PERMISSION_DENIED');

    // 3. Redação de preço de custo para vendedor e entregador sem permissão viewProductCost
    const sellerCtx = { role: 'seller', enforced: true };
    expect(canAgentViewProductCost(sellerCtx)).toBe(false);

    const rawProduct = {
      id: 'p-1',
      code: '000088',
      name: 'Mesa de Centro',
      price: 600,
      cost_price: 320,
      product_variations: [
        { id: 'v-1', name: 'Mesa Off-White', price: 600, cost_price: 320 },
      ],
    };

    const sanitizedForSeller = sanitizeRawDbProductForAgent(rawProduct, false);
    expect(sanitizedForSeller.precos.precoCusto).toBeUndefined();
    expect(sanitizedForSeller.variacoes[0].precoCusto).toBeUndefined();

    // Administrador tem permissão viewProductCost
    const adminCtx = { role: 'administrator', enforced: true };
    expect(canAgentViewProductCost(adminCtx)).toBe(true);
    const sanitizedForAdmin = sanitizeRawDbProductForAgent(rawProduct, true);
    expect(sanitizedForAdmin.precos.precoCusto).toBe(320);
    expect(sanitizedForAdmin.variacoes[0].precoCusto).toBe(320);

    // 4. Falha segura (fail-closed) para estoquista e contexto ausente
    const stockistCtx = { role: 'stockist', enforced: true };
    expect(canAgentViewProductCost(stockistCtx)).toBe(false);
    expect(canAgentViewProductCost(null)).toBe(false);
    expect(canAgentViewProductCost(undefined)).toBe(false);
  });

  it('impede entregador de acessar operações gerais, vendas ou detalhes fora da logística', () => {
    const delivererCtx = { role: 'deliverer', enforced: true };

    // Bloqueia buscarOperacoes geral e vendas
    expect(checkAgentToolPermission('buscarOperacoes', { tipo: 'todas' }, delivererCtx).allowed).toBe(true);
    expect(getAgentOperationSearchTypes('todas', delivererCtx)).toEqual(['entrega', 'retirada', 'montagem']);
    expect(checkAgentToolPermission('buscarOperacoes', { tipo: 'venda' }, delivererCtx).allowed).toBe(false);
    expect(checkAgentToolPermission('buscarOperacoes', { tipo: 'orcamento' }, delivererCtx).allowed).toBe(false);

    // Bloqueia detalhes de operações comerciais
    expect(checkAgentToolPermission('obterDetalhesOperacao', { operacaoId: 'ord-123' }, delivererCtx).allowed).toBe(false);

    // Permite apenas entregas e rotas
    expect(checkAgentToolPermission('buscarOperacoes', { tipo: 'entrega' }, delivererCtx).allowed).toBe(true);
    expect(checkAgentToolPermission('buscarPedidosEntregas', {}, delivererCtx).allowed).toBe(true);
    expect(checkAgentToolPermission('obterDetalhesPedidoEntrega', { pedidoId: 'ord-123' }, delivererCtx).allowed).toBe(true);
  });

  it('filtra ferramentas dinamicamente por perfil de acesso para envio à IA (Least Privilege)', () => {
    // Para entregador: ferramentas financeiras e de cadastro de pedidos/produtos devem ser removidas
    const delivererCtx = { role: 'deliverer', enforced: true };
    const filteredDeliverer = filterAgentToolsByPermission(erpAgentTools, delivererCtx);
    const declNamesDeliverer = filteredDeliverer[0].functionDeclarations.map((d) => d.name);

    expect(declNamesDeliverer).toContain('buscarPedidosEntregas');
    expect(declNamesDeliverer).toContain('obterDetalhesPedidoEntrega');
    expect(declNamesDeliverer).toContain('registrarFeedbackAgente');
    expect(declNamesDeliverer).not.toContain('criarMovimentacaoFinanceira');
    expect(declNamesDeliverer).not.toContain('buscarContasAPagar');
    expect(declNamesDeliverer).not.toContain('criarProduto');
    expect(declNamesDeliverer).not.toContain('criarPedidoOperacao');

    // Para administrador: todas as 28 ferramentas oficiais devem estar presentes
    const adminCtx = { role: 'administrator', enforced: true };
    const filteredAdmin = filterAgentToolsByPermission(erpAgentTools, adminCtx);
    const declNamesAdmin = filteredAdmin[0].functionDeclarations.map((d) => d.name);
    expect(declNamesAdmin).toHaveLength(28);
  });

  it('bloqueia cancelamento comercial quando houver NF-e ativa na SEFAZ (Invariante Fiscal)', async () => {
    const orderMockSelect = {
      eq: () => orderMockSelect,
      or: () => orderMockSelect,
      limit: () => orderMockSelect,
      maybeSingle: () =>
        Promise.resolve({
          data: {
            id: '99999999-9999-4999-8999-999999999999',
            order_number: '10999',
            order_type: 'sale',
            status: 'scheduled',
            order_data: { orderNumber: '10999', orderType: 'sale' },
          },
          error: null,
        }),
    };

    const nfeMockSelect = {
      or: () => nfeMockSelect,
      in: () => nfeMockSelect,
      limit: () =>
        Promise.resolve({
          data: [
            {
              id: 'nfe-doc-1',
              numero_nfe: '450',
              serie: '1',
              modelo: '55',
              status: 'autorizada',
              chave_acesso: '41261100000000000000550010000004501000000010',
            },
          ],
          error: null,
        }),
    };

    const mockSupabaseWithActiveNfe = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => orderMockSelect,
          };
        }
        if (table === 'nfe_documents') {
          return {
            select: () => nfeMockSelect,
          };
        }
        return {};
      },
    };

    await expect(
      updateOrderOperationForAgent(mockSupabaseWithActiveNfe, {
        pedidoId: '99999999-9999-4999-8999-999999999999',
        status: 'cancelled',
      })
    ).rejects.toThrow(/possui NF-e modelo 55 autorizada.*cancelamento fiscal ou estorno da NF-e/);

    // Variações de linguagem natural: "cancelar", "cancela", "cancelamento" acionam o mesmo bloqueio fiscal
    await expect(
      updateOrderOperationForAgent(mockSupabaseWithActiveNfe, {
        pedidoId: '99999999-9999-4999-8999-999999999999',
        status: 'cancelar',
      })
    ).rejects.toThrow(/possui NF-e modelo 55 autorizada/);

    await expect(
      updateOrderOperationForAgent(mockSupabaseWithActiveNfe, {
        pedidoId: '99999999-9999-4999-8999-999999999999',
        status: 'cancelamento',
      })
    ).rejects.toThrow(/possui NF-e modelo 55 autorizada/);
  });

  it('normaliza parâmetros comerciais de pedidos (modalidades, turnos de agendamento e descontos)', () => {
    // Normalização de modalidade
    expect(normalizeDeliveryMethod('retirada')).toBe('pickup');
    expect(normalizeDeliveryMethod('loja')).toBe('pickup');
    expect(normalizeDeliveryMethod('balcão')).toBe('pickup');
    expect(normalizeDeliveryMethod('entrega')).toBe('delivery');
    expect(normalizeDeliveryMethod(undefined)).toBe('delivery');

    // Turnos e horários
    expect(parseScheduleTimes('manha')).toEqual({ startTime: '08:00', endTime: '12:00' });
    expect(parseScheduleTimes('tarde')).toEqual({ startTime: '13:00', endTime: '18:00' });
    expect(parseScheduleTimes('14 às 16')).toEqual({ startTime: '14:00', endTime: '16:00' });
    expect(parseScheduleTimes('09:30 - 11:30')).toEqual({ startTime: '09:30', endTime: '11:30' });
  });
});
