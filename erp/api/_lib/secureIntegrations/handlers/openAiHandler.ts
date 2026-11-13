import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest } from '../../authenticatedErpRequest.js';
import { checkAiQuotaOrReject, releaseAiReservationSafe, recordAiUsageTokensSafe } from '../aiQuotaBridge.js';
import {
  MAX_OPENAI_REQUEST_BYTES,
  OPENAI_EMBEDDING_MODEL_PATTERN,
  OPENAI_MODEL_PATTERN,
  bodySize,
} from '../types.js';
import { buildOpenAiAgentRequest, parseOpenAiAgentResponse } from '../../../../../shared-utils/openAiAgentAdapter.js';

export async function handleOpenAi(req: VercelRequest, res: VercelResponse): Promise<unknown> {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiApiKey) return res.status(503).json({ error: 'OpenAI indisponível no servidor.' });
  if (bodySize(req.body) > MAX_OPENAI_REQUEST_BYTES) {
    return res.status(413).json({ error: 'Solicitação excede o tamanho permitido.' });
  }

  const context = await authenticateErpRequest(req, res);
  if (!context) return;
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Solicitação inválida.' });
  }
  const action = typeof body.action === 'string' ? body.action : 'chat_completions';
  let requestBody =
    body.request && typeof body.request === 'object' && !Array.isArray(body.request)
      ? body.request
      : body;
  const isAgentCompat = action === 'agent_compat';
  if (isAgentCompat) {
    if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
      return res.status(400).json({ error: 'Conteúdo do assistente inválido.' });
    }
    requestBody = buildOpenAiAgentRequest(body.payload);
  }
  const model = typeof requestBody.model === 'string' ? requestBody.model.trim() : 'gpt-6-luna';
  const isEmbeddings = action === 'embeddings';
  const isResponses = action === 'responses' || isAgentCompat;
  const isChatCompletions = action === 'chat_completions';
  if (!isEmbeddings && !isResponses && !isChatCompletions) {
    return res.status(400).json({ error: 'Operação OpenAI não permitida.' });
  }
  if (isEmbeddings ? !OPENAI_EMBEDDING_MODEL_PATTERN.test(model) : !OPENAI_MODEL_PATTERN.test(model)) {
    return res.status(400).json({ error: 'Modelo OpenAI não permitido.' });
  }
  if (isEmbeddings && !(typeof requestBody.input === 'string' || Array.isArray(requestBody.input))) {
    return res.status(400).json({ error: 'Entrada de embedding inválida.' });
  }
  if (isResponses && (requestBody.input === undefined || requestBody.input === null)) {
    return res.status(400).json({ error: 'Entrada de resposta inválida.' });
  }
  if (isChatCompletions && !Array.isArray(requestBody.messages)) {
    return res.status(400).json({ error: 'Mensagens inválidas para a OpenAI.' });
  }
  if (
    isResponses &&
    Object.keys(requestBody).some(
      (key) => !['model', 'input', 'instructions', 'tools', 'tool_choice', 'text', 'reasoning', 'max_output_tokens', 'temperature'].includes(key)
    )
  ) {
    return res.status(400).json({ error: 'Campo não permitido na solicitação OpenAI.' });
  }

  // Validação estrita da cota de IA (orçamento mensal R$ 30,00, limites de hora, dia e horário de atendimento)
  const moduleSource =
    typeof body.moduleSource === 'string' && /^[a-z0-9_.:-]{1,80}$/i.test(body.moduleSource)
      ? body.moduleSource
      : 'openai_proxy';
  const isSupportSimulator = moduleSource === 'whatsapp_ai_simulator' && isResponses;
  if (isSupportSimulator) {
    const requestedOutput = Number(requestBody.max_output_tokens);
    requestBody = { ...requestBody, max_output_tokens: Number.isInteger(requestedOutput) && requestedOutput > 0
      ? Math.min(requestedOutput, 2048) : 2048 };
  }
  // Serialized JSON syntax inflates byte-based token counts; reserve the output cap separately.
  const estimatedTokens = isSupportSimulator
    ? Math.max(
        3072,
        Math.ceil(bodySize(requestBody) / 3) + Number(requestBody.max_output_tokens || 2048)
      )
    : isEmbeddings ? 1000 : 1500;
  const quota = await checkAiQuotaOrReject(
    context.userDb,
    'openai',
    'openai_gpt',
    estimatedTokens,
    moduleSource,
    res
  );
  if (!quota.allowed) return;

  const reservationId = quota.reservationId;
  let committed = false;
  let upstreamResponseReceived = false;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const endpoint = isResponses ? 'responses' : isEmbeddings ? 'embeddings' : 'chat/completions';
    const upstreamBody = isResponses || isEmbeddings ? requestBody : { ...requestBody, model };
    const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    });
    upstreamResponseReceived = true;
    const data = await response.json().catch(() => ({}));

    // Registro atômico de tokens e custos em BRL
    const usage = (data as any)?.usage;
    if (isSupportSimulator && response.ok && (!Number.isFinite(usage?.input_tokens) || !Number.isFinite(usage?.output_tokens))) {
      return res.status(502).json({ error: 'O consumo da chamada não foi confirmado.' });
    }
    if (isSupportSimulator && !response.ok && response.status >= 500) {
      return res.status(response.status).json(data);
    }
    const promptTokens = Number(usage?.input_tokens ?? usage?.prompt_tokens ?? 0);
    const completionTokens = Number(usage?.output_tokens ?? usage?.completion_tokens ?? 0);
    const totalTokens = Number(usage?.total_tokens || 0) || promptTokens + completionTokens;
    const cachedTokens = Number(usage?.input_tokens_details?.cached_tokens ?? usage?.prompt_tokens_details?.cached_tokens ?? usage?.cached_tokens ?? 0);

    committed = true;
    const usageRecorded = await recordAiUsageTokensSafe(context.userDb, {
      provider: 'openai',
      service: 'openai_gpt',
      operation: endpoint,
      promptTokens,
      completionTokens,
      totalTokens,
      moduleSource,
      responseTimeMs: Date.now() - startTime,
      ok: response.ok,
      reservationId,
      cachedTokens,
    });

    if (!usageRecorded) {
      return res.status(502).json({
        error: 'A resposta foi gerada, mas o registro de consumo não foi confirmado. Confira o histórico antes de repetir.',
      });
    }

    return res.status(response.status).json(isAgentCompat ? parseOpenAiAgentResponse(data) : data);
  } catch {
    return res.status(controller.signal.aborted ? 504 : 502).json({ error: 'Não foi possível consultar a OpenAI.' });
  } finally {
    clearTimeout(timeout);
    // Uma falha de rede não confirma que a OpenAI deixou de processar a
    // solicitação do simulador. Preserve a reserva enquanto o custo é incerto.
    if (!isSupportSimulator && !upstreamResponseReceived && !committed && reservationId) {
      await releaseAiReservationSafe(context.userDb, reservationId);
    }
  }
}
