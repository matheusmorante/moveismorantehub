import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeLabelPrintUser, isAllowedAppOrigin } from './labelPrintAuthorization';

const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authorization = await authorizeLabelPrintUser(req, 'manage');
  if (!authorization.ok) return res.status(authorization.status).json({ error: authorization.message });

  if (req.method === 'GET') {
    const { data, error } = await authorization.db
      .from('label_print_agents')
      .select('id,name,last_seen_at,owner_id')
      .is('revoked_at', null)
      .order('created_at', { ascending: false });
    if (error) return res.status(503).json({ error: 'Não foi possível consultar as estações.' });
    return res.status(200).json({ agents: (data || []).map(({ owner_id, ...agent }) => ({ ...agent, mine: owner_id === authorization.userId })) });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const action = req.body?.action;
  if (action === 'pair') {
    const id = typeof req.body?.id === 'string' ? req.body.id : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 100) : '';
    const tokenHash = typeof req.body?.tokenHash === 'string' ? req.body.tokenHash.toLowerCase() : '';
    const origin = req.body?.origin;
    if (!/^[0-9a-f-]{36}$/i.test(id) || !name || !/^[0-9a-f]{64}$/.test(tokenHash) || !isAllowedAppOrigin(origin)) {
      return res.status(400).json({ error: 'Dados de pareamento inválidos.' });
    }
    const { error } = await authorization.db.from('label_print_agents').insert({
      id,
      owner_id: authorization.userId,
      name,
      token_hash: tokenHash,
    });
    if (error) return res.status(503).json({ error: 'Não foi possível registrar esta estação.' });
    return res.status(201).json({ id });
  }

  if (action === 'revoke') {
    const id = typeof req.body?.id === 'string' ? req.body.id : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Estação inválida.' });
    const { error, count } = await authorization.db
      .from('label_print_agents')
      .update({ revoked_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', id)
      .eq('owner_id', authorization.userId)
      .is('revoked_at', null);
    if (error) return res.status(503).json({ error: 'Não foi possível desconectar a estação.' });
    return res.status(count ? 200 : 404).json(count ? { success: true } : { error: 'Estação não encontrada.' });
  }

  return res.status(400).json({ error: 'Ação de estação inválida.' });
}

export { hashToken };
