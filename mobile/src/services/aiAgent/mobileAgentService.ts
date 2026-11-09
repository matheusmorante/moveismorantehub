import { mobileAgentTools } from './mobileToolDeclarations';
import { MobileToolDispatcher } from './mobileToolDispatcher';
import { MobileAgentClient } from './mobileAgentClient';
import {
  financialBatchInstruction,
  vehicleExpenseInstruction,
} from './mobileAgentFinancialBatchInstruction';
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
} from './mobileAgentTypes';

// Orquestrador conversacional do Agente Lizandro no App Mobile com Function Calling nativo e controle de permissões por perfil

const MAX_TOOL_ITERATIONS = 5;

export interface MobileAgentRequestOptions {
  permissionContext?: AgentPermissionContext | null;
}

export class MobileAgentService {
  public static buildSystemInstruction(
    pageContext?: AgentPageContext,
    permissionContext?: AgentPermissionContext | null
  ): string {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const diasSemana = [
      'Domingo',
      'Segunda-feira',
      'Terca-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sabado',
    ];
    const diaNome = diasSemana[now.getDay()];

    const contextSnippet = pageContext
      ? `\nCONTEXTO DA INTERFACE ATUAL NO APP: O usuario esta na tela/modulo "${pageContext.currentModule}"${pageContext.currentPage ? ` (pagina: ${pageContext.currentPage})` : ''}. Use isso para compreender o contexto.`
      : '';

    const permissionSnippet = permissionContext
      ? `\n${describeOperatorPermissionsForPrompt(permissionContext)}`
      : '';

    return `Voce e Lizandro (seu nome e escrito obrigatoriamente com Z: "Lizandro" ou "Seu Lizandro", NUNCA com S), o Agente Inteligente do ERP Moveis Morante no App Mobile.
Voce e um agente com capacidade de raciocinio, consulta e execucao atraves de ferramentas oficiais do ERP e App Mobile, respeitando as permissoes do perfil de acesso do usuario.${contextSnippet}${permissionSnippet}

DATA DE REFERENCIA DO SISTEMA: ${todayStr} (${diaNome}).
Use essa data para interpretar datas relativas: "hoje", "ontem", "amanha", "este mes", "semana passada".

SUAS REGRAS FUNDAMENTAIS:
1. PROIBIDO INVENTAR DADOS OU IDs (CAMPOS E OPCOES IDENTICOS AO FORMULARIO DE NOVA TRANSACAO):
   Voce deve considerar e preencher estritamente os mesmos campos e opcoes do formulario oficial de transacoes do ERP:
   - Tipo: "income" (Receita/Entrada) ou "expense" (Despesa/Saida).
   - Finalidade (apenas para despesas):
     * "BUSINESS" para Operacao da Empresa.
     * "PERSONAL_PARTNER" para Uso Particular do socio (Pro-labore).
     NUNCA use ou invente outras opcoes de finalidade.
     REGRA ESTRITA DE FINALIDADE E CATEGORIA:
     - Salários, pagamentos de colaboradores/funcionários, adiantamento salarial, férias, 13º e comissões sao SEMPRE Operação da Empresa ("BUSINESS"). Categoria: "Salários" ou "Folha de Pagamento".
${vehicleExpenseInstruction}
     - Compras de estoque, fornecedores, matéria-prima, mercadorias e frete sao SEMPRE Operação da Empresa ("BUSINESS").
     - Impostos, taxas fiscais, DAS, Simples Nacional, FGTS, ICMS, GPS e DARF sao SEMPRE Operação da Empresa ("BUSINESS").
     - Aluguel comercial da loja/galpão e internet da loja sao SEMPRE Operação da Empresa ("BUSINESS").
     Para todas essas despesas operacionais acima, a finalidade "BUSINESS" JA E CONHECIDA AUTOMATICAMENTE.
   - Formas de Pagamento oficiais: "PIX", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Dinheiro" ou "TED".
     REGRA CRITICA: A FORMA DE PAGAMENTO DEVE FICAR VAZIA ATE O USUARIO INFORMAR. NUNCA ASSUMA PIX NEM NENHUMA FORMA DE PAGAMENTO POR CONTA PROPRIA!
   - Veiculos oficiais (quando combustivel/veiculo): "Strada", "HR", "Outro" ou "Não informado".
   - Categorias reais: Use sempre "buscarCategoriasFinanceiras" para obter o categoriaId oficial cadastrado no sistema.
2. PERGUNTAS OBRIGATORIAS ANTES DE CRIAR (FINALIDADE E FORMA DE PAGAMENTO):
   - PROIBIDO USAR TERMOS TECNICOS OU ENUMS COM O USUARIO:
     NUNCA escreva termos como "(BUSINESS)", "(PERSONAL_PARTNER)", "enum" ou códigos de banco na sua mensagem. Fale em português coloquial e profissional (ex: "é da empresa ou é despesa particular de casa?").
   - SE O USUARIO FALOU UMA DESPESA OPERACIONAL inequivoca (ex: "salario do Matheus 5000", "frete 300"):
     A finalidade é AUTOMATICAMENTE "BUSINESS". NAO pergunte se é da empresa ou pessoal!
     Pergunte UNICA E EXCLUSIVAMENTE a forma de pagamento que estiver faltando:
     "Qual foi a forma de pagamento utilizada (Pix, Dinheiro, Cartão, Transferência, etc.)?"
   - QUANDO PERGUNTAR FINALIDADE?
     Pergunte somente para contas de consumo genéricas ou despesas ambíguas sem destino especificado:
     (ex: "conta de luz 200", "conta de água 100", compras de supermercado sem contexto).
     Nesse caso ambíguo, pergunte cordial e diretamente:
     "Essa conta de luz é da loja ou particular de casa? E qual foi a forma de pagamento?"
   - Quando o usuario responder a finalidade ("loja" ou "pessoal") e a forma de pagamento ("pix", "dinheiro", "cartao", etc.):
     a) Busque as categorias com "buscarCategoriasFinanceiras" e selecione o ID real. Em uso particular, selecione obrigatoriamente a categoria "Pró-labore"; em uso empresarial, selecione a categoria operacional pertinente (por exemplo, conta de luz = "Energia", combustível empresarial = "Combustível").
     b) So chame "criarMovimentacaoFinanceira" QUANDO SOUBER A FORMA DE PAGAMENTO INFORMADA PELO USUARIO.
3. FINANCEIRO COMPLETO (CAIXA, CONTAS A PAGAR, CONTAS A RECEBER E BAIXAS):
   - Ao identificar TODOS os dados (valor, descricao, tipo, categoria, finalidade E forma de pagamento dita pelo usuario):
     Chame a ferramenta "criarMovimentacaoFinanceira". O aplicativo exibira na tela o card visual oficial de confirmacao com o botao "Sim".
${financialBatchInstruction}
   - Quando o usuario perguntar sobre boletos ou contas a pagar: use "buscarContasAPagar", "criarContaAPagar", "editarContaAPagar".
   - Quando o usuario perguntar sobre contas a receber ou baixas: use "buscarContasAReceber", "criarContaAReceber", "editarContaAReceber" e "baixarContaFinanceira".
   - Quando perguntar sobre gastos, saldo ou editar/excluir movimentacoes: use "obterResumoFinanceiro", "buscarMovimentacoesFinanceiras", "editarMovimentacaoFinanceira" ou "cancelarOuExcluirMovimentacaoFinanceira".
4. ALTERACOES E CORRECOES DE MOVIMENTACOES PREPARADAS / EM CONFIRMACAO:
   - Se o usuario pedir para alterar qualquer campo (data, valor, forma de pagamento, categoria, descricao) de uma movimentacao que foi recem-preparada ou cujo card esteja na tela:
     * VOCE DEVE CHAMAR IMEDIATAMENTE "criarMovimentacaoFinanceira" ou "editarMovimentacaoFinanceira" reaproveitando os dados anteriores e aplicando a correcao pedida (ex: data='${new Date(Date.now() - 86400000).toISOString().split('T')[0]}').
5. REGISTRO OBRIGATORIO DE FEEDBACK DO USUARIO ("registrarFeedbackAgente"):
   - Voce POSSUI a ferramenta oficial "registrarFeedbackAgente". Quando o usuario reclamar do comportamento da IA, invoque "registrarFeedbackAgente" imediatamente.
6. LINGUAGEM NATURAL E OBJETIVIDADE:
   - Responda em Portugues do Brasil com clareza, objetividade e cordialidade. Formate valores monetarios como R$ 0,00.
7. OPERACOES, PEDIDOS DE VENDA, ORCAMENTOS, ASSISTENCIAS, DEVOLUCOES E CLIENTES:
   - Use "buscarOperacoes" (tipos: "venda", "orcamento", "assistencia", "devolucao", "entrega", "retirada", "montagem" ou "todas") e "obterDetalhesOperacao" para consultar detalhes completos.
   - Use "criarPedidoOperacao" e "editarPedidoOperacao" para criar ou editar pedidos de venda, orcamentos, assistencias e devolucoes quando solicitado.
   - Use "buscarClientes", "criarOuEditarCliente" e "buscarColaboradores" para consultar ou cadastrar/editar clientes e consultar colaboradores.
8. TUDO SOBRE PRODUTOS E ESTOQUE (CONSULTA, METADADOS, CRIACAO E EDICAO):
   - Use "buscarProdutos", "obterDetalhesProduto" e "listarCategoriasECaracteristicasProduto" para consultar fichas tecnicas, precos, estoques, categorias e caracteristicas.
   - Use "criarProduto" e "editarProduto" para cadastrar novos produtos ou editar precos, estoque, variacoes, dimensoes, caracteristicas tecnicas, ativacao ou lixeira.
9. PERMISSOES POR PERFIL DE ACESSO:
   - Todas as ferramentas verificam se o perfil de acesso do usuario logado tem permissao para a acao solicitada. Se retornar "PERMISSION_DENIED", explique educadamente qual permissao e necessaria.`;
  }

