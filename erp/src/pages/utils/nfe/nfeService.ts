import type Order from '@/pages/types/order.type';
import { getSettings, type AppSettings } from '../settingsService';
import { validateOrderForNfe, type NfeValidationResult } from './nfeValidator';
import { openDanfePrintWindow, type DanfeData } from './danfeGenerator';
import { updateOrder } from '../orderHistoryService';
import { supabase } from '../supabaseConfig';
import { getAuthorizedAt, getCancellationWindow } from './nfeEventRules';
import { DEFAULT_NFE_ENVIRONMENT } from './nfeEnvironment';
import { resolveNfeSequenceSettings } from './nfeSequenceSettings';
import { canIssueCce } from './nfeCce';
import { parseFiscalItemSelections } from '../../../../../shared-utils/fiscalItemSelections';
import { isFiscalNumber, parseFiscalNumberConflict } from '../../../../../shared-utils/fiscalNumbering';

export { canIssueCce };

const fiscalEmissionRequestIds = new Map<string, string>();

export interface NfeEmissionResult {
  success: boolean;
  documentId?: string;
  orderId?: string;
  accessKey?: string;
  nfeNumber?: number;
  series?: string;
  model?: '55' | '65';
  environment?: 1 | 2;
  protocolNumber?: string;
  protocolDate?: string;
  xml?: string;
  danfeData?: DanfeData;
  danfeUnavailableReason?: string;
  error?: string;
  pending?: boolean;
  cStat?: string;
  retryDocumentId?: string;
  sefazMessage?: string;
  validation?: NfeValidationResult;
  numberConflict?: import('../../../../../shared-utils/fiscalNumbering').FiscalNumberConflict;
}

/**
 * Solicita a emissão ao Fiscal Core do backend; o navegador não monta o documento.
 */
