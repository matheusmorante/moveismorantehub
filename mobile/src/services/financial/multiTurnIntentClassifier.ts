import type { ParsedFinancialIntent, ChatMessage } from './financialTypes';
import { FinancialCategory } from '../mobileFinanceService';
import { trySlotFillingFallback } from './financialSlotFilling';
import { validateParsedIntent } from './financialIntentValidator';
import { TurnIntent } from './voiceConfig';
import { findPurposeDraftTarget } from './financialPurposeReply';

/**
 * Classifica a intenção semântica de um novo turno de fala em relação ao draft e histórico existentes.
 */
export function classifyMultiTurnIntent(
  newText: string,
  activeDraft?: ParsedFinancialIntent | null,
  conversationHistory: ChatMessage[] = []
): TurnIntent {
  const text = newText.toLowerCase().trim();
  if (!text) return 'OTHER';

  // 1. Sinais Fortes de Correção Explicita
  const correctionPattern = /\b(não|nao|na\s+verdade|corrigindo|falei\s+errado|quis\s+dizer|nao\s+era|não\s+era|o\s+valor\s+certo|troca|substitui|desculpa|conferi|muda\s+o\s+valor|mudei)\b/i;
  const isExplicitCorrectionSignal = correctionPattern.test(text);

  // 2. Sinais Fortes de Nova Movimentação Independente
  const newTransactionPattern = /\b(também|tambem|agora|outra\s+coisa|mais\s+uma|depois|e\s+teve|outra\s+compra|nova\s+movimentação|também\s+paguei|também\s+recebi|agora\s+paguei|agora\s+recebi)\b/i;
  const isExplicitNewTx = newTransactionPattern.test(text);

  // 3. Verificar a última mensagem do robô no histórico
  const botMessages = conversationHistory.filter(m => m.sender === 'assistant' || (m.sender as string) === 'bot');
  const lastBotMsg = botMessages.length > 0 ? botMessages[botMessages.length - 1].text.toLowerCase() : '';
  const isBotAskingQuestion = Boolean(
    lastBotMsg && (
      lastBotMsg.includes('?') ||
      lastBotMsg.includes('qual foi') ||
      lastBotMsg.includes('loja ou') ||
      lastBotMsg.includes('débito ou') ||
      lastBotMsg.includes('confirmar')
    )
  );

  // 4. Se houver sinal de nova movimentação e não for correção explícita
  if (isExplicitNewTx && !isExplicitCorrectionSignal) {
    return 'NEW_TRANSACTION';
  }

  // 5. Se o usuário explicitamente usou termos de correção
  if (isExplicitCorrectionSignal) {
    return 'CORRECTION';
  }

  // 6. Se o usuário estiver fornecendo resposta/complemento para um draft ativo
  if (activeDraft) {
    const isAnsweringDestination = /loja|pessoal|casa|escritório|escritorio|minha\s+casa/i.test(text);
    const isAnsweringPayment = /pix|débito|debito|crédito|credito|dinheiro|cartão|cartao|boleto|transferência|transferencia/i.test(text);
    const isAnsweringCreditor = /banco|matheus|lucas|joão|joao|amigo|socio|sócio/i.test(text);
    const isAnsweringAmount = /^\d+(?:[.,]\d+)?$/i.test(text) || /\b(?:reais|centavos|mil|k)\b/i.test(text);

    if (isAnsweringDestination || isAnsweringPayment || isAnsweringCreditor || isAnsweringAmount) {
      return 'ANSWER_TO_QUESTION';
    }
    if (activeDraft.missingFields?.length || activeDraft.questionToUser || isBotAskingQuestion) {
      return 'CONTINUATION';
    }
  }

  // 7. Se existe um draft ativo concluído e o novo texto traz um fato financeiro totalmente independente
  if (activeDraft && activeDraft.isReadyForConfirmation) {
    const hasIndependentFact =
      /\b(paguei|recebi|gastei|comprei|abasteci|coloquei)\b/i.test(text) &&
      !/\b(não|nao|na\s+verdade|corrigindo|falei\s+errado)\b/i.test(text);

    if (hasIndependentFact) {
      // Se menciona um item/categoria totalmente diferente sem termo de correção
      const currentDesc = (activeDraft.description || '').toLowerCase();
      const currentCat = (activeDraft.categoryName || '').toLowerCase();
      const isDifferentItem =
        (text.includes('internet') && !currentDesc.includes('internet') && !currentCat.includes('internet')) ||
        (text.includes('gasolina') && !currentDesc.includes('gasolina') && !currentCat.includes('combustível')) ||
        (text.includes('luz') && !currentDesc.includes('luz') && !currentCat.includes('consumo')) ||
        (text.includes('oficina') && !currentDesc.includes('oficina') && !currentCat.includes('veículos'));

      if (isDifferentItem) {
        return 'NEW_TRANSACTION';
      }
    }
  }

  // Caso padrão: se há draft ativo, tenta continuação/patch; senão nova transação
  return activeDraft ? 'CONTINUATION' : 'NEW_TRANSACTION';
}

