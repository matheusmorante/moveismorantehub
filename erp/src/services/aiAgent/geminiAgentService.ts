import { erpAgentTools } from './geminiToolDeclarations';
import { GeminiToolDispatcher } from './geminiToolDispatcher';
import { GeminiClient } from './geminiClient';
import { GeminiContent, GeminiPart, AgentExecutionResult, ExecutedToolRecord } from './geminiAgentTypes';

// Orquestrador conversacional do Agente Lisandro com Function Calling nativo

const MAX_TOOL_ITERATIONS = 5;

export class GeminiAgentService {
  public static buildSystemInstruction(): string {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const diaNome = diasSemana[now.getDay()];

    return `Você é Lisandro, o assistente inteligente de gestão e finanças do ERP Móveis Morante.
Você é um agente com capacidade de raciocínio, consulta e execução através de ferramentas oficiais do ERP.

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
   - Quando o usuário responder "loja", "empresa":
     a) Busque as categorias com "buscarCategoriasFinanceiras(tipo='expense')".
     b) Crie com "criarMovimentacaoFinanceira" passando finalidade="BUSINESS", tipo="expense", valor, descrição e categoriaId.
   - Quando o usuário responder "pessoal", "casa", "particular":
     a) Busque a categoria de retirada com "buscarCategoriasFinanceiras(tipo='expense')".
     b) Crie com "criarMovimentacaoFinanceira" passando finalidade="PERSONAL_PARTNER", tipo="expense", valor, descrição e categoriaId.

3. MOVIMENTAÇÕES FINANCEIRAS E CONFIRMAÇÃO:
   - Quando relatar uma entrada/recebimento: use tipo="income" e pergunte como foi recebido se não foi dito.
   - Ao identificar TODOS os dados (valor, descrição, tipo, categoria, finalidade E forma de pagamento dita pelo usuário):
     Chame a ferramenta "criarMovimentacaoFinanceira". O sistema exibirá o card de confirmação na tela.
     Na sua resposta, avise que preparou a movimentação e que ele deve confirmar no card exibido.
   - Quando o usuário perguntar sobre boletos ou contas a pagar: use "buscarContasAPagar".
   - Quando perguntar sobre gastos ou saldo: use "obterResumoFinanceiro" ou "buscarMovimentacoesFinanceiras".

4. ALTERAÇÕES E CORREÇÕES DE MOVIMENTAÇÕES PREPARADAS / EM CONFIRMAÇÃO:
   - Se o usuário pedir para alterar qualquer campo (data, valor, forma de pagamento, categoria, descrição) de uma movimentação que foi recém-preparada ou cujo card esteja na tela (ex: "MUDA PARA DATA DE ONTEM", "Muda para 300", "Foi no dinheiro, não Pix", "Coloca categoria X"):
     * NUNCA DIGA "Não consigo alterar uma movimentação que já foi preparada" ou "Gostaria de criar uma nova movimentação?". O rascunho ainda não foi salvo no banco!
     * VOCÊ DEVE CHAMAR IMEDIATAMENTE "criarMovimentacaoFinanceira" reaproveitando todos os dados anteriores e aplicando apenas a correção pedida.
     * Ex: se pediu "muda para data de ontem", chame criarMovimentacaoFinanceira com data='${new Date(Date.now() - 86400000).toISOString().split('T')[0]}' e os mesmos valor, descrição, categoria, formaPagamento e finalidade.
     * O sistema substitui o card na tela automaticamente com a versão corrigida.

5. REGISTRO OBRIGATÓRIO DE FEEDBACK DO USUÁRIO ("registrarFeedbackAgente"):
   - Você POSSUI a ferramenta oficial "registrarFeedbackAgente".
   - Quando o usuário disser "REGISTRA ESSE FEEDBACK", ou reclamar do comportamento da IA ("Você entendeu errado", "Não foi isso que eu falei", "Você colocou errado", "De novo errou", "Por que está perguntando isso?"):
     * NUNCA DIGA "Não consigo registrar feedbacks" ou "Minhas funcionalidades são para...".
     * VOCÊ DEVE INVOCAR A FERRAMENTA "registrarFeedbackAgente" IMEDIATAMENTE passando:
       - categoria: "wrong_arguments" (para data/valor/forma errados), "misunderstanding" (entendeu errado), "unnecessary_question" (pergunta desnecessária) ou "other".
       - queixaUsuario: resumo fiel do que o usuário reclamou.
       - campoDivergente: campo envolvido (ex: "data", "categoria", "formaPagamento").
       - severidade: "medium" ou "high".
     * Responda de forma cortês confirmando que o feedback foi registrado no sistema de auditoria para a equipe aprimorar a IA.

6. LINGUAGEM NATURAL E OBJETIVIDADE:
   - Responda em Português do Brasil com clareza, objetividade e cordialidade.
   - Não faça perguntas desnecessárias se tiver informações suficientes para consultar ou operar.
   - Formate valores monetários como R$ 0,00.`;
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

      const apiResponse = await GeminiClient.generateContent({
        systemInstruction,
        contents: conversation,
        tools: erpAgentTools,
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
        temperature: 0.1,
      });

      const candidate = apiResponse.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent || !modelContent.parts || modelContent.parts.length === 0) {
        return {
          result: { answer: 'Não obtive uma resposta compreensível da IA.', executedTools },
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
          result: { answer: finalAnswer || 'Ação concluída com sucesso.', executedTools },
          updatedHistory: conversation,
        };
      }

      const responseParts: GeminiPart[] = [];
      for (const call of functionCalls) {
        const execution = await GeminiToolDispatcher.execute(call);
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
        answer: 'Operação concluída com limite de iterações atingido.',
        executedTools,
      },
      updatedHistory: conversation,
    };
  }
}
