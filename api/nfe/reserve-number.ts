import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { isNfeProductionEnabled } from './productionGuard';
import { resolveNfeSequenceSettings } from '../../erp/src/pages/utils/nfe/nfeSequenceSettings';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';

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

  const model = String(req.body?.model || '');
  const environment = Number(req.body?.environment);
  const requestedSeries = String(req.body?.series || '');
  if (
    !['55', '65'].includes(model) ||
    ![1, 2].includes(environment) ||
    !/^[0-9]{1,3}$/.test(requestedSeries)
  )
    return res.status(400).json({ success: false, error: 'Modelo, ambiente ou série inválidos.' });
  if (environment === 1 && req.body?.productionConfirmed !== true)
    return res.status(400).json({ success: false, error: 'Confirmação de produção ausente.' });
  if (environment === 1 && !isNfeProductionEnabled(process.env.NFE_PRODUCTION_ENABLED))
    return res.status(503).json({ success: false, error: 'Numeração de produção desabilitada.' });

  const { data: row, error: settingsError } = await db
    .from('settings')
    .select('data')
    .eq('id', 'app')
    .maybeSingle();
  if (settingsError || !row?.data)
    return res.status(503).json({ success: false, error: 'Configuração fiscal indisponível.' });

  const { series, minimumNumber } = resolveNfeSequenceSettings(
    row.data,
    model as '55' | '65',
    environment as 1 | 2
  );
  if (series !== requestedSeries || !Number.isInteger(minimumNumber) || minimumNumber < 1)
    return res.status(409).json({
      success: false,
      error: 'Série ou numeração fiscal mudou; atualize as configurações e tente novamente.',
    });

  const { data: number, error } = await db.rpc('reserve_next_nfe_number', {
    p_modelo: model,
    p_serie: series,
    p_ambiente: environment,
    p_numero_minimo: minimumNumber,
  });
  if (error || !Number.isInteger(number) || number < minimumNumber)
    return res
      .status(503)
      .json({ success: false, error: 'Não foi possível reservar a numeração fiscal.' });

  return res.status(200).json({ success: true, number, series });
}