/**
 * Aplica o PATCH estruturado em um draft existente ou inicia um novo rascunho de acordo com a classificação do turno.
 */
export function applyTurnPatch(
  activeDraft: ParsedFinancialIntent | null,
  newText: string,
  intent: TurnIntent,
  categories: FinancialCategory[],
  todayStr: string
): { updatedDraft: ParsedFinancialIntent; isNewTransaction: boolean } {
  // Se for nova transação ou não houver draft ativo anterior
  if (intent === 'NEW_TRANSACTION' || !activeDraft) {
    return {
      updatedDraft: {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        description: newText,
        amount: null,
        missingFields: ['amount', 'paymentMethod'],
        confidence: 0.8,
        isReadyForConfirmation: false,
      },
      isNewTransaction: true,
    };
  }

  // Tenta o slot filling estruturado que preserva campos prévios
  const patched = trySlotFillingFallback(newText, activeDraft, todayStr);
  const result = patched || activeDraft;
  const validated = validateParsedIntent(result, todayStr);

  return {
    updatedDraft: validated,
    isNewTransaction: false,
  };
}

/**
 * Aplica PATCH em uma lista de drafts ativos com identificação determinística do draft alvo.
 */
export function applyTurnPatchWithDraftList(
  activeDrafts: ParsedFinancialIntent[],
  newText: string,
  intent: TurnIntent,
  categories: FinancialCategory[],
  todayStr: string = new Date().toISOString().split('T')[0]
): { updatedDrafts: ParsedFinancialIntent[]; isNewTransaction: boolean; targetIndex: number } {
  const lowerText = newText.toLowerCase();

  if (intent === 'NEW_TRANSACTION' || activeDrafts.length === 0) {
    const newDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      description: newText,
      amount: null,
      missingFields: ['amount', 'paymentMethod'],
      confidence: 0.8,
      isReadyForConfirmation: false,
    };
    const validatedNew = validateParsedIntent(newDraft, todayStr);
    return {
      updatedDrafts: [...activeDrafts, validatedNew],
      isNewTransaction: true,
      targetIndex: activeDrafts.length,
    };
  }

  const mentionsSpecificDraft = activeDrafts.some(d => {
    const desc = (d.description || '').toLowerCase();
    return (
      (desc.includes('luz') && lowerText.includes('luz')) ||
      (desc.includes('internet') && lowerText.includes('internet')) ||
      (desc.includes('água') && (lowerText.includes('água') || lowerText.includes('agua'))) ||
      (desc.includes('gasolina') && lowerText.includes('gasolina')) ||
      (desc.includes('geladeira') && lowerText.includes('geladeira')) ||
      (desc.includes('tv') && (lowerText.includes('tv') || lowerText.includes('televisão') || lowerText.includes('televisao')))
    );
  });

  const isExplicitCollective = /\b(as\s+duas|os\s+dois|ambos|ambas|paguei\s+as\s+duas|paguei\s+os\s+dois|os\s+dois\s+são|as\s+duas\s+são|os\s+dois\s+sao|as\s+duas\s+sao|tudo\s+da\s+loja|tudo\s+é\s+da\s+loja|tudo\s+no\s+pix|paguei\s+tudo|todas|todos)\b/i.test(lowerText);
  const isCollectivePurpose = !mentionsSpecificDraft && /\b(são\s+da\s+loja|sao\s+da\s+loja|pra\s+loja|para\s+a\s+loja|pessoais|é\s+pessoal|tudo\s+pessoal)\b/i.test(lowerText) && activeDrafts.filter(d => d.businessPurpose === 'UNKNOWN' || d.missingFields?.includes('businessPurpose')).length >= 2;
  const isCollectivePayment = !mentionsSpecificDraft && /\b(no\s+pix|em\s+dinheiro|no\s+débito|no\s+debito|no\s+crédito|no\s+credito)\b/i.test(lowerText) && activeDrafts.filter(d => !d.paymentMethod || d.paymentMethod === 'UNKNOWN' || d.missingFields?.includes('paymentMethod')).length >= 2;

  const isGlobalReply = isExplicitCollective || isCollectivePurpose || isCollectivePayment;

  if (isGlobalReply) {
    const updatedDrafts = activeDrafts.map(d => {
      const { updatedDraft } = applyTurnPatch(d, newText, intent, categories, todayStr);
      return updatedDraft;
    });
    return {
      updatedDrafts,
      isNewTransaction: false,
      targetIndex: 0,
    };
  }

  const hasMultipleSpecificPatches = (lowerText.includes(' e ') || mentionsSpecificDraft) && activeDrafts.length >= 2;
  if (hasMultipleSpecificPatches) {
    const clauses = lowerText.split(/(?:,|\.|\;|\be\b|\betambém\b|\be\s+também\b)/i).map(c => c.trim()).filter(Boolean);
    const updatedDrafts = activeDrafts.map(d => {
      const desc = (d.description || '').toLowerCase();

      const targetClause = clauses.find(c => {
        return (desc.includes('luz') && c.includes('luz')) ||
               (desc.includes('internet') && c.includes('internet')) ||
               (desc.includes('água') && c.includes('água')) ||
               (desc.includes('gasolina') && c.includes('gasolina')) ||
               (desc.includes('geladeira') && c.includes('geladeira')) ||
               (desc.includes('televisão') && (c.includes('televisão') || c.includes('televisao') || c.includes('tv'))) ||
               (desc.includes('tv') && (c.includes('televisão') || c.includes('televisao') || c.includes('tv')));
      });

      if (targetClause) {
        const { updatedDraft } = applyTurnPatch(d, targetClause, intent, categories, todayStr);
        return updatedDraft;
      } else if (
        (desc.includes('luz') && lowerText.includes('luz')) ||
        (desc.includes('internet') && lowerText.includes('internet')) ||
        (desc.includes('água') && lowerText.includes('água')) ||
        (desc.includes('gasolina') && lowerText.includes('gasolina'))
      ) {
        const { updatedDraft } = applyTurnPatch(d, newText, intent, categories, todayStr);
        return updatedDraft;
      }
      return d;
    });

    return {
      updatedDrafts,
      isNewTransaction: false,
      targetIndex: 0,
    };
  }

  // Procurar por referência explícita a algum draft na lista (por fornecedor, descrição ou categoria)
  let targetIndex = -1;

  activeDrafts.forEach((d, idx) => {
    const supp = (d.supplier || d.counterparty || '').toLowerCase();
    const desc = (d.description || '').toLowerCase();
    const cat = (d.categoryName || '').toLowerCase();

    if (supp && lowerText.includes(supp)) targetIndex = idx;
    else if (desc && lowerText.includes(desc)) targetIndex = idx;
    else if (cat && lowerText.includes(cat)) targetIndex = idx;
    else if (desc.includes('luz') && lowerText.includes('luz')) targetIndex = idx;
    else if (desc.includes('internet') && lowerText.includes('internet')) targetIndex = idx;
  });

  const isAmountCorrection = /(?:não|nao|na\s+verdade|corrigindo|falei\s+errado|quis\s+dizer|ou\s+melhor)\s+(?:r\$\s*)?\d+/i.test(lowerText) || /^(?:não|nao)[,\s]+foi\s+\d+/i.test(lowerText);
  if (isAmountCorrection && activeDrafts.length > 0) {
    targetIndex = activeDrafts.length - 1;
  }

  if (targetIndex === -1) {
    const isPurposeAnswer = /loja|empresa|depósito|deposito|escritório|escritorio|pessoal|casa/i.test(lowerText);
    const isPaymentAnswer = /pix|débito|debito|crédito|credito|dinheiro|cartão|cartao/i.test(lowerText);

    if (isPurposeAnswer) {
      const purposeIdx = findPurposeDraftTarget(activeDrafts, lowerText);
      if (purposeIdx !== -1) targetIndex = purposeIdx;
    } else if (isPaymentAnswer) {
      let paymentIdx = -1;
      for (let i = activeDrafts.length - 1; i >= 0; i--) {
        const d = activeDrafts[i];
        const questionsList = (d as any).questions || [];
        if (
          d.missingFields?.includes('paymentMethod') ||
          d.paymentMethod === 'UNKNOWN' ||
          !d.paymentMethod ||
          questionsList.some((q: string) => q === 'paymentMethod' || /paymentMethod|forma de pagamento|pagamento|recebimento|como/i.test(q)) ||
          (d.questionToUser && /forma de pagamento|pagamento|recebimento|como/i.test(d.questionToUser))
        ) {
          paymentIdx = i;
          break;
        }
      }

      if (paymentIdx === -1) {
        const lastDraft = activeDrafts[activeDrafts.length - 1];
        if (lastDraft && (lastDraft.missingFields?.includes('paymentMethod') || lastDraft.paymentMethod === 'UNKNOWN' || !lastDraft.paymentMethod)) {
          paymentIdx = activeDrafts.length - 1;
        } else {
          paymentIdx = activeDrafts.findIndex(d => d.missingFields?.includes('paymentMethod') || d.paymentMethod === 'UNKNOWN' || !d.paymentMethod);
        }
      }
      if (paymentIdx !== -1) targetIndex = paymentIdx;
    }

    if (targetIndex === -1) {
      const incompleteIdx = activeDrafts.findIndex(d => (d.missingFields && d.missingFields.length > 0) || ((d as any).questions && (d as any).questions.length > 0));
      targetIndex = incompleteIdx !== -1 ? incompleteIdx : activeDrafts.length - 1;
    }
  }

  const targetDraft = activeDrafts[targetIndex];
  const { updatedDraft } = applyTurnPatch(targetDraft, newText, intent, categories, todayStr);

  const newDrafts = [...activeDrafts];
  newDrafts[targetIndex] = updatedDraft;

  return {
    updatedDrafts: newDrafts,
    isNewTransaction: false,
    targetIndex,
  };
}
