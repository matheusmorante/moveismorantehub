import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
  AutomaticReturnFiscalApiError,
  processAutomaticReturnFiscalJob,
} from './automaticReturnFiscalWorker';
import {
  AUTOMATIC_RETURN_WORKER_SECRET_HEADER,
  isAutomaticReturnWorkerAuthorized,
} from './automaticReturnWorkerAuthorization';
import { getSupabaseSecretKey } from '../supabaseSecretKey';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';

function resolveInternalBaseUrl(): string | null {
  const configured = process.env.NFE_RETURN_AUTO_API_BASE_URL;
  const candidate = configured || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

function retryAt(status: string, attemptCount: number): string | null {
  if (status !== 'retryable' && status !== 'reconciling') return null;
  const delayMinutes =
    status === 'reconciling'
      ? 1
      : Math.min(60, 2 ** Math.min(Math.max(attemptCount, 1), 6));
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!isAutomaticReturnWorkerAuthorized(req.headers[AUTOMATIC_RETURN_WORKER_SECRET_HEADER])) {
    return res.status(401).json({ error: 'Autenticação do worker fiscal necessária.' });
  }
  if (!supabaseUrl || !serviceKey || !process.env.NFE_RETURN_AUTO_WORKER_SECRET) {
    return res.status(503).json({ error: 'Worker fiscal indisponível.' });
  }
  const baseUrl = resolveInternalBaseUrl();
  if (!baseUrl) return res.status(503).json({ error: 'Origem interna do worker não configurada.' });

  const db = createClient(supabaseUrl, serviceKey);
  const { data: jobs, error: claimError } = await db.rpc('claim_return_fiscal_emission_job');
  if (claimError) return res.status(503).json({ error: 'Não foi possível reservar uma devolução.' });
  const job = Array.isArray(jobs) ? jobs[0] : null;
  if (!job) return res.status(200).json({ processed: 0 });

  const requestFiscalApi = async (
    path: string,
    method: 'GET' | 'POST' | 'PUT',
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 45_000);
    try {
      let response: Response;
      try {
        response = await fetch(new URL(path, baseUrl), {
          method,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            [AUTOMATIC_RETURN_WORKER_SECRET_HEADER]: process.env.NFE_RETURN_AUTO_WORKER_SECRET || '',
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
      } catch {
        throw new AutomaticReturnFiscalApiError(
          controller.signal.aborted ? 'fiscal_api_timeout' : 'fiscal_api_unreachable', true
        );
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new AutomaticReturnFiscalApiError(
          controller.signal.aborted ? 'fiscal_api_timeout' : 'fiscal_api_response_invalid',
          controller.signal.aborted || response.status >= 500
        );
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new AutomaticReturnFiscalApiError('fiscal_api_response_invalid', response.status >= 500);
      }
      const result = payload as Record<string, unknown>;
      const isRecoverable =
        result.pending === true || result.retryAllowed === true || result.reconciliationRequired === true;
      if (!response.ok && !isRecoverable) {
        throw new AutomaticReturnFiscalApiError(
          response.status >= 500 || response.status === 429 ? 'fiscal_api_unavailable' : 'fiscal_api_rejected',
          response.status >= 500 || response.status === 429
        );
      }
      return result;
    } finally {
      clearTimeout(deadline);
    }
  };

  const result = await processAutomaticReturnFiscalJob(
    String(job.return_order_id || ''),
    requestFiscalApi
  );
  const { data: finished, error: finishError } = await db.rpc('complete_return_fiscal_emission_job', {
    p_job_id: job.job_id,
    p_lease_token: job.lease_token,
    p_status: result.status,
    p_error_code: result.errorCode,
    p_next_attempt_at: retryAt(result.status, Number(job.attempt_count || 1)),
  });
  if (finishError || finished !== true) {
    return res.status(503).json({ error: 'Não foi possível registrar o resultado fiscal.' });
  }

  return res.status(200).json({ processed: 1, outcome: result.status });
}
