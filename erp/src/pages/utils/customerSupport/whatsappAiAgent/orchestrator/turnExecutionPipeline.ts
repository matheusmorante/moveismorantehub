import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppAiAgentConfig } from '../../../settings/types.js';
import type {
  InboundMessageParams,
  WhatsAppAiAgentResult,
  WhatsAppAiAgentDependencies,
  WhatsAppConversationLike,
} from '../whatsappAiAgentTypes.js';
import {
  markMessageInFlight,
  markMessageProcessed,
  releaseMessageInFlight,
  completeDistributedAiTurnLock,
  releaseConversationInFlight,
} from '../whatsappAiAgentSecurity.js';
import { enforceMandatoryPhrases } from '../whatsappAiRuleEngine.js';
import { runAiTurnWithFallback } from '../whatsappAiModelRunner.js';
import { dispatchAiResponse } from '../whatsappAiAgentDispatcher.js';
import {
  buildTurnContext,
  fetchAndFormatConversationHistory,
} from './index.js';
import { handleImmediateSituationHandoff } from './turnHandoffHandler.js';
import { resolveTurnTools } from './turnToolsResolver.js';
import { finalizeTurnAndChainPending } from './turnChainExecutor.js';

export async function executeWhatsAppAiTurn(
  supabase: SupabaseClient,
  inbound: InboundMessageParams,
  conv: WhatsAppConversationLike,
  config: WhatsAppAiAgentConfig,
  settings: any,
  dependencies: WhatsAppAiAgentDependencies = {},
  turnLock?: { turnId?: string; lockToken?: string },
  chainedCount: number = 0
): Promise<WhatsAppAiAgentResult> {
  const startTime = Date.now();
  const fetchOpenAi = dependencies.fetchOpenAi || ((input, init) => globalThis.fetch(input, init));
  const fetchMeta = dependencies.fetchMeta || ((input, init) => globalThis.fetch(input, init));
  const openAiApiKey = dependencies.openAiApiKey || process.env.OPENAI_API_KEY?.trim() || '';
  const accessToken =
    dependencies.whatsappAccessToken ||
    settings?.whatsappConfig?.accessToken ||
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() ||
    '';
  const now = dependencies.now ? dependencies.now() : new Date();

  // Trava a mensagem localmente no processo
  markMessageInFlight(inbound.wamid);

  try {
    // 1. Composição de contexto cognitivo (situações, conhecimento e workflows)
    const {
      situation,
      matchedKeywords,
      relevantArticles,
      activeWorkflow,
      systemInstructionText,
    } = buildTurnContext(inbound.text, config);

    // 2. Se a situação exigir encaminhamento humano imediato, registra tags e estado na conversa
    if (situation?.action === 'handoff_human') {
      await handleImmediateSituationHandoff(
        supabase,
        inbound.conversationId,
        conv,
        situation.name,
        now
      );
      const completion = turnLock && await completeDistributedAiTurnLock(supabase, {
        turnId: turnLock.turnId,
        lockToken: turnLock.lockToken,
        conversationId: inbound.conversationId,
        status: 'completed',
        metadata: { dispatchExecuted: false, dispatchReason: 'silent_handoff_no_customer_message' },
      });
      markMessageProcessed(inbound.wamid);
      return completion && !completion.success
        ? { executed: true, reason: 'turn_finalization_unconfirmed', situationDetected: situation.situationKey }
        : { executed: true, reason: 'silent_handoff_no_customer_message', situationDetected: situation.situationKey };
    }

    if (!openAiApiKey) throw new Error('OPENAI_API_KEY não configurada para o atendimento.');

    // 3. Histórico da conversa formatado para os modelos
    const { historyForOpenAi } = await fetchAndFormatConversationHistory(
      supabase,
      inbound.conversationId,
      inbound.text
    );

    // 4. Prepara ferramentas do ERP autorizadas nas configurações
    const { activeToolDeclarations } = resolveTurnTools(config.enabledTools);

    // 5. Todos os turnos de atendimento usam GPT-6 Luna.
    const targetModel = 'gpt-6-luna';

    const aiTurnResult = await runAiTurnWithFallback({
      modelToUse: targetModel,
      openAiApiKey,
      fetchOpenAi,
      systemInstructionText,
      historyForOpenAi,
      toolsDeclarations: activeToolDeclarations,
      supabase,
      toolContext: {
        conversationId: inbound.conversationId,
        customerId: conv.customer_id,
        contactPhone: inbound.contactPhoneE164,
        settings,
      },
    });

    const rawAiText = aiTurnResult.text;
    const toolsUsed = aiTurnResult.toolsCalled;

    if (!rawAiText) {
      if (turnLock) {
        await completeDistributedAiTurnLock(supabase, {
          turnId: turnLock.turnId,
          lockToken: turnLock.lockToken,
          conversationId: inbound.conversationId,
          status: 'failed',
          modelEffective: aiTurnResult.modelEffective,
          fallbackReason: aiTurnResult.fallbackReason || 'empty_model_response',
        });
      }
      markMessageProcessed(inbound.wamid);
      return {
        executed: false,
        reason: 'empty_model_response',
        toolsUsed,
        situationDetected: situation?.situationKey || null,
      };
    }

    // 6. Garantia determinística de Frases Obrigatórias
    const { text: validatedResponseText, enforcedPhrases } = enforceMandatoryPhrases(
      rawAiText,
      situation?.mandatoryPhrases || [],
      inbound.text
    );

    // 7. Despacho e persistência da resposta (assistido vs automático) com idempotência no PostgreSQL
    const dispatchResult = await dispatchAiResponse({
      supabase,
      inbound,
      conv,
      config,
      settings,
      aiResponseText: validatedResponseText,
      toolsUsed,
      situationKey: situation?.situationKey || null,
      matchedKeywords,
      enforcedPhrases,
      relevantArticleIds: relevantArticles.map((a) => a.id),
      workflowKey: activeWorkflow?.workflowKey || null,
      executionTimeMs: Date.now() - startTime,
      accessToken,
      fetchMeta,
      now,
      turnId: turnLock?.turnId,
      modelEffective: aiTurnResult.modelEffective,
      fallbackReason: aiTurnResult.fallbackReason,
      isQuotaBlocked: aiTurnResult.quotaBlocked,
      isSilentHandoff: aiTurnResult.handoffConfirmed === true,
      durableJob: dependencies.durableJob,
    });

    // 8. Finalização atômica do turno no PostgreSQL e conferência de mensagens pendentes em cadeia
    return await finalizeTurnAndChainPending({
      supabase,
      inbound,
      conv,
      config,
      settings,
      dependencies,
      turnLock,
      chainedCount,
      dispatchResult,
      aiTurnResult,
      toolsUsed,
      startTime,
      now,
      isHandoff: false,
      targetModel,
      executeTurnFn: executeWhatsAppAiTurn,
    });
  } catch (err: any) {
    if (turnLock) {
      await completeDistributedAiTurnLock(supabase, {
        turnId: turnLock.turnId,
        lockToken: turnLock.lockToken,
        conversationId: inbound.conversationId,
        status: 'failed',
        fallbackReason: err?.message || String(err),
      });
    }
    releaseMessageInFlight(inbound.wamid);
    return {
      executed: false,
      reason: 'exception',
      error: err?.message || String(err),
    };
  } finally {
    releaseConversationInFlight(inbound.conversationId);
  }
}
