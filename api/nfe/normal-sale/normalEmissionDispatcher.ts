import type { VercelResponse } from '@vercel/node';
import type { createClient } from '@supabase/supabase-js';
import { withNfeEmissionStage } from '../nfeEmissionPerformance';
import { authorizeFiscalOperator } from '../fiscalAuthorization';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';
import {
  NF_PAYMENT_SETTLEMENT_POLICY,
  parseFiscalEmissionCommand,
  type FiscalIssuerProfileKey,
  type FiscalJsonValue,
  type FiscalSnapshotCandidate,
} from '../fiscalSnapshot';
import { recoverNormalSale } from './outboundAttempt';
import { recoverHmlTechnical, emitHmlTechnical } from '../emitHmlTechnical';
import { emitNormalSale } from '../emitNormalSale';

export async function dispatchNormalEmission(
  reqBody: any,
  authHeader: string | undefined,
  supabase: ReturnType<typeof createClient<FiscalDatabase>>,
  res: VercelResponse
): Promise<unknown> {
  const parsedCommand = parseFiscalEmissionCommand(reqBody);
  if ('error' in parsedCommand)
    return res.status(400).json({
      success: false,
      code: 'INVALID_FISCAL_EMISSION_COMMAND',
      error: parsedCommand.error,
    });
  const command = parsedCommand.command;

  const fiscalAuthorization = await withNfeEmissionStage(
    'operator_authorization',
    () => authorizeFiscalOperator(supabase, authHeader),
    { emissionRequestId: command.emissionRequestId, environment: command.environment }
  );
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message,
    });
  if (command.previewOnly && !fiscalAuthorization.isAdministrator)
    return res.status(403).json({
      success: false,
      code: 'FISCAL_XML_PREVIEW_ADMIN_REQUIRED',
      error: 'Somente administradores podem visualizar a prévia do XML fiscal.',
    });

  const normalRecovery = command.previewOnly
    ? null
    : await withNfeEmissionStage(
        'idempotency_recovery',
        () => recoverNormalSale(supabase, command),
        { emissionRequestId: command.emissionRequestId, environment: command.environment }
      );
  if (normalRecovery) return res.status(normalRecovery.status).json(normalRecovery.body);

  const recovered =
    !command.previewOnly && command.environment === 2
      ? await withNfeEmissionStage(
          'idempotency_recovery',
          () => recoverHmlTechnical(supabase, command),
          { emissionRequestId: command.emissionRequestId, environment: command.environment }
        )
      : null;
  if (recovered) return res.status(recovered.status).json(recovered.body);

  const [{ data: orderRow, error: orderError }, { data: settingsRow, error: settingsError }] =
    await withNfeEmissionStage(
      'order_and_settings_fetch',
      () =>
        Promise.all([
          supabase
            .from('orders')
            .select('id,order_type,status,deleted,order_data,version,updated_at')
            .eq('id', command.orderId)
            .maybeSingle(),
          supabase.from('settings').select('data').eq('id', 'app').maybeSingle(),
        ]),
      { emissionRequestId: command.emissionRequestId, environment: command.environment }
    );

  if (orderError)
    return res.status(503).json({
      success: false,
      code: 'FISCAL_ORDER_SNAPSHOT_UNAVAILABLE',
      error: 'Não foi possível carregar a revisão fiscal do pedido no servidor.',
    });
  if (!orderRow)
    return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
  if (
    !['sale', 'showroom'].includes(String(orderRow.order_type)) ||
    ['cancelled', 'cancelado'].includes(String(orderRow.status || '').toLowerCase())
  )
    return res.status(409).json({
      success: false,
      code: 'ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL',
      error: 'Pedido não elegível para emissão fiscal de saída.',
    });
  if (
    !orderRow.order_data ||
    typeof orderRow.order_data !== 'object' ||
    Array.isArray(orderRow.order_data) ||
    !Number.isInteger(orderRow.version) ||
    !orderRow.updated_at
  )
    return res.status(409).json({
      success: false,
      code: 'ORDER_FISCAL_SNAPSHOT_INCOMPLETE',
      error: 'Pedido sem dados ou revisão necessários para snapshot fiscal.',
    });
  if (
    settingsError ||
    !settingsRow?.data ||
    typeof settingsRow.data !== 'object' ||
    Array.isArray(settingsRow.data)
  )
    return res.status(503).json({
      success: false,
      code: 'ISSUER_PROFILE_UNAVAILABLE',
      error: 'Perfil do emitente indisponível para preparar o snapshot fiscal.',
    });

  const issuerKeys: FiscalIssuerProfileKey[] = [
    'companyName',
    'companyAddress',
    'companyCnpj',
    'companyIE',
    'companyIM',
    'companyCRT',
    'companyLogradouro',
    'companyNumero',
    'companyBairro',
    'companyCEP',
    'companyCMun',
    'companyXMun',
    'companyUF',
    'companyPhone',
    'cscId',
  ];
  const issuerSettings = settingsRow.data as Record<string, unknown>;
  const issuerProfile = Object.fromEntries(
    issuerKeys.flatMap((key) =>
      issuerSettings[key] === null || issuerSettings[key] === undefined
        ? []
        : [[key, issuerSettings[key] as FiscalJsonValue]]
    )
  );

  const candidate: FiscalSnapshotCandidate = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    paymentSettlementPolicy: NF_PAYMENT_SETTLEMENT_POLICY,
    order: {
      id: String(orderRow.id),
      type: String(orderRow.order_type),
      status: String(orderRow.status || ''),
      deleted: orderRow.deleted === true,
      version: Number(orderRow.version),
      updatedAt: String(orderRow.updated_at),
      data: orderRow.order_data as Record<string, FiscalJsonValue>,
    },
    issuerProfile,
    emissionRequest: {
      id: command.emissionRequestId,
      environment: command.environment,
      itemCsosnOverrides: command.itemCsosnOverrides,
      itemFiscalSelections: command.itemFiscalSelections,
      recipientTaxId: command.recipientTaxId,
      recipientIe: command.recipientIe,
      recipientIeIndicator: command.recipientIeIndicator,
      finalConsumer: command.finalConsumer,
      deliveryByIssuer: command.deliveryByIssuer,
      cardNotIntegrated: command.cardNotIntegrated,
      hasTransport: command.hasTransport,
      transportResponsible: command.transportResponsible,
      freightContractResponsible: command.freightContractResponsible,
      transporter: command.transporter,
      freightMode: command.freightMode,
    },
  };

  if (command.environment === 2 && candidate.order.data.fiscalScenario === 'HML_TECHNICAL_V1') {
    if (command.previewOnly)
      return res.status(422).json({
        success: false,
        code: 'FISCAL_PREVIEW_UNSUPPORTED_SCENARIO',
        error: 'A prévia assinada ainda não está disponível para este cenário fiscal técnico.',
        numberReserved: false,
        sefazContacted: false,
      });
    const result = await emitHmlTechnical(supabase, command, candidate, issuerSettings);
    return res.status(result.status).json(result.body);
  }

  const result = await withNfeEmissionStage(
    'normal_sale_pipeline',
    () =>
      emitNormalSale(
        supabase,
        command,
        candidate,
        issuerSettings,
        fiscalAuthorization.userId
      ),
    { environment: command.environment }
  );
  return res.status(result.status).json(result.body);
}
