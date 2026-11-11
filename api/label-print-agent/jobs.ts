import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createLabelPrintDb } from '../labelPrintAuthorization';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const db = createLabelPrintDb();
  if (!db) return res.status(503).json({ error: 'Agente de impressão indisponível.' });
  const token = /^Bearer\s+([0-9a-f]{64})$/i.exec(String(req.headers.authorization || ''))?.[1];
  if (!token) return res.status(401).json({ error: 'Estação não autenticada.' });

  const action = req.body?.action;
  if (action === 'complete') {
    const jobId = typeof req.body?.jobId === 'string' ? req.body.jobId : '';
    const claimToken = typeof req.body?.claimToken === 'string' ? req.body.claimToken : '';
    const status = typeof req.body?.status === 'string' ? req.body.status : '';
    const message = typeof req.body?.error === 'string' ? req.body.error.trim().slice(0, 500) : null;
    const { data, error } = await db.rpc('complete_label_print_job', {
      p_agent_token_hash: hashToken(token),
      p_job_id: jobId,
      p_claim_token: claimToken,
      p_status: status,
      p_error: message,
      p_completed_at: new Date().toISOString(),
    });
    if (error) return res.status(503).json({ error: 'Não foi possível confirmar a impressão.' });
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.authenticated) return res.status(401).json({ error: 'Estação não autenticada.' });
    if (!result.request_valid) return res.status(400).json({ error: 'Confirmação da impressão inválida.' });
    return res.status(200).json({ accepted: Boolean(result.accepted) });
  }

  const { data: agent, error: agentError } = await db
    .from('label_print_agents')
    .select('id,revoked_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();
  if (agentError) return res.status(503).json({ error: 'Não foi possível autenticar a estação.' });
  if (!agent) return res.status(401).json({ error: 'Estação não autenticada.' });

  if (action === 'claim') {
    if (agent.revoked_at) return res.status(403).json({ error: 'Estação desconectada.' });
    const { data, error } = await db.rpc('claim_label_print_job_compact', { p_agent_id: agent.id });
    if (error) return res.status(503).json({ error: 'Não foi possível consultar a fila.' });
    const job = Array.isArray(data) ? data[0] : data;
    if (!job) return res.status(200).json({ job: null });
    return res.status(200).json({
      job: {
        id: job.id,
        category: job.category,
        html: job.html,
        assetOrigin: job.asset_origin,
        paperWidthMm: Number(job.paper_width_mm),
        paperHeightMm: Number(job.paper_height_mm),
        claimToken: job.claim_token,
      },
    });
  }

  return res.status(400).json({ error: 'Ação da estação inválida.' });
}
