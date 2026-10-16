import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Bloqueio categórico de envio no backend (Segurança de Custo Zero da Meta)
  return res.status(403).json({
    error: 'Envio indisponível. Central em modo de visualização gratuita.',
    status: 'BLOCKED_FREE_TIER_PROTECTION',
    reason:
      'O módulo Central de Atendimento opera exclusivamente em modo de visualização e recebimento para impedir qualquer risco de cobrança da Meta.',
  });
}
