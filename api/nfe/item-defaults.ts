import { getSupabaseSecretKey } from '../supabaseSecretKey';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import {
  HML_CSOSN_SETTINGS_ID,
  loadHmlCsosnConfiguration,
  parseHmlCsosnConfiguration,
  resolveItemCsosn,
  validateCsosn,
} from './csosnPolicy';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { getResponsibleTechnicianConfigurationIssues } from './responsibleTechnician';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST', 'PATCH'].includes(req.method || ''))
    return res.status(405).json({ success: false, error: 'Método inválido.' });
  const supabaseSecret = getSupabaseSecretKey();
  if (!supabaseSecret)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });
  const db = createClient<FiscalDatabase>(
    process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://hkoxhourxwlddgsfdgws.supabase.co',
    supabaseSecret
  );
  const auth = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.message });
  try {
    const configuration = await loadHmlCsosnConfiguration(db);
    if (req.method === 'GET')
      return res.status(200).json({
        success: true,
        configuration,
        readiness: {
          environment: 2,
          configurationIssues: [
            ...getResponsibleTechnicianConfigurationIssues(process.env, 2),
            ...(!process.env.NFE_CERTIFICATE_BASE64 ? ['certificate.base64'] : []),
          ],
        },
      });
    const body = req.body as Record<string, unknown>;
    if (body?.environment !== 2)
      return res
        .status(422)
        .json({ success: false, error: 'Esta configuração aplica-se somente à homologação.' });
    if (req.method === 'PATCH') {
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('role,roles')
        .eq('id', auth.userId)
        .maybeSingle();
      if (profileError) throw new Error('Não foi possível validar a permissão de configuração.');
      if (profile?.role !== 'administrator' && !profile?.roles?.includes('administrator'))
        return res.status(403).json({
          success: false,
          error: 'Somente administradores alteram configurações fiscais.',
        });
      if (Object.keys(body).some((key) => !['environment', 'csosn'].includes(key)))
        throw new Error('Campos de configuração inválidos.');
      const updated = parseHmlCsosnConfiguration({
        ...configuration,
        csosn: validateCsosn(body.csosn, configuration.issuerCrt),
        version: randomUUID(),
      });
      const { error } = await db.from('settings').upsert({
        id: HML_CSOSN_SETTINGS_ID,
        data: { ...updated, updatedAt: new Date().toISOString(), updatedBy: auth.userId },
      });
      if (error)
        return res.status(503).json({ success: false, error: 'O padrão CSOSN não foi salvo.' });
      return res.status(200).json({ success: true, configuration: updated });
    }
    if (
      typeof body.orderId !== 'string' ||
      !body.orderId ||
      Object.keys(body).some((key) => !['orderId', 'environment'].includes(key))
    )
      throw new Error('Pedido inválido para preparação fiscal.');
    const { data: order, error } = await db
      .from('orders')
      .select('order_data')
      .eq('id', body.orderId)
      .maybeSingle();
    if (error) throw new Error('Não foi possível ler os itens do pedido.');
    if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    const { data: app, error: appError } = await db
      .from('settings')
      .select('data')
      .eq('id', 'app')
      .maybeSingle();
    if (appError || !app?.data) throw new Error('Configuração do emitente indisponível.');
    const items =
      (order.order_data?.items as Array<Record<string, unknown>> | undefined)?.filter(
        (item) => item.itemType !== 'service'
      ) || [];
    if (items.length > 990) throw new Error('Pedido excede o limite de itens da NF-e.');
    const productIds = [
      ...new Set(
        items.flatMap((item) => (typeof item.productId === 'string' ? [item.productId] : []))
      ),
    ];
    const products = productIds.length
      ? await db.from('products').select('id,fiscal').in('id', productIds)
      : { data: [], error: null };
    // The current schema persists fiscal data on products and order items;
    // product_variations has no fiscal column. Do not invent a storage contract.
    if (products.error) throw new Error('Não foi possível conferir exceções fiscais do cadastro.');
    const resolved = items.map((item, index) => {
      const fiscal = item.fiscal as Record<string, unknown> | undefined;
      const product = products.data?.find((row) => row.id === item.productId);
      const catalog = product?.fiscal?.cst;
      return {
        itemNumber: index + 1,
        ...resolveItemCsosn({
          configuration,
          environment: 2,
          issuerCrt: String(app.data!.companyCRT || ''),
          saved: typeof fiscal?.cst === 'string' ? fiscal.cst : undefined,
          catalog: typeof catalog === 'string' ? catalog : undefined,
        }),
      };
    });
    return res.status(200).json({ success: true, configuration, items: resolved });
  } catch (error) {
    return res.status(422).json({
      success: false,
      error: error instanceof Error ? error.message : 'Preparação fiscal inválida.',
    });
  }
}
