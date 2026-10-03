import { getSupabaseSecretKey } from '../supabaseSecretKey';
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET')
    return res.status(405).json({ success: false, error: 'Método inválido.' });

  const serviceKey = getSupabaseSecretKey();
  if (!serviceKey)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });
  const db = createClient(supabaseUrl, serviceKey);
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    const model = req.query.model;
    const environment = Number(req.query.environment);
    const series = String(req.query.series ?? '');
    const minimumNumber = Number(req.query.minimumNumber);
    if (
      (model !== '55' && model !== '65') ||
      (environment !== 1 && environment !== 2) ||
      !/^\d{1,3}$/.test(series) ||
      !Number.isInteger(minimumNumber) ||
      minimumNumber < 1 ||
      minimumNumber > 999999999
    )
      return res.status(400).json({ success: false, error: 'Parâmetros de sequência inválidos.' });

    const { data, error } = await db
      .from('nfe_sequences')
      .select('ultimo_numero')
      .eq('modelo', model)
      .eq('serie', series)
      .eq('ambiente', environment)
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ success: false, error: 'Não foi possível consultar a sequência fiscal.' });
    const nextNumber = Math.max(minimumNumber, Number(data?.ultimo_numero ?? 0) + 1);
    return res.status(200).json({ success: true, nextNumber });
  }

  return res.status(409).json({
    success: false,
    code: 'FISCAL_CORE_REQUIRED',
    error:
      'Reserva direta desativada. Modelo, série e número só serão reservados pelo backend após determinação fiscal aprovada.',
    numberReserved: false,
  });
}
