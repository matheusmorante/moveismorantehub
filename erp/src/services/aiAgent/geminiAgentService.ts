import { erpAgentTools } from './geminiToolDeclarations';
import { GeminiToolDispatcher } from './geminiToolDispatcher';
import { GeminiClient } from './geminiClient';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { agentContentSchema } from '../../../../shared-utils/agentChatFormSchemas';
import { createAgentToolCallGuard } from '../../../../shared-utils/agentToolCallGuard';
import {
  AgentPermissionContext,
  describeOperatorPermissionsForPrompt,
  filterAgentToolsByPermission,
} from '../../../../shared-utils/agentPermissionGuard';
import {
  GeminiContent,
  GeminiPart,
  AgentExecutionResult,
  ExecutedToolRecord,
  AgentPageContext,
} from './geminiAgentTypes';

// Orquestrador conversacional do Agente Lizandro com Function Calling nativo e controle de permissões por perfil

const MAX_TOOL_ITERATIONS = 5;

export interface AgentRequestOptions {
  signal?: AbortSignal;
  isCurrent?: () => boolean;
  onToolDispatch?: () => void;
  permissionContext?: AgentPermissionContext | null;
}

export class AgentRequestError extends Error {
  constructor(message: string, public readonly knownFailure: boolean) {
    super(message);
  }
}

