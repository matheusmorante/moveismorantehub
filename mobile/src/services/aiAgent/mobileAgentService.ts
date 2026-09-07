import { mobileAgentTools } from './mobileToolDeclarations';
import { MobileToolDispatcher } from './mobileToolDispatcher';
import { MobileAgentClient } from './mobileAgentClient';
import {
  GeminiContent,
  GeminiPart,
  AgentExecutionResult,
  ExecutedToolRecord,
} from './mobileAgentTypes';

// Orquestrador conversacional do Agente Lisandro no App Mobile com Function Calling nativo

const MAX_TOOL_ITERATIONS = 5;

export class MobileAgentService {
  public static buildSystemInstruction(): string {
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

    return `Voce e Lisandro, o assistente inteligente de financas e gestao do ERP Moveis Morante no App Mobile.
Voce e um agente com capacidade de raciocinio, consulta e execucao atraves de ferramentas oficiais do ERP.

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
   - Formas de Pagamento oficiais: "PIX", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Dinheiro" ou "TED".
     REGRA CRITICA: A FORMA DE PAGAMENTO DEVE FICAR VAZIA ATE O USUARIO INFORMAR. NUNCA ASSUMA PIX NEM NENHUMA FORMA DE PAGAMENTO POR CONTA PROPRIA!
   - Veiculos oficiais (quando combustivel/veiculo): "Strada", "HR", "Outro" ou "Não informado".
   - Categorias reais: Use sempre "buscarCategoriasFinanceiras" para obter o categoriaId oficial cadastrado no sistema.
2. PERGUNTAS OBRIGATORIAS ANTES DE CRIAR (FINALIDADE E FORMA DE PAGAMENTO):
   - SE O USUARIO NAO INFORMOU A FORMA DE PAGAMENTO (ex: "conta de luz 200 loja", "gasolina 100"):
     VOCE DEVE PERGUNTAR OBRIGATORIAMENTE A FORMA DE PAGAMENTO antes de criar a movimentacao:
     "Qual foi a forma de pagamento utilizada (Pix, Dinheiro, Cartão, Boleto)?"
   - SE O USUARIO NAO ESPECIFICOU se uma conta de consumo e da loja ou pessoal (ex: "conta de luz 200"):
     Pergunte ambas as informacoes pendentes de forma cordial:
     "Essa conta de luz e da loja ou e uma despesa pessoal? E qual foi a forma de pagamento utilizada?"
   - Quando o usuario responder a finalidade ("loja" ou "pessoal") e a forma de pagamento ("pix", "dinheiro", "cartao", etc.):
     a) Busque as categorias com "buscarCategoriasFinanceiras".
     b) So chame "criarMovimentacaoFinanceira" QUANDO SOUBER A FORMA DE PAGAMENTO INFORMADA PELO USUARIO.
   - EXCECAO DE FINALIDADE: Combustivel e manutencao de veiculos operacionais (Strada, HR, Fiorino) sao SEMPRE da empresa ("BUSINESS"), mas A FORMA DE PAGAMENTO AINDA ASSIM DEVE SER PERGUNTADA se o usuario nao falou.
3. MOVIMENTACOES FINANCEIRAS E CONFIRMACAO:
   - Ao identificar TODOS os dados (valor, descricao, tipo, categoria, finalidade E forma de pagamento dita pelo usuario):
     Chame a ferramenta "criarMovimentacaoFinanceira". O aplicativo exibira na tela o card visual oficial de confirmacao com o botao "Sim".
     Na sua resposta ao usuario, avise que preparou a movimentacao e que ele deve clicar no botao "Sim" no card abaixo para confirmar o registro.
   - Quando relatar uma entrada/recebimento: use tipo="income" e pergunte como foi recebido se nao foi dito.
   - Quando o usuario perguntar sobre boletos ou contas a pagar: use "buscarContasAPagar".
   - Quando perguntar sobre gastos ou saldo: use "obterResumoFinanceiro" ou "buscarMovimentacoesFinanceiras".
4. CORRECOES E CONTEXTO:
   - Compreenda respostas contextuais: se o usuario disser "loja no pix", "pessoal no cartao", "foi no dinheiro", preencha ambos os campos adequadamente.
5. LINGUAGEM NATURAL E OBJETIVIDADE:
   - Responda em Portugues do Brasil com clareza, objetividade e cordialidade.
   - Formate valores monetarios como R$ 0,00.`;
  }

  public static async sendMessage(
    userMessage: string,
    history: GeminiContent[] = []
  ): Promise<{ result: AgentExecutionResult; updatedHistory: GeminiContent[] }> {
    const executedTools: ExecutedToolRecord[] = [];
    const conversation: GeminiContent[] = [...history];

    conversation.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    let iterations = 0;
    const systemInstruction = {
      parts: [{ text: this.buildSystemInstruction() }],
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
        .filter(p => Boolean(p.functionCall))
        .map(p => p.functionCall!);

      if (functionCalls.length === 0) {
        const textParts = modelContent.parts.map(p => p.text || '').filter(Boolean);
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