export async function emitNfeForOrder(
  order: Order,
  customEnvironment?: 1 | 2,
  productionConfirmed = false,
  retryDocumentId?: string,
  requestedNumber?: number,
  originalItemNcms: string[] = []
): Promise<NfeEmissionResult> {
  const environment: 1 | 2 = customEnvironment ?? DEFAULT_NFE_ENVIRONMENT;
  if (requestedNumber !== undefined && (!isFiscalNumber(requestedNumber) || retryDocumentId))
    return { success: false, environment, error: 'Informe um número de nota fiscal válido.' };
  if (!retryDocumentId && environment === 1 && !productionConfirmed) {
    return {
      success: false,
      error: 'Confirme explicitamente a transmissão em Produção antes de emitir.',
    };
  }

  if (retryDocumentId) {
    let retryResult: any;
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token)
        throw new Error('Faça login novamente para retransmitir o documento fiscal.');
      const response = await fetch('/api/nfe/emit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ retryDocumentId, productionConfirmed }),
      });
      retryResult = await response.json().catch(() => ({}));

      const retryMetadata = {
        documentId:
          typeof retryResult.documentId === 'string' ? retryResult.documentId : retryDocumentId,
        orderId: typeof retryResult.orderId === 'string' ? retryResult.orderId : undefined,
        accessKey: typeof retryResult.accessKey === 'string' ? retryResult.accessKey : undefined,
        nfeNumber: Number.isFinite(Number(retryResult.nfeNumber))
          ? Number(retryResult.nfeNumber)
          : undefined,
        series: typeof retryResult.series === 'string' ? retryResult.series : undefined,
        model:
          retryResult.model === '55' || retryResult.model === '65' ? retryResult.model : undefined,
        environment:
          retryResult.environment === 1 || retryResult.environment === 2
            ? retryResult.environment
            : undefined,
      };
      const resultFields = {
        ...retryMetadata,
        xml: typeof retryResult.signedXml === 'string' ? retryResult.signedXml : undefined,
        pending: Boolean(retryResult.pending),
        cStat: retryResult.cStat,
        sefazMessage: retryResult.xMotivo,
        numberConflict: retryResult.code === 'NFE_NUMBER_ALREADY_USED'
          ? parseFiscalNumberConflict(retryResult.numberConflict) : undefined,
      };

      if (!response.ok || !retryResult.success)
        return {
          success: false,
          ...resultFields,
          error:
            retryResult.error ||
            retryResult.xMotivo ||
            'A SEFAZ não confirmou a retransmissão do documento.',
        };

      if (
        !retryMetadata.accessKey ||
        !/^\d{44}$/.test(retryMetadata.accessKey) ||
        !retryMetadata.nfeNumber ||
        !retryMetadata.series ||
        !retryMetadata.model ||
        !retryMetadata.environment
      )
        return {
          success: false,
          ...resultFields,
          pending: true,
          error:
            'A SEFAZ confirmou a retransmissão, mas a resposta não trouxe os dados fiscais originais. Consulte o documento antes de qualquer nova tentativa.',
        };

      return {
        success: true,
        ...resultFields,
        accessKey: retryMetadata.accessKey,
        nfeNumber: retryMetadata.nfeNumber,
        series: retryMetadata.series,
        model: retryMetadata.model,
        environment: retryMetadata.environment,
        protocolNumber: retryResult.protocolNumber,
        protocolDate: retryResult.protocolDate,
        danfeUnavailableReason:
          'A retransmissão preserva o XML fiscal original; o DANFE precisa ser gerado diretamente do documento armazenado.',
      };
    } catch (error) {
      return {
        success: false,
        documentId: retryDocumentId,
        pending: Boolean(retryResult?.pending),
        error: error instanceof Error ? error.message : 'Falha ao retransmitir documento fiscal.',
      };
    }
  }

  if (!retryDocumentId) {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token)
        throw new Error('Sessão fiscal expirada.');
      const requestKey = `${String(order.id || '')}:55:${environment}`;
      const storageKey = `nfe-emission-request:${requestKey}`;
      let storedRequestId: string | null = null;
      try { storedRequestId = typeof window !== 'undefined'
        ? window.localStorage.getItem(storageKey) : null; } catch { /* storage indisponível */ }
      const emissionRequestId = fiscalEmissionRequestIds.get(requestKey) ||
        (storedRequestId && /^[0-9a-f-]{36}$/i.test(storedRequestId) ? storedRequestId : null) ||
        crypto.randomUUID();
      fiscalEmissionRequestIds.set(requestKey, emissionRequestId);
      try { if (typeof window !== 'undefined')
        window.localStorage.setItem(storageKey, emissionRequestId); } catch { /* storage indisponível */ }
      const itemCsosnOverrides = Object.fromEntries((order.items || []).filter((item) => item.itemType !== 'service')
        .flatMap((item, index) => {
          const fiscal = (item as unknown as { fiscal?: { cst?: string; csosnSource?: string } }).fiscal;
          return fiscal?.csosnSource === 'manual' && fiscal.cst ? [[String(index + 1), fiscal.cst]] : [];
        }));
      const itemFiscalSelections = parseFiscalItemSelections(Object.fromEntries(
        (order.items || []).filter((item) => item.itemType !== 'service').flatMap((item, index) => {
          const fiscal = (item as unknown as { fiscal?: { ncm?: string; cfop?: string;
            origem?: string; cest?: string; cst?: string } }).fiscal;
          return fiscal ? [[String(index + 1), { ncm: fiscal.ncm, cfop: fiscal.cfop,
            origem: fiscal.origem, cest: fiscal.cest ?? '', csosn: fiscal.cst }]] : [];
        })));
      const response = await fetch('/api/nfe/emit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          orderId: String(order.id || ''),
          environment,
          productionConfirmed,
          emissionRequestId,
          ...(Object.keys(itemCsosnOverrides).length ? { itemCsosnOverrides } : {}),
          ...(Object.keys(itemFiscalSelections).length ? { itemFiscalSelections } : {}),
          ...(requestedNumber === undefined ? {} : { requestedNumber }),
        }),
      });
      const result = await response.json().catch(() => ({}));
      const numberConflict = result.code === 'NFE_NUMBER_ALREADY_USED'
        ? parseFiscalNumberConflict(result.numberConflict) : undefined;
      const freshIntentionRequired = Boolean(numberConflict) ||
        (result.success === false && result.pending !== true &&
          result.numberReserved === true && result.sefazContacted === false &&
          typeof result.documentId !== 'string');
      if (freshIntentionRequired) {
        // A rejected signed key or a snapshot with no document can safely start a new intention.
        fiscalEmissionRequestIds.delete(requestKey);
        try { if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey); }
        catch { /* storage indisponível */ }
      }
      if (result.success === false && result.pending !== true && ['244', '209'].includes(result.cStat)) {
        // A confirmed series/IE rejection ends this intention. The next explicit click
        // uses a new request; the database links it and preserves the rejected XML.
        fiscalEmissionRequestIds.delete(requestKey);
        try { if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey); }
        catch { /* storage indisponível */ }
      }
      const metadata = {
        documentId: typeof result.documentId === 'string' ? result.documentId : undefined,
        orderId: typeof result.orderId === 'string' ? result.orderId : undefined,
        accessKey: typeof result.accessKey === 'string' ? result.accessKey : undefined,
        nfeNumber: Number.isInteger(result.nfeNumber) ? result.nfeNumber : undefined,
        series: typeof result.series === 'string' ? result.series : undefined,
        model: result.model === '55' ? '55' as const : undefined,
        environment,
        xml: typeof result.signedXml === 'string' ? result.signedXml : undefined,
        protocolNumber: typeof result.protocolNumber === 'string' ? result.protocolNumber : undefined,
        protocolDate: typeof result.protocolDate === 'string' ? result.protocolDate : undefined,
        pending: Boolean(result.pending),
        cStat: typeof result.cStat === 'string' ? result.cStat : undefined,
        sefazMessage: typeof result.xMotivo === 'string' ? result.xMotivo : undefined,
        numberConflict,
      };
      if (response.ok && result.success === true)
        return { success: true, ...metadata,
          danfeUnavailableReason: 'DANFE HML deve ser gerado do XML fiscal persistido no backend.' };
      return {
        success: false,
        ...metadata,
        error:
          typeof result.error === 'string'
            ? result.error
            : (typeof result.xMotivo === 'string' ? result.xMotivo
              : 'A SEFAZ não confirmou a emissão fiscal.'),
      };
    } catch (error) {
      return {
        success: false,
        environment,
        error: error instanceof Error ? error.message : 'Falha ao solicitar emissão fiscal.',
      };
    }
  }

  const settings: AppSettings = await getSettings();
  const model: '55' | '65' = order.shipping?.deliveryMethod === 'pickup' ? '65' : '55';
  const { series } = resolveNfeSequenceSettings(settings, model, environment);

  if (!/^\d{7}$/.test(String(settings.companyCMun || ''))) {
    return {
      success: false,
      model,
      environment,
      error: 'Configure o código IBGE do município do estabelecimento antes de emitir.',
    };
  }

  if (model === '65' && !settings.cscId) {
    return {
      success: false,
      model,
      environment,
      error: 'NFC-e exige o identificador do CSC (IdToken) configurado antes da emissão.',
    };
  }

  // 1. Validação Fiscal
  const validation = validateOrderForNfe(order, settings);
  if (!validation.isValid) {
    return {
      success: false,
      model,
      environment,
      error: validation.errors.join(' | '),
      validation,
    };
  }

  const requestedNcms = Array.from(
    new Set(
      order.items
        .filter((item) => item.itemType !== 'service')
        .map((item) => {
          const rawCode = (item as any).fiscal?.ncm || '';
          return String(rawCode).replace(/\D/g, '');
        })
        .filter((code) => code.length === 8)
    )
  );
  const { data: catalogNcms, error: catalogError } = await supabase
    .from('ncms')
    .select('code, active, is_active, start_date, end_date')
    .in('code', requestedNcms);
  if (catalogError) {
    return {
      success: false,
      model,
      environment,
      error:
        'Não foi possível confirmar a vigência dos NCMs na base local. Sincronize a tabela oficial e tente novamente.',
      validation,
    };
  }
  const ncmByCode = new Map((catalogNcms || []).map((row) => [row.code, row]));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date()
  );
  const invalidNcms = requestedNcms.filter((code) => {
    const entry = ncmByCode.get(code);
    return (
      !entry?.active ||
      (!entry.is_active && order.items.filter((item) => item.itemType !== 'service').some((item, index) => {
        const itemCode = String((item as any).fiscal?.ncm || '').replace(/\D/g, '');
        return itemCode === code && String(originalItemNcms[index] || '').replace(/\D/g, '') !== code;
      })) ||
      (entry.start_date && entry.start_date > today) ||
      (entry.end_date && entry.end_date < today)
    );
  });
  if (invalidNcms.length > 0) {
    return {
      success: false,
      model,
      environment,
      error: `NCM(s) não vigente(s), desativado(s) para novas seleções ou ausente(s) da base local: ${invalidNcms.join(', ')}. Revise o cadastro do produto antes de emitir.`,
      validation,
    };
  }

  // O fluxo remanescente é somente retry; novas emissões retornam ao backend acima.
  const nfeNumber = 0;
  const accessKey = '';
  const xml = '';

  // 5. Envio e Assinatura Digital via Serverless Function Vercel
  let protocolNumber: string | undefined;
  let protocolDate: string | undefined;
  let signedXml = xml;
  let sefazResult: any;

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token)
      throw new Error('Faça login novamente para transmitir o documento fiscal.');
    const response = await fetch('/api/nfe/emit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        environment,
        orderId: order.id,
        nfeNumber,
        series,
        model,
        accessKey,
        productionConfirmed,
        retryDocumentId,
      }),
    });

    sefazResult = await response.json();
    if (sefazResult.signedXml) signedXml = sefazResult.signedXml;
    if (sefazResult.protocolNumber) protocolNumber = sefazResult.protocolNumber;
    if (sefazResult.protocolDate) protocolDate = sefazResult.protocolDate;
    if (!response.ok || !sefazResult.success) {
      return {
        success: false,
        pending: Boolean(sefazResult.pending),
        documentId: sefazResult.documentId,
        accessKey,
        nfeNumber,
        series,
        model,
        environment,
        xml: signedXml,
        cStat: sefazResult.cStat,
        sefazMessage: sefazResult.xMotivo,
        error:
          sefazResult.error ||
          sefazResult.xMotivo ||
          'A SEFAZ não confirmou a autorização da nota.',
        validation,
      };
    }
  } catch (e: any) {
    console.error('[NFe Service] Falha na transmissão para a SEFAZ:', e);
    return {
      success: false,
      documentId: sefazResult?.documentId,
      accessKey,
      nfeNumber,
      series,
      model,
      environment,
      xml,
      pending: Boolean(sefazResult?.pending),
      cStat: sefazResult?.cStat,
      sefazMessage: sefazResult?.xMotivo,
      error: e?.message || 'Falha na transmissão para a SEFAZ.',
      validation,
    };
  }

  const danfeData: DanfeData = {
    order,
    settings,
    accessKey,
    nfeNumber,
    series,
    protocolNumber: protocolNumber || '',
    protocolDate: protocolDate || '',
    model,
    environment,
    status: environment === 2 ? 'homologada' : 'autorizada',
  };

  // 6. Atualização do Pedido com os dados fiscais emitidos
  const nfeRecord = {
    accessKey,
    nfeNumber,
    series,
    model,
    environment,
    protocolNumber,
    protocolDate,
    xml,
    emittedAt: protocolDate || new Date().toISOString(),
    status: (environment === 2 ? 'homologada' : 'autorizada') as 'homologada' | 'autorizada',
  };

  try {
    await updateOrder(
      order.id as string,
      {
        ...order,
        nfeData: nfeRecord,
      } as any
    );
  } catch (err) {
    console.warn(
      'Aviso: autorização foi confirmada, mas não foi possível atualizar nfeData do pedido:',
      err
    );
  }

  return {
    success: true,
    accessKey,
    nfeNumber,
    series,
    model,
    environment,
    protocolNumber,
    protocolDate,
    xml,
    danfeData,
    validation,
  };
}

