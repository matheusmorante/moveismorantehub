import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOperation, type SecureOperation } from './types.js';
import { handleMetaGraph } from './handlers/metaGraphHandler.js';
import { handleGemini } from './handlers/geminiHandler.js';
import { handleOpenAi } from './handlers/openAiHandler.js';
import { handleGoogleRoutes } from './handlers/googleRoutesHandler.js';
import { handleMetaCatalogCron } from '../metaCatalogReconciliation/handler.js';

export {
  handleMetaGraph,
  handleGemini,
  handleOpenAi,
  handleGoogleRoutes,
};
export {
  checkAiQuotaOrReject,
  releaseAiReservationSafe,
  recordAiUsageTokensSafe,
  type RecordAiUsageParams,
  type AiQuotaCheckResult,
} from './aiQuotaBridge.js';
export {
  getOperation,
  type SecureOperation,
} from './types.js';

const operations: Record<SecureOperation, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
  'meta-graph': handleMetaGraph,
  'meta-catalog-cron': handleMetaCatalogCron,
  'gemini-proxy': handleGemini,
  'openai-proxy': handleOpenAi,
  'google-routes': handleGoogleRoutes,
};

/**
 * Ponto de entrada unificado para operações seguras de backend (Meta Graph, OpenAI, Google Routes).
 * Aplica cabeçalhos CORS, validação de rota e delega para handlers especializados de domínio.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const operation = getOperation(req) as SecureOperation;
  if (!Object.prototype.hasOwnProperty.call(operations, operation)) {
    return res.status(404).json({ error: 'Operação segura não encontrada.' });
  }

  const operationHandler = operations[operation];
  try {
    return await operationHandler(req, res);
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(`[SecureIntegrations] Unhandled ${operation} error (${errorName}).`);
    if (res.headersSent) return;
    const message = operation === 'meta-graph'
      ? 'Falha interna ao processar a integração Meta. Tente novamente.'
      : 'Falha interna ao processar a integração segura. Tente novamente.';
    return res.status(500).json({ error: message });
  }
}
