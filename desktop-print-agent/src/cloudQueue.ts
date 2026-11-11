import { clearAgentCredential, loadAgentCredential } from './agentCredentials';
import { printCloudLabelJob } from './cloudLabelPrinter';

const POLL_INTERVAL_MS = 5_000;
const REQUEST_TIMEOUT_MS = 20_000;
const TRANSIENT_CLAIM_RETRY_INTERVALS_MS = [6_000, 12_000, 15_000] as const;
let workerStarted = false;
let polling = false;
let consecutiveTransientClaimFailures = 0;

function nextTransientClaimRetryIntervalMs(): number {
  const lastIndex = TRANSIENT_CLAIM_RETRY_INTERVALS_MS.length - 1;
  const interval = TRANSIENT_CLAIM_RETRY_INTERVALS_MS[Math.min(consecutiveTransientClaimFailures, lastIndex)];
  consecutiveTransientClaimFailures = Math.min(consecutiveTransientClaimFailures + 1, lastIndex);
  return interval;
}

async function request(url: string, token: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function tick(): Promise<void> {
  if (polling) return;
  polling = true;
  let nextPollIntervalMs = POLL_INTERVAL_MS;
  try {
    const credential = await loadAgentCredential();
    if (!credential) {
      consecutiveTransientClaimFailures = 0;
      return;
    }
    const endpoint = `${credential.apiBaseUrl}/label-print-agent/jobs`;
    let claimResponse: Response;
    try {
      claimResponse = await request(endpoint, credential.token, { action: 'claim' });
    } catch (error) {
      nextPollIntervalMs = nextTransientClaimRetryIntervalMs();
      throw error;
    }
    if (claimResponse.status === 401 || claimResponse.status === 403) {
      consecutiveTransientClaimFailures = 0;
      clearAgentCredential();
      console.warn('[CloudQueue] Esta estação foi desconectada da conta.');
      return;
    }
    if (!claimResponse.ok) {
      if (claimResponse.status === 429 || claimResponse.status >= 500) {
        nextPollIntervalMs = nextTransientClaimRetryIntervalMs();
      } else {
        consecutiveTransientClaimFailures = 0;
      }
      throw new Error(`Fila indisponível (${claimResponse.status}).`);
    }
    consecutiveTransientClaimFailures = 0;
    const payload = await claimResponse.json() as { job?: any | null };
    const job = payload.job;
    if (!job) return;

    let completion: { status: 'printed' | 'failed'; error?: string };
    try {
      await printCloudLabelJob(job);
      completion = { status: 'printed' };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 450) : 'Falha ao preparar ou enviar à impressora.';
      console.error('[CloudQueue] Falha ao imprimir uma etiqueta:', message);
      completion = { status: 'failed', error: message };
    }

    const doneResponse = await request(endpoint, credential.token, {
      action: 'complete',
      jobId: job.id,
      claimToken: job.claimToken,
      ...completion,
    });
    if (!doneResponse.ok) console.warn(`[CloudQueue] Não foi possível confirmar o trabalho ${job.id}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro de conexão.';
    console.warn('[CloudQueue] Não foi possível consultar a fila:', message);
  } finally {
    polling = false;
    setTimeout(() => void tick(), nextPollIntervalMs);
  }
}

export const startCloudPrintQueue = (): void => {
  if (workerStarted) return;
  workerStarted = true;
  void tick();
};
