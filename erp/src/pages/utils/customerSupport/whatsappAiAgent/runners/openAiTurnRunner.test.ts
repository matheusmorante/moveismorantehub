import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleBuscarProdutos, handleObterDetalhesProduto } from '../tools/catalogTools.js';
import { whatsappAgentToolDeclarations } from '../tools/declarations.js';

const executeSafeTool = vi.hoisted(() => vi.fn());
vi.mock('../whatsappAiAgentTools.js', () => ({ executeSafeTool }));

import { executeOpenAiTurnLoop } from './openAiTurnRunner.js';

const response = (body: any) => ({
  ok: true,
  json: async () => ({ ...body, usage: { input_tokens: 10, output_tokens: 10, ...body.usage } }),
}) as Response;

const baseOptions = () => ({
  fetchOpenAi: vi.fn() as unknown as typeof fetch,
  apiKey: 'test-key',
  model: 'gpt-6-luna',
  systemInstructionText: 'Atendimento MoranteHub',
  historyMessages: [{ role: 'user' as const, content: 'oi' }],
  tools: [{ name: 'buscarProdutos', description: 'Busca produtos', parameters: {} }],
  supabase: { rpc: vi.fn().mockImplementation(async (name: string) => name === 'customer_support_reserve_ai_quota'
    ? { data: { allowed: true, reservation_id: 'reservation-1' }, error: null }
    : { data: { log_id: 'log-1', reservation_committed: true }, error: null }) } as any,
  toolContext: { conversationId: 'conversation-1', contactPhone: '41999998888' },
});