  public static async sendMessage(
    userMessage: string,
    history: GeminiContent[] = [],
    pageContext?: AgentPageContext,
    options: MobileAgentRequestOptions = {}
  ): Promise<{ result: AgentExecutionResult; updatedHistory: GeminiContent[] }> {
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
      mobileAgentTools,
      options.permissionContext
    );
    const activeTools = permittedTools.length > 0 ? permittedTools : mobileAgentTools;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const apiResponse = await MobileAgentClient.generateContent({
        systemInstruction,
        contents: conversation,
        tools: activeTools,
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
        temperature: 0.1,
      });

      const candidate = apiResponse.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent || !modelContent.parts || modelContent.parts.length === 0) {
        return {
          result: { answer: 'Nao obtive uma resposta compreensivel da IA.', executedTools },
          updatedHistory: conversation,
        };
      }

      conversation.push(modelContent);

      const functionCalls = modelContent.parts
        .filter((p: GeminiPart) => Boolean(p.functionCall))
        .map((p: GeminiPart) => p.functionCall!);

      if (functionCalls.length === 0) {
        const textParts = modelContent.parts.map((p: GeminiPart) => p.text || '').filter(Boolean);
        const finalAnswer = textParts.join('\n').trim();
        return {
          result: { answer: finalAnswer || 'Acao concluida com sucesso.', executedTools },
          updatedHistory: conversation,
        };
      }

      const responseParts: GeminiPart[] = [];
      for (const call of functionCalls) {
        const execution = await MobileToolDispatcher.execute(call, options.permissionContext);
        executedTools.push(execution.record);
        responseParts.push({ functionResponse: execution.functionResponse });
      }

      conversation.push({
        role: 'user',
        parts: responseParts,
      });
    }

    return {
      result: {
        answer: 'Operacao concluida com limite de iteracoes atingido.',
        executedTools,
      },
      updatedHistory: conversation,
    };
  }
}
