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
import {
  determineSaleCfop,
  getCfopDefinition,
  resolveFiscalCfopOrderScope,
} from '../../shared-utils/fiscalCfopModel';

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
  if (auth.ok === false)
    return res.status(auth.status).json({ success: false, error: auth.message });
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
    const productIds = Array.from(
      new Set(
        items.flatMap((item) =>
          typeof item.productId === 'string' &&
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            item.productId
          )
            ? [item.productId]
            : []
        )
      )
    );
    const products = productIds.length
      ? await db.from('products').select('id,fiscal').in('id', productIds)
      : { data: [], error: null };
    // The current schema persists fiscal data on products and order items;
    // product_variations has no fiscal column. Do not invent a storage contract.
    if (products.error)
      throw new Error(
        'Não foi possível conferir exceções fiscais do cadastro: ' + products.error.message
      );
    const shipping =
      (order.order_data?.shipping as Record<string, unknown> | undefined) || {};
    const customerData =
      (order.order_data?.customerData as Record<string, unknown> | undefined) || {};
    const operationScope = resolveFiscalCfopOrderScope({
      issuerUf: typeof app.data.companyUF === 'string' ? app.data.companyUF : '',
      deliveryMethod: String(shipping.deliveryMethod || ''),
      shipping,
      customerAddress: customerData.fullAddress || customerData.address,
    });
    if (operationScope.destination === null)
      throw new Error(operationScope.reason || 'Local físico da operação fiscal não identificado.');
    if (operationScope.scope === 'foreign')
      throw new Error('Operação com exterior exige matriz fiscal específica aprovada.');
    const destination = operationScope.destination;
    const isInterstate = operationScope.scope === 'interstate';

    const resolved = items.map((item, index) => {
      const product = products.data?.find((row) => row.id === item.productId);
      const catalogCst = product?.fiscal?.cst;
      const catalogCfop = product?.fiscal?.cfop;
      const itemFiscal = (item.fiscal as Record<string, unknown> | undefined) || {};
      const savedCfop = typeof itemFiscal.cfop === 'string' ? itemFiscal.cfop : undefined;
      const sourceCfop = savedCfop || (typeof catalogCfop === 'string' ? catalogCfop : undefined);
      const sourceDefinition = getCfopDefinition(sourceCfop || '');
      if (sourceCfop && !sourceDefinition)
        throw new Error(`CFOP ${sourceCfop} não classificado; revise a origem fiscal antes de preparar os itens.`);
      if (sourceDefinition && sourceDefinition.operationType !== 'sale')
        throw new Error(`CFOP ${sourceCfop} exige tratamento fiscal específico e não pode ser convertido em venda padrão.`);
      const cfop = determineSaleCfop({
        destination,
        itemType: 'product',
        isSt:
          catalogCst === '500' ||
          itemFiscal.cst === '500' ||
          sourceDefinition?.stApplicability === 'required',
        isOwnProduction: sourceDefinition?.merchandiseOrigin === 'own_production',
      });
      return {
        itemNumber: index + 1,
        ...resolveItemCsosn({
          configuration,
          environment: 2,
          issuerCrt: String(app.data!.companyCRT || ''),
          catalog: typeof catalogCst === 'string' ? catalogCst : undefined,
        }),
        cfop,
        cfopSource: isInterstate ? 'INTERSTATE_RULE' : 'INTERNAL_RULE',
      };
    });
    return res.status(200).json({ success: true, configuration, items: resolved });
  } catch (error) {
    console.error('ITEM DEFAULTS ERROR:', error);
    return res.status(422).json({
      success: false,
      error: error instanceof Error ? error.message : 'Preparação fiscal inválida.',
    });
  }
}
