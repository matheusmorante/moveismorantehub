import { mobileAgentTools } from './mobileToolDeclarations';
import { MobileToolDispatcher } from './mobileToolDispatcher';
import { MobileAgentClient } from './mobileAgentClient';
import {
  GeminiContent,
  GeminiPart,
  AgentExecutionResult,
  ExecutedToolRecord,
  AgentPageContext,
} from './mobileAgentTypes';

// Orquestrador conversacional do Agente Lisandro no App Mobile com Function Calling nativo

const MAX_TOOL_ITERATIONS = 5;

export class MobileAgentService {
  public static buildSystemInstruction(pageContext?: AgentPageContext): string {
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

    return `Voce e Lisandro, o Agente Inteligente do ERP Moveis Morante no App Mobile.
Voce e um agente com capacidade de raciocinio, consulta e execucao atraves de ferramentas oficiais do ERP.${contextSnippet}

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
     REGRA ESTRITA DE FINALIDADE AUTOMATICA (NUNCA PERGUNTE SE E PESSOAL OU DA EMPRESA):
     - Salários, pagamentos de colaboradores/funcionários, adiantamento salarial, férias, 13º e comissões sao SEMPRE Operação da Empresa ("BUSINESS"). Categoria: "Salários" ou "Folha de Pagamento".
     - Combustível, abastecimento e manutenção de veículos operacionais (Strada, HR, frete) sao SEMPRE Operação da Empresa ("BUSINESS").
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
   - SE O USUARIO FALOU UMA DESPESA OPERACIONAL (ex: "salario do Matheus 5000", "gasolina 100", "frete 300"):
     A finalidade é AUTOMATICAMENTE "BUSINESS". NAO pergunte se é da empresa ou pessoal!
     Pergunte UNICA E EXCLUSIVAMENTE a forma de pagamento que estiver faltando:
     "Qual foi a forma de pagamento utilizada (Pix, Dinheiro, Cartão, Transferência, etc.)?"
   - QUANDO PERGUNTAR FINALIDADE?
     Pergunte SOMENTE E EXCLUSIVAMENTE para contas de consumo genéricas ou despesas ambíguas sem destino especificado:
     (ex: "conta de luz 200", "conta de água 100", compras de supermercado sem contexto).
     Nesse caso ambíguo, pergunte cordial e diretamente:
     "Essa conta de luz é da loja ou particular de casa? E qual foi a forma de pagamento?"
   - Quando o usuario responder a finalidade ("loja" ou "pessoal") e a forma de pagamento ("pix", "dinheiro", "cartao", etc.):
     a) Busque as categorias com "buscarCategoriasFinanceiras".
     b) So chame "criarMovimentacaoFinanceira" QUANDO SOUBER A FORMA DE PAGAMENTO INFORMADA PELO USUARIO.
3. MOVIMENTACOES FINANCEIRAS E CONFIRMACAO:
   - Ao identificar TODOS os dados (valor, descricao, tipo, categoria, finalidade E forma de pagamento dita pelo usuario):
     Chame a ferramenta "criarMovimentacaoFinanceira". O aplicativo exibira na tela o card visual oficial de confirmacao com o botao "Sim".
     Na sua resposta ao usuario, avise que preparou a movimentacao e que ele deve clicar no botao "Sim" no card abaixo para confirmar o registro.
   - Quando relatar uma entrada/recebimento: use tipo="income" e pergunte como foi recebido se nao foi dito.
   - Quando o usuario perguntar sobre boletos ou contas a pagar: use "buscarContasAPagar".
   - Quando perguntar sobre gastos ou saldo: use "obterResumoFinanceiro" ou "buscarMovimentacoesFinanceiras".
4. ALTERACOES E CORRECOES DE MOVIMENTACOES PREPARADAS / EM CONFIRMACAO:
   - Se o usuario pedir para alterar qualquer campo (data, valor, forma de pagamento, categoria, descricao) de uma movimentacao que foi recem-preparada ou cujo card esteja na tela (ex: "MUDA PARA DATA DE ONTEM", "Muda para 300", "Foi no dinheiro, nao Pix", "Coloca categoria X"):
     * NUNCA DIGA "Nao consigo alterar uma movimentacao que ja foi preparada" ou "Gostaria de criar uma nova movimentacao?". O rascunho ainda nao foi salvo no banco!
     * VOCE DEVE CHAMAR IMEDIATAMENTE "criarMovimentacaoFinanceira" reaproveitando os dados anteriores e aplicando a correcao pedida (ex: se pediu "muda para data de ontem", chame criarMovimentacaoFinanceira com data='${new Date(Date.now() - 86400000).toISOString().split('T')[0]}' e os mesmos valor, descricao, categoria, formaPagamento e finalidade).
     * O aplicativo substitui o card na tela automaticamente com a versao corrigida.
5. REGISTRO OBRIGATORIO DE FEEDBACK DO USUARIO ("registrarFeedbackAgente"):
   - Voce POSSUI a ferramenta oficial "registrarFeedbackAgente".
   - Quando o usuario disser "REGISTRA ESSE FEEDBACK", ou reclamar do comportamento da IA ("Voce entendeu errado", "Nao foi isso que eu falei", "Voce colocou errado", "De novo errou", "Por que esta perguntando isso?"):
     * NUNCA DIGA "Nao consigo registrar feedbacks" ou "Minhas funcionalidades sao para...".
     * VOCE DEVE INVOCAR A FERRAMENTA "registrarFeedbackAgente" IMEDIATAMENTE passando:
       - categoria: "wrong_arguments" (para data/valor/forma errados), "misunderstanding" (entendeu errado), "unnecessary_question" (pergunta desnecessaria) ou "other".
       - queixaUsuario: resumo fiel do que o usuario reclamou.
       - campoDivergente: campo envolvido (ex: "data", "categoria", "formaPagamento").
       - severidade: "medium" ou "high".
     * Responda de forma cortez confirmando que o feedback foi registrado no sistema de auditoria para a equipe aprimorar a IA.
6. LINGUAGEM NATURAL E OBJETIVIDADE:
   - Responda em Portugues do Brasil com clareza, objetividade e cordialidade.
   - Formate valores monetarios como R$ 0,00.
7. ESCOPO ATUAL E LIMITACAO DE EXECUCAO:
   - Nesta etapa, voce possui ferramentas oficiais de consulta e execucao EXCLUSIVAMENTE para o modulo Financeiro (fluxo de caixa, despesas, receitas e contas a pagar).
   - Se o usuario solicitar acoes para outros modulos (como alterar estoque, pedidos, entregas, montagens ou clientes):
     * Compreenda educadamente a solicitacao.
     * Responda de forma clara, elegante e direta: "Essa acao ainda nao esta disponivel para mim."
     * NUNCA invente ferramentas, alucine dados ou simule operacoes nao suportadas.`;
  }

  public static async sendMessage(
    userMessage: string,
    history: GeminiContent[] = [],
    pageContext?: AgentPageContext
  ): Promise<{ result: AgentExecutionResult; updatedHistory: GeminiContent[] }> {
    const executedTools: ExecutedToolRecord[] = [];
    const conversation: GeminiContent[] = [...history];

    conversation.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    let iterations = 0;
    const systemInstruction = {
      parts: [{ text: this.buildSystemInstruction(pageContext) }],
    };

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const apiResponse = await MobileAgentClient.generateContent({
        systemInstruction,
        contents: conversation,
        tools: mobileAgentTools,
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
        const execution = await MobileToolDispatcher.execute(call);
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
