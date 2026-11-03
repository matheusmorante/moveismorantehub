import { clearAgentCredential, loadAgentCredential } from './agentCredentials';
import { printCloudLabelJob } from './cloudLabelPrinter';

const POLL_INTERVAL_MS = 3_000;
const REQUEST_TIMEOUT_MS = 20_000;
let workerStarted = false;
let polling = false;

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
  try {
    const credential = await loadAgentCredential();
    if (!credential) return;
    const endpoint = `${credential.apiBaseUrl}/label-print-agent/jobs`;
    const claimResponse = await request(endpoint, credential.token, { action: 'claim' });
    if (claimResponse.status === 401 || claimResponse.status === 403) {
      clearAgentCredential();
      console.warn('[CloudQueue] Esta estação foi desconectada da conta.');
      return;
    }
    if (!claimResponse.ok) throw new Error(`Fila indisponível (${claimResponse.status}).`);
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
    setTimeout(() => void tick(), POLL_INTERVAL_MS);
  }
}

export const startCloudPrintQueue = (): void => {
  if (workerStarted) return;
  workerStarted = true;
  void tick();
};