export class GeminiAgentService {
  public static buildSystemInstruction(
    pageContext?: AgentPageContext,
    permissionContext?: AgentPermissionContext | null
  ): string {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const diasSemana = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    const diaNome = diasSemana[now.getDay()];

    const contextSnippet = pageContext
      ? `\nCONTEXTO DA INTERFACE ATUAL: O operador está na tela/módulo "${pageContext.currentModule}"${pageContext.currentPage ? ` (página: ${pageContext.currentPage})` : ''}. Use isso para compreender o contexto do usuário.`
      : '';

    const permissionSnippet = permissionContext
      ? `\n${describeOperatorPermissionsForPrompt(permissionContext)}`
      : '';

    return `Você é Lizandro (seu nome é escrito obrigatoriamente com Z: "Lizandro" ou "Seu Lizandro", NUNCA com S), o Agente Geral e Inteligente do ERP Móveis Morante.
Você é um agente com capacidade de raciocínio, consulta e execução através de ferramentas oficiais do ERP, respeitando rigorosamente as permissões do perfil de acesso do usuário.${contextSnippet}${permissionSnippet}

DATA DE REFERÊNCIA DO SISTEMA: ${todayStr} (${diaNome}).
Use essa data para interpretar datas relativas: "hoje", "ontem", "amanhã", "este mês", "semana passada".

SUAS REGRAS FUNDAMENTAIS:
1. PROIBIDO INVENTAR DADOS OU IDs:
   Campos oficiais de uma movimentação financeira:
   - Tipo: "income" (Receita/Entrada) ou "expense" (Despesa/Saída).
   - Finalidade (apenas para despesas): "BUSINESS" (Operação da Empresa) ou "PERSONAL_PARTNER" (Pró-labore/Uso Particular).
     NUNCA invente ou use outras opções de finalidade.
   - Formas de Pagamento oficiais: "PIX", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Dinheiro" ou "TED".
     REGRA CRÍTICA: A FORMA DE PAGAMENTO DEVE FICAR VAZIA ATÉ O USUÁRIO INFORMAR. NUNCA ASSUMA PIX NEM NENHUMA FORMA DE PAGAMENTO POR CONTA PRÓPRIA!
   - Categorias reais: Use sempre "buscarCategoriasFinanceiras" para obter o categoriaId oficial cadastrado no sistema.

2. FINALIDADE DA DESPESA — REGRA DE FINALIDADE AUTOMÁTICA (NÃO PERGUNTE SE É DA LOJA OU PESSOAL):
   - Salários, pagamentos de funcionários/colaboradores, adiantamento salarial, férias, 13º e comissões são SEMPRE Operação da Empresa ("BUSINESS"). Categoria: "Salários" ou "Folha de Pagamento".
   - Combustível, abastecimento e manutenção de veículos operacionais são SEMPRE Operação da Empresa ("BUSINESS").
   - Compras de estoque, mercadorias para revenda, insumos, fornecedores e fretes são SEMPRE Operação da Empresa ("BUSINESS").
   - Impostos, taxas fiscais, DAS, Simples Nacional, FGTS, ICMS e tributos são SEMPRE Operação da Empresa ("BUSINESS").
   - Aluguel comercial da loja/galpão e internet da loja são SEMPRE Operação da Empresa ("BUSINESS").
   Para todas essas despesas operacionais, a finalidade "BUSINESS" JÁ É CONHECIDA AUTOMATICAMENTE.
   Pergunte APENAS a forma de pagamento se ainda não informada.
   - QUANDO PERGUNTAR FINALIDADE?
     Somente para despesas de consumo genéricas ou ambíguas sem destino claro:
     (ex: "conta de luz 200", "conta de água", compras de supermercado sem contexto).
     Nesse caso, pergunte de forma natural: "Essa conta de luz é da loja ou particular de casa? E qual foi a forma de pagamento?"
   - NUNCA use termos técnicos como "(BUSINESS)" ou "(PERSONAL_PARTNER)" na sua mensagem. Fale em português coloquial e profissional.

3. FINANCEIRO COMPLETO (CAIXA, CONTAS A PAGAR, CONTAS A RECEBER E BAIXAS):
   - Consultar categorias: "buscarCategoriasFinanceiras".
   - Consultar movimentações e saldo: "buscarMovimentacoesFinanceiras" e "obterResumoFinanceiro".
   - Criar, editar ou excluir movimentação de caixa: "criarMovimentacaoFinanceira", "editarMovimentacaoFinanceira", "cancelarOuExcluirMovimentacaoFinanceira".
   - Consultar, criar, editar e baixar Contas a Pagar e Contas a Receber: "buscarContasAPagar", "criarContaAPagar", "editarContaAPagar", "buscarContasAReceber", "criarContaAReceber", "editarContaAReceber" e "baixarContaFinanceira".

4. ALTERAÇÕES E CORREÇÕES DE MOVIMENTAÇÕES PREPARADAS / CRIADAS:
   - Se o usuário pedir para alterar qualquer campo (data, valor, forma de pagamento, categoria, descrição) de uma movimentação que você acabou de criar ou preparar:
     * VOCÊ DEVE CHAMAR "editarMovimentacaoFinanceira" usando o movimentacaoId retornado.
     * NUNCA chame "criarMovimentacaoFinanceira" novamente para corrigir um dado, pois isso gera lançamentos duplicados no caixa!

5. REGISTRO OBRIGATÓRIO DE FEEDBACK DO USUÁRIO ("registrarFeedbackAgente"):
   - Quando o usuário disser "REGISTRA ESSE FEEDBACK" ou reclamar de erro de interpretação da IA, invoque IMEDIATAMENTE "registrarFeedbackAgente".

6. PEDIDOS DE VENDA, ORÇAMENTOS, ASSISTÊNCIAS, DEVOLUÇÕES E CLIENTES:
   - Consultar operações: use "buscarOperacoes" (tipos: "venda", "orcamento", "assistencia", "devolucao", "entrega", "retirada", "montagem" ou "todas") e "obterDetalhesOperacao" (ou "buscarPedidosEntregas" / "obterDetalhesPedidoEntrega").
   - Criar ou editar pedidos de venda, orçamentos, assistências técnicas e devoluções: use "criarPedidoOperacao" e "editarPedidoOperacao".
   - Consultar, criar ou editar clientes e consultar colaboradores: use "buscarClientes", "criarOuEditarCliente" e "buscarColaboradores".

7. TUDO SOBRE PRODUTOS E ESTOQUE (CONSULTA, METADADOS, CRIAÇÃO E EDIÇÃO):
   - Consultar catálogo e ficha técnica completa: "buscarProdutos", "obterDetalhesProduto" e "listarCategoriasECaracteristicasProduto".
   - Criar ou editar produtos, variações, preços, estoque, dimensões, características técnicas, NCM, ativação ou lixeira: use "criarProduto" e "editarProduto".
   - Nunca invente códigos ou SKUs: pesquise primeiro quando precisar localizar um produto existente antes de detalhar ou editar.

8. PERMISSÕES POR PERFIL DE ACESSO:
   - Todas as ferramentas validam se o perfil de acesso do usuário logado tem permissão para consultar, criar ou editar aquele recurso.
   - Se uma ferramenta retornar código "PERMISSION_DENIED", explique educadamente ao usuário que o perfil de acesso dele não possui permissão para realizar aquela ação específica.
   - Responda sempre em Português do Brasil com clareza, objetividade e valores formatados como R$ 0,00.`;
  }

