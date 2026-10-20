import { toast } from 'react-toastify';
import type Item from '@/pages/types/items.type';
import type Order from '@/pages/types/order.type';
import {
  emitNfeForOrder,
  type NfeEmissionResult,
  updateFiscalNumberPreviewCache,
} from '@/pages/utils/nfe/nfeService';
import type { NfeItemWithFiscal } from '../../NfeItemsSection';
import type { NfeSequencePreviewState } from '../../types/nfeEmission.types';
import type { ThirdPartyTransporterForm } from '../../NfeTransportSection';
import type { resolveTransport } from '../../../../../../../../../shared-utils/fiscalTransportModel';
import type { XmlPreviewState } from './actions.types';
import {
  createPreviewContextKey,
  notifyEmissionIssue,
} from '../../services/nfePreviewContextService';

export function buildOrderWithFiscalItems(order: Order, nfeItems: NfeItemWithFiscal[]): Order {
  return {
    ...order,
    items: [
      ...nfeItems.map((item): Item => ({ ...item, fiscal: item.fiscal })),
      ...(order.items || []).filter((item) => item.itemType === 'service'),
    ],
  };
}

export interface ExecuteEmissionParams {
  order: Order;
  nfeItems: NfeItemWithFiscal[];
  environment: 1 | 2;
  productionConfirmed: boolean;
  retryId?: string;
  manualNumber?: number;
  recipientTaxId: string;
  recipientIe?: string;
  recipientIeIndicator?: '1' | '2' | '9';
  finalConsumer?: boolean;
  resolvedTransport: ReturnType<typeof resolveTransport>;
  thirdPartyTransporter: ThirdPartyTransporterForm;
  shouldStartFreshHmlEmission: boolean;
  previewOnly: boolean;
  xmlPreview: XmlPreviewState | null;
  existingEmissionRequestId?: string;
  nfeNumberSequence: { model: '55' | '65'; series: string | null; environment: 1 | 2 };
  manualNumberInput: string | null;
  freshHmlEmission: boolean;
  isCurrent: () => boolean;
  setXmlPreview: (preview: XmlPreviewState | null) => void;
  setIsXmlPreviewOpen: (open: boolean) => void;
  setEmissionResult: (res: NfeEmissionResult | null) => void;
  setNumberPreviewState: (state: NfeSequencePreviewState | null) => void;
  onSuccess?: (result: NfeEmissionResult) => void;
}

export async function executeEmissionPipeline({
  order,
  nfeItems,
  environment,
  productionConfirmed,
  retryId,
  manualNumber,
  recipientTaxId,
  recipientIe,
  recipientIeIndicator,
  finalConsumer,
  resolvedTransport,
  thirdPartyTransporter,
  shouldStartFreshHmlEmission,
  previewOnly,
  xmlPreview,
  existingEmissionRequestId,
  nfeNumberSequence,
  manualNumberInput,
  freshHmlEmission,
  isCurrent,
  setXmlPreview,
  setIsXmlPreviewOpen,
  setEmissionResult,
  setNumberPreviewState,
  onSuccess,
}: ExecuteEmissionParams): Promise<void> {
  const orderWithFiscalItems = buildOrderWithFiscalItems(order, nfeItems);

  const res = await emitNfeForOrder(
    orderWithFiscalItems,
    environment,
    productionConfirmed,
    retryId,
    manualNumber,
    (order.items || [])
      .filter((item) => item.itemType !== 'service')
      .map((item) => String(item.fiscal?.ncm || '')),
    recipientTaxId,
    finalConsumer,
    resolvedTransport.isEmitterTransporter,
    true,
    resolvedTransport.requiresTransporterData ? thirdPartyTransporter : undefined,
    resolvedTransport.modFrete,
    resolvedTransport.hasTransport,
    resolvedTransport.transportResponsible !== 'NONE'
      ? resolvedTransport.transportResponsible
      : undefined,
    resolvedTransport.freightContractResponsible,
    shouldStartFreshHmlEmission,
    recipientIe,
    recipientIeIndicator,
    {
      previewOnly,
      ...(!previewOnly && !retryId && xmlPreview ? { previewProof: xmlPreview.proof } : {}),
      ...(existingEmissionRequestId ? { existingEmissionRequestId } : {}),
    }
  );

  if (!isCurrent()) return;

  if (previewOnly) {
    if (res.success && res.preview && res.xml && res.previewProof) {
      setXmlPreview({
        xml: res.xml,
        proof: res.previewProof,
        contextKey: createPreviewContextKey({
          order,
          environment,
          currentModel: nfeNumberSequence.model,
          nfeItems,
          finalConsumer,
          recipientTaxId,
          recipientIe,
          recipientIeIndicator,
          resolvedTransport,
          thirdPartyTransporter,
          manualNumberInput: freshHmlEmission ? null : manualNumberInput,
        }),
        freshHmlEmission,
      });
      setIsXmlPreviewOpen(true);
      toast.success(
        'Prévia pronta. Este XML ainda não foi transmitido nem autorizado pela SEFAZ.'
      );
    } else {
      setXmlPreview(null);
      setIsXmlPreviewOpen(false);
      toast.error(res.error || 'Não foi possível preparar a prévia do XML.');
    }
    return;
  }

  setXmlPreview(null);
  setIsXmlPreviewOpen(false);

  if (!res.success) {
    setEmissionResult(res);
    if (res.numberConflict?.nextNumber) {
      if (nfeNumberSequence.series) {
        updateFiscalNumberPreviewCache(
          nfeNumberSequence.model,
          environment,
          nfeNumberSequence.series,
          res.numberConflict.nextNumber
        );
      }
      setNumberPreviewState({
        number: String(res.numberConflict.nextNumber),
        model: nfeNumberSequence.model,
        series: nfeNumberSequence.series || '',
        environment,
      });
    }
    notifyEmissionIssue(res);
    return;
  }

  setEmissionResult(res);
  if (res.nfeNumber && nfeNumberSequence.series) {
    updateFiscalNumberPreviewCache(
      nfeNumberSequence.model,
      environment,
      nfeNumberSequence.series,
      res.nfeNumber + 1
    );
    setNumberPreviewState({
      number: String(res.nfeNumber),
      model: nfeNumberSequence.model,
      series: nfeNumberSequence.series,
      environment,
    });
  }
  toast.success(
    res.environment === 2
      ? 'Documento autorizado pela SEFAZ em homologação (sem valor fiscal).'
      : 'Documento autorizado pela SEFAZ em produção.'
  );
  if (onSuccess) onSuccess(res);
}
