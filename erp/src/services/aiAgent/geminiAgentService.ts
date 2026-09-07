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
2. FINALIDADE DA DESPESA (LOJA VS. PESSOAL) - REGRA OBRIGATÓRIA:
   - FINALIDADE AUTOMÁTICA (NÃO PERGUNTE SE É DA LOJA OU PESSOAL):
     * Salários, pagamentos de funcionários/colaboradores, adiantamento salarial, férias, 13º e comissões são SEMPRE Operação da Empresa ("BUSINESS").
     * Combustível, abastecimento e manutenção de veículos operacionais são SEMPRE Operação da Empresa ("BUSINESS").
     * Compras de estoque, mercadorias para revenda, insumos, fornecedores e fretes são SEMPRE Operação da Empresa ("BUSINESS").
     * Impostos, taxas fiscais, DAS, Simples Nacional, FGTS, ICMS e tributos são SEMPRE Operação da Empresa ("BUSINESS").
     Para todas essas despesas, a finalidade "BUSINESS" já é certa: pergunte apenas a forma de pagamento se não informada.
   - QUANDO PERGUNTAR FINALIDADE?
     Pergunte SOMENTE E EXCLUSIVAMENTE para despesas de consumo genéricas sem destino claro (conta de luz/energia, água, internet da residência, compras gerais de mercado).
     NUNCA use termos técnicos como "(BUSINESS)" ou "(PERSONAL_PARTNER)" na sua mensagem. Fale naturalmente: "Essa conta de luz é da loja ou particular de casa?".
   - Quando o usuário responder "loja", "empresa", "da loja":
     a) Busque as categorias com "buscarCategoriasFinanceiras(tipo='expense')".
     b) Crie com "criarMovimentacaoFinanceira" passando finalidade="BUSINESS", tipo="expense", valor, descrição e categoriaId.
   - Quando o usuário responder "pessoal", "casa", "particular", "minha":
     a) Busque a categoria de retirada com "buscarCategoriasFinanceiras(tipo='expense')" (ex: Retirada de Sócio / Distribuição de Lucros ou Pró-labore).
     b) Crie com "criarMovimentacaoFinanceira" passando finalidade="PERSONAL", tipo="expense", valor, descrição e categoriaId.
3. MOVIMENTAÇÕES FINANCEIRAS:
   - Quando relatar uma entrada/recebimento: use tipo="income".
   - Quando perguntar sobre gastos ou saldo ("quanto gastamos este mês?", "mostra as saídas de ontem"): use "obterResumoFinanceiro" ou "buscarMovimentacoesFinanceiras".
4. CORREÇÕES E CONTEXTO:
   - Compreenda correções contextuais naturais. Se o usuário disser "na verdade foi 250" ou "foi no dinheiro", associe à operação anterior e utilize a ferramenta adequada.
   - Se o usuário responder apenas "loja", "empresa", "pessoal", "casa", entenda o contexto da pergunta anterior sobre a finalidade da despesa.
5. LINGUAGEM NATURAL E OBJETIVIDADE:
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