describe('loop de ferramentas OpenAI do atendimento', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia todas as ferramentas reais com esquemas estritos compatíveis com a Responses API', async () => {
    const options = baseOptions();
    options.historyMessages = [{ role: 'user', content: 'Quais mesas vocês têm?' }];
    options.tools = whatsappAgentToolDeclarations;
    const fetchOpenAi = vi.fn().mockResolvedValue(response({ output_text: 'Posso verificar as mesas disponíveis.', output: [] }));
    options.fetchOpenAi = fetchOpenAi as unknown as typeof fetch;

    await executeOpenAiTurnLoop(options);

    const requestBody = JSON.parse(String(fetchOpenAi.mock.calls[0][1]?.body));
    expect(requestBody.tools).toHaveLength(whatsappAgentToolDeclarations.length);
    for (const tool of requestBody.tools) {
      expect(tool.strict).toBe(true);
      expect(tool.parameters.type).toBe('object');
      expect(tool.parameters.additionalProperties).toBe(false);
      expect([...tool.parameters.required].sort()).toEqual(Object.keys(tool.parameters.properties).sort());
      for (const property of Object.values(tool.parameters.properties) as Array<{ type: string | string[] }>) {
        const types = Array.isArray(property.type) ? property.type : [property.type];
        expect(types.every((type) => ['string', 'boolean', 'integer', 'number', 'null'].includes(type))).toBe(true);
      }
    }
    const search = requestBody.tools.find((tool: any) => tool.name === 'buscarProdutos');
    expect(search.parameters.properties.termo.type).toEqual(['string', 'null']);
    expect(search.parameters.properties.apenasEmEstoque.type).toEqual(['boolean', 'null']);
    expect(search.parameters.properties.limite.type).toEqual(['integer', 'null']);
    const handoff = requestBody.tools.find((tool: any) => tool.name === 'encaminharParaAtendimentoHumano');
    expect(handoff.parameters.properties.silencioso.type).toEqual(['boolean', 'null']);
  });

  it('responde a uma saudação sem reabrir ferramentas do assunto anterior', async () => {
    const options = baseOptions();
    const fetchOpenAi = vi.fn().mockResolvedValue(response({
      output_text: 'Oi! Você ainda quer ajuda com o balcão para pia Florença?',
      output: [
        {
          type: 'function_call',
          name: 'buscarProdutos',
          call_id: 'call-1',
          arguments: '{"termo":"balcão para pia Florença"}',
        },
      ],
      usage: {},
    }));
    options.fetchOpenAi = fetchOpenAi as unknown as typeof fetch;

    const result = await executeOpenAiTurnLoop(options);

    expect(result.text).toContain('Você ainda quer ajuda');
    expect(executeSafeTool).not.toHaveBeenCalled();
    const requestBody = JSON.parse(String(fetchOpenAi.mock.calls[0][1]?.body));
    expect(requestBody.tools).toBeUndefined();
  });

  it('deixa a resposta vazia quando falha ao responder uma saudação para permitir o handoff do pipeline', async () => {
    const options = baseOptions();
    options.historyMessages = [{ role: 'user', content: 'oi' }];
    options.fetchOpenAi = vi.fn().mockResolvedValue(response({ output: [] })) as unknown as typeof fetch;

    const result = await executeOpenAiTurnLoop(options);

    expect(result.text).toBe('');
  });

  it('envia o histórico recente e as regras de continuidade para interpretar um follow-up', async () => {
    const options = baseOptions();
    options.historyMessages = [
      { role: 'user', content: 'Quero uma pia de 1,20 na cor branca.' },
      { role: 'assistant', content: 'Vou procurar pias nessa medida e cor.' },
      { role: 'user', content: 'E o balcão dela?' },
    ];
    const fetchOpenAi = vi.fn().mockResolvedValue(response({ output_text: 'Vou procurar o balcão para pia nessa medida e cor.', output: [] }));
    options.fetchOpenAi = fetchOpenAi as unknown as typeof fetch;

    await executeOpenAiTurnLoop(options);

    const requestBody = JSON.parse(String(fetchOpenAi.mock.calls[0][1]?.body));
    expect(requestBody.input.map((message: any) => message.content[0].text)).toEqual(
      options.historyMessages.map(({ content }) => content)
    );
    expect(requestBody.instructions).toContain('"pia" pede a categoria Pias');
    expect(requestBody.instructions).toContain('"e o balcão dela?"');
  });

  it('encaminha para um atendente quando uma ferramenta falha sem devolver erro ao cliente', async () => {
    const options = baseOptions();
    options.historyMessages = [{ role: 'user', content: 'Procure balcão para pia Florença' }];
    const fetchOpenAi = vi
      .fn()
      .mockResolvedValueOnce(response({
        output: [
          {
            type: 'function_call',
            name: 'buscarProdutos',
            call_id: 'call-1',
            arguments: '{"termo":"balcão para pia Florença"}',
          },
          {
            type: 'function_call',
            name: 'buscarProdutos',
            call_id: 'call-2',
            arguments: '{ "termo": "balcão para pia Florença" }',
          },
        ],
        usage: {},
      }))
      .mockResolvedValueOnce(response({ output: [], usage: {} }));
    options.fetchOpenAi = fetchOpenAi as unknown as typeof fetch;
    executeSafeTool
      .mockResolvedValueOnce({
      success: false,
      code: 'DATABASE_ERROR',
      erro: 'Não consegui consultar os produtos agora.',
      })
      .mockResolvedValueOnce({ success: true, silentHandoff: true, motivo: 'Falha na consulta.' });

    const result = await executeOpenAiTurnLoop(options);

    expect(result.text).toBe('Atendimento encaminhado à equipe.');
    expect(result.handoffConfirmed).toBe(true);
    expect(result.toolsCalled).toContain('encaminharParaAtendimentoHumano');
    expect(fetchOpenAi).toHaveBeenCalledTimes(1);
    expect(executeSafeTool).toHaveBeenCalledTimes(2);
    expect(executeSafeTool.mock.calls[1][1]).toBe('encaminharParaAtendimentoHumano');
    expect(executeSafeTool.mock.calls[1][2]).toMatchObject({ silencioso: true });
  });

  it('encaminha para um atendente quando a busca não encontra produtos', async () => {
    const options = baseOptions();
    options.historyMessages = [{ role: 'user', content: 'Balcão para pia' }];
    const fetchOpenAi = vi.fn().mockResolvedValue(response({
      output: [{
        type: 'function_call',
        name: 'buscarProdutos',
        call_id: 'search-call',
        arguments: '{"termo":"balcão para pia","enviarCartoes":true}',
      }],
    }));
    options.fetchOpenAi = fetchOpenAi as unknown as typeof fetch;
    executeSafeTool
      .mockResolvedValueOnce({ success: true, total: 0, produtos: [] })
      .mockResolvedValueOnce({ success: true, silentHandoff: true });

    const result = await executeOpenAiTurnLoop(options);

    expect(result.handoffConfirmed).toBe(true);
    expect(result.toolsCalled).toContain('encaminharParaAtendimentoHumano');
    expect(fetchOpenAi).toHaveBeenCalledTimes(1);
    expect(executeSafeTool.mock.calls[1][1]).toBe('encaminharParaAtendimentoHumano');
  });

  it('conclui busca seguida de detalhes sem sugerir o produto incompatível', async () => {
    const options = baseOptions();
    options.historyMessages = [{ role: 'user', content: 'Procure balcão para pia Florença' }];
    const fetchOpenAi = vi
      .fn()
      .mockResolvedValueOnce(response({
        output: [{
          type: 'function_call',
          name: 'buscarProdutos',
          call_id: 'search-call',
          arguments: '{"termo":"balcão para pia Florença","apenasEmEstoque":false}',
        }],
        usage: {},
      }))
      .mockResolvedValueOnce(response({
        output: [{
          type: 'function_call',
          name: 'obterDetalhesProduto',
          call_id: 'details-call',
          arguments: '{"codigoOuSku":"000217"}',
        }],
        usage: {},
      }))
      .mockResolvedValueOnce(response({
        output_text: 'Encontrei o balcão para pia Florença, código 000217. Posso confirmar a disponibilidade para você.',
        output: [],
        usage: {},
      }));
    options.fetchOpenAi = fetchOpenAi as unknown as typeof fetch;

    const exactProduct = {
      code: '000217',
      sku: '000217',
      name: 'Balcão para Pia de 1,20m 3 Gavetas 100% MDF Florença',
      title: null,
      description: 'Balcão 100% MDF',
      category: 'Cozinhas',
      brand: 'Morante',
      line: 'Florença',
      unit_price: 499,
      stock: 1,
      product_variations: [],
    };
    const incompatibleProduct = {
      ...exactProduct,
      code: '004055',
      sku: '004055',
      name: 'Florença - Balcão Canto Oblíquo em Madeira MDF Angelin/Cinza',
    };
    let productQueryCount = 0;
    const makeQuery = (data: unknown) => {
      const query: Record<string, any> = {};
      for (const method of ['select', 'eq', 'gt', 'or', 'order', 'filter', 'is']) {
        query[method] = vi.fn(() => query);
      }
      query.limit = vi.fn(() => Promise.resolve({ data, error: null }));
      query.maybeSingle = vi.fn(() => Promise.resolve({ data, error: null }));
      return query;
    };
    const supabase = {
      rpc: vi.fn().mockImplementation(async (name: string) => name === 'customer_support_reserve_ai_quota'
        ? { data: { allowed: true, reservation_id: 'reservation-1' }, error: null }
        : { data: { log_id: 'log-1', reservation_committed: true }, error: null }),
      from: vi.fn((table: string) => {
        if (table === 'product_variations') return makeQuery([]);
        productQueryCount += 1;
        return productQueryCount === 1
          ? makeQuery([incompatibleProduct, exactProduct])
          : makeQuery(exactProduct);
      }),
    };
    executeSafeTool.mockImplementation(async (_client, name, args, toolContext) => {
      if (name === 'buscarProdutos') return handleBuscarProdutos(supabase as any, args, toolContext);
      if (name === 'obterDetalhesProduto') return handleObterDetalhesProduto(supabase as any, args, toolContext);
      return { success: false, code: 'UNKNOWN_TOOL' };
    });
    const executedResults: any[] = [];

    const result = await executeOpenAiTurnLoop({
      ...options,
      supabase: supabase as any,
      onToolExecuted: (_name, _args, toolResult) => executedResults.push(toolResult),
    });

    expect(result.text).toContain('balcão para pia Florença');
    expect(result.toolsCalled).toEqual(['buscarProdutos', 'obterDetalhesProduto']);
    expect(executedResults[0].produtos.map((product: any) => product.codigo)).toEqual(['000217']);
    expect(executedResults[1].produto.codigo).toBe('000217');
    expect(JSON.stringify(executedResults)).not.toContain('004055');
    expect(fetchOpenAi).toHaveBeenCalledTimes(3);
  });

  it('confere a cota novamente antes de cada rodada e interrompe a segunda quando o limite é atingido', async () => {
    const options = baseOptions();
    options.historyMessages = [{ role: 'user', content: 'Procure uma mesa' }];
    const fetchOpenAi = vi.fn().mockResolvedValueOnce(response({ output: [{ type: 'function_call',
      name: 'buscarProdutos', call_id: 'call-1', arguments: '{"termo":"mesa"}' }] }));
    options.fetchOpenAi = fetchOpenAi as unknown as typeof fetch;
    let reservations = 0;
    options.supabase.rpc = vi.fn().mockImplementation(async (name: string) => {
      if (name === 'customer_support_reserve_ai_quota') return { data: ++reservations === 1
        ? { allowed: true, reservation_id: 'reservation-1' }
        : { allowed: false, reason: 'Limite atingido' }, error: null };
      return { data: { log_id: 'log-1', reservation_committed: true }, error: null };
    });
    executeSafeTool.mockImplementation(async (_client, name) => name === 'encaminharParaAtendimentoHumano'
      ? { success: true } : { success: true, total: 1, produtos: [{ codigo: '000001' }] });

    const result = await executeOpenAiTurnLoop(options);

    expect(reservations).toBe(2);
    expect(fetchOpenAi).toHaveBeenCalledTimes(1);
    expect(result.quotaBlockedResult?.quotaBlocked).toBe(true);
    expect(result.handoffConfirmed).toBe(true);
  });

  it('interrompe o turno quando a transferência humana não é confirmada', async () => {
    const options = baseOptions();
    options.historyMessages = [{ role: 'user', content: 'Calcule o frete' }];
    options.fetchOpenAi = vi.fn().mockResolvedValue(response({ output: [{ type: 'function_call',
      name: 'calcularFreteOuDistancia', call_id: 'call-1', arguments: '{}' }] })) as unknown as typeof fetch;
    executeSafeTool.mockResolvedValue({ success: false, silentHandoff: false });

    await expect(executeOpenAiTurnLoop(options)).rejects.toThrow('transferência humana não pôde ser confirmada');
  });
});