/**
 * Abre o DANFE de um pedido que já teve NF-e emitida
 */
export async function printOrderDanfe(order: Order): Promise<void> {
  const settings: AppSettings = await getSettings();
  const nfeData = (order as any).nfeData;
  if (!nfeData) {
    throw new Error('Este pedido ainda não possui NF-e emitida.');
  }

  openDanfePrintWindow({
    order,
    settings,
    accessKey: nfeData.accessKey,
    nfeNumber: nfeData.nfeNumber,
    series: nfeData.series || '1',
    protocolNumber: nfeData.protocolNumber || '141260000000000',
    protocolDate: nfeData.protocolDate || new Date().toLocaleString('pt-BR'),
    model: nfeData.model || '55',
    environment: nfeData.environment || 2,
    status: nfeData.status || 'autorizada',
  });
}

/**
 * Avalia se o documento fiscal é elegível para cancelamento fiscal direto
 * Regra: Cancelamento fiscal só é válido se a mercadoria NÃO circulou/saiu e dentro das regras da UF/Modelo
 */
export function canCancelFiscalDocument(doc: {
  status?: string;
  modelo?: '55' | '65';
  created_at?: string;
  xml_protocolo?: string;
  ambiente?: 1 | 2;
  isMerchandiseDelivered?: boolean;
}): { canCancel: boolean; reason?: string } {
  if (!doc) return { canCancel: false, reason: 'Documento não informado' };
  if (
    !['autorizada', 'homologada'].includes(doc.status || '') ||
    (doc.status === 'homologada' && doc.ambiente !== 2)
  ) {
    return { canCancel: false, reason: 'Apenas notas autorizadas podem ser canceladas' };
  }
  if (doc.isMerchandiseDelivered) {
    return {
      canCancel: false,
      reason: 'Mercadoria já entregue/circulou. Necessário emitir NF-e de Devolução de Entrada.',
    };
  }
  const window = getCancellationWindow(
    String(doc.modelo || ''),
    getAuthorizedAt(doc.xml_protocolo, doc.created_at || '')
  );
  if (!window.valid || window.expired) {
    return {
      canCancel: false,
      reason:
        'Prazo normal de cancelamento expirado; avalie NF-e de estorno conforme a regra fiscal.',
    };
  }
  return { canCancel: true };
}

/**
 * Avalia se o documento fiscal permite emissão de Carta de Correção (CC-e)
 * Regra estrita: CC-e é permitida EXCLUSIVAMENTE para NF-e (Mod. 55). NFC-e (Mod. 65) NÃO aceita CC-e (Rejeição SEFAZ).
 */
