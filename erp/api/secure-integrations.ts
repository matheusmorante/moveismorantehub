import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOperation, type SecureOperation } from './_lib/secureIntegrations/types.js';
import { handleMetaGraph } from './_lib/secureIntegrations/handlers/metaGraphHandler.js';
import { handleGemini } from './_lib/secureIntegrations/handlers/geminiHandler.js';
import { handleOpenAi } from './_lib/secureIntegrations/handlers/openAiHandler.js';
import { handleGoogleRoutes } from './_lib/secureIntegrations/handlers/googleRoutesHandler.js';

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
} from './_lib/secureIntegrations/aiQuotaBridge.js';
export {
  getOperation,
  type SecureOperation,
} from './_lib/secureIntegrations/types.js';

const operations: Record<SecureOperation, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
  'meta-graph': handleMetaGraph,
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
  return operationHandler(req, res);
}
