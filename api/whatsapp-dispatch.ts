import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Bloqueio categórico de envio por política empresarial.
  return res.status(403).json({
    error: 'Envio indisponível por política da empresa.',
    status: 'BLOCKED_FREE_TIER_PROTECTION',
    reason:
      'A Central de Atendimento permite consulta e recebimento, mas não despacha mensagens para clientes.',
  });
}
