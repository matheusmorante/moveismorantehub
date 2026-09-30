import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeFiscalOperator } from './fiscalAuthorization';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';

/**
 * Direct sequence reservation was retired. A number may only be reserved by
 * the future server-side Fiscal Core after determination, in the snapshot
 * transaction. Keeping this endpoint closed prevents clients burning numbers.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Método inválido.' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });
  const db = createClient(supabaseUrl, serviceKey);
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });

  return res.status(409).json({
    success: false,
    code: 'FISCAL_CORE_REQUIRED',
    error:
      'Reserva direta desativada. Modelo, série e número só serão reservados pelo backend após determinação fiscal aprovada.',
    numberReserved: false,
  });
}