  public static async sendMessage(
    userMessage: string,
    history: GeminiContent[] = [],
    pageContext?: AgentPageContext,
    options: AgentRequestOptions = {}
  ): Promise<{ result: AgentExecutionResult; updatedHistory: GeminiContent[] }> {
    let toolDispatched = false;
    const startedAt = Date.now();
    const checkCurrent = () => {
      if (
        options.signal?.aborted ||
        options.isCurrent?.() === false ||
        Date.now() - startedAt >= 90_000
      ) {
        throw new AgentRequestError(
          'Consulta interrompida. Confira o resultado das ações já iniciadas antes de repetir.',
          !toolDispatched
        );
      }
    };
    const wait = async <T,>(operation: () => Promise<T>, timeoutMs: number): Promise<T> => {
      checkCurrent();
      const expired = Symbol('expired');
      let onAbort!: () => void;
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () =>
          reject(
            new AgentRequestError(
              'Consulta interrompida. Confira o resultado das ações já iniciadas antes de repetir.',
              !toolDispatched
            )
          );
        options.signal?.addEventListener('abort', onAbort, { once: true });
      });
      try {
        const result = await withTimeout<unknown>(
          Promise.race([operation(), aborted]),
          Math.min(timeoutMs, 90_000 - (Date.now() - startedAt)),
          expired,
          'assistente ERP'
        );
        if (result === expired)
          throw new AgentRequestError(
            'A resposta do assistente excedeu o prazo. Confira as ações já iniciadas antes de repetir.',
            !toolDispatched
          );
        checkCurrent();
        return result as T;
      } finally {
        options.signal?.removeEventListener('abort', onAbort);
      }
    };
    try {
      const executedTools: ExecutedToolRecord[] = [];
      const conversation: GeminiContent[] = [...history];

      conversation.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      let iterations = 0;
      const systemInstruction = {
        parts: [{ text: this.buildSystemInstruction(pageContext, options.permissionContext) }],
      };

      const permittedTools = filterAgentToolsByPermission(
        erpAgentTools,
        options.permissionContext
      );
      const activeTools = permittedTools;
      const toolCallGuard = createAgentToolCallGuard();

      while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;

        const apiResponse = await wait(
          () =>
            GeminiClient.generateContent(
              {
                systemInstruction,
                contents: conversation,
                tools: activeTools,
                toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
                temperature: 0.1,
              },
              {
                signal: options.signal,
                timeoutMs: Math.min(30_000, 90_000 - (Date.now() - startedAt)),
              }
            ),
          30_000
        );

        const candidate = apiResponse.candidates?.[0];
        const modelContent = candidate?.content;

        if (!modelContent || !modelContent.parts || modelContent.parts.length === 0) {
          return {
            result: { answer: 'Não obtive uma resposta compreensível da IA.', executedTools },
            updatedHistory: conversation,
          };
        }

        const contentReceipt = agentContentSchema.safeParse(modelContent);
        if (!contentReceipt.success) throw new Error('A IA retornou uma resposta inválida.');
        const parsedContent = contentReceipt.data;
        conversation.push(parsedContent);

        const functionCalls = parsedContent.parts
          .filter((p) => Boolean(p.functionCall))
          .map((p) => p.functionCall!);

        if (functionCalls.length === 0) {
          const textParts = modelContent.parts.map((p) => p.text || '').filter(Boolean);
          const finalAnswer = textParts.join('\n').trim();
          return {
            result: {
              answer:
                finalAnswer ||
                'O assistente não enviou uma resposta em texto. Confira as ações exibidas.',
              executedTools,
            },
            updatedHistory: conversation,
          };
        }

        const responseParts: GeminiPart[] = [];
        let executedInRound = 0;
        let budgetExceeded = false;
        for (const call of functionCalls) {
          checkCurrent();
          toolDispatched = true;
          options.onToolDispatch?.();
          const guarded = await toolCallGuard.run(call.name, call.args || {}, () =>
            wait(
              () => GeminiToolDispatcher.execute(call, options.permissionContext),
              20_000
            )
          );
          if (guarded.status === 'limit') {
            budgetExceeded = true;
            responseParts.push({
              functionResponse: {
                name: call.name,
                response: {
                  output: {
                    success: false,
                    code: 'TOOL_CALL_LIMIT',
                    message: 'Não consegui concluir a consulta com segurança em uma única mensagem.',
                  },
                },
              },
            });
            continue;
          }
          if (guarded.status === 'executed' && guarded.value) {
            executedInRound += 1;
            executedTools.push(guarded.value.record);
          }
          if (guarded.value) {
            responseParts.push({ functionResponse: guarded.value.functionResponse });
          }
        }

        conversation.push({
          role: 'user',
          parts: responseParts,
        });

        if (budgetExceeded) {
          return {
            result: {
              answer: 'Não consegui concluir essa consulta agora. Tente pedir uma informação mais específica ou posso encaminhar para a equipe.',
              executedTools,
            },
            updatedHistory: conversation,
          };
        }
        if (executedInRound === 0) {
          return {
            result: {
              answer: 'Já consultei essas mesmas informações nesta mensagem. Se ainda precisar, diga qual detalhe quer verificar.',
              executedTools,
            },
            updatedHistory: conversation,
          };
        }
      }

      return {
        result: {
          answer:
            'Consulta interrompida: limite de iterações atingido. Confira as ações exibidas antes de continuar.',
          executedTools,
        },
        updatedHistory: conversation,
      };
    } catch (error) {
      if (error instanceof AgentRequestError) throw error;
      throw new AgentRequestError(
        error instanceof Error ? error.message : 'Falha ao consultar o assistente.',
        !toolDispatched
      );
    }
  }
}
