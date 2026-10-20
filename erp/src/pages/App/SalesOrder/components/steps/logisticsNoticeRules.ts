import { splitNoticeTags, joinNoticeTags } from '@/pages/utils/noticeTags';
import { requiresAssemblyResponsible } from '../../../../../../../shared-utils/commercialOrderRules';

export const CALL_BEFORE_DELIVERY_NOTICE = 'Ligar antes da entrega';
export const BRING_CARD_MACHINE_NOTICE = 'Levar máquina de cartão';
export const CALL_ON_ARRIVAL_NOTICE = 'Ligar ao chegar';

export const DELIVERY_NOTICE_OPTIONS = [
  {
    field: 'callBeforeDelivery',
    label: `${CALL_BEFORE_DELIVERY_NOTICE}?`,
    notice: CALL_BEFORE_DELIVERY_NOTICE,
  },
  {
    field: 'bringCardMachine',
    label: `${BRING_CARD_MACHINE_NOTICE}?`,
    notice: BRING_CARD_MACHINE_NOTICE,
  },
  { field: 'callOnArrival', label: `${CALL_ON_ARRIVAL_NOTICE}?`, notice: CALL_ON_ARRIVAL_NOTICE },
] as const;

export const normalizeNotice = (notice: string) => notice.trim().toLocaleLowerCase('pt-BR');

export const ASSEMBLY_RESPONSIBLE_NOTICES = {
  'Nossa equipe': 'Montagem na entrega - pela nossa equipe',
  'Montador terceirizado': 'Montagem na entrega - por montador terceirizado',
} as const;

export const hasPendingCardOnDelivery = (
  orderType: string,
  deliveryMethod: string,
  payments: Array<{ method?: string; status?: string }>
) =>
  orderType === 'sale' &&
  deliveryMethod === 'delivery' &&
  payments.some(
    ({ method, status }) =>
      status === 'Pendente' &&
      (method === 'Cartão de Débito' || Boolean(method?.startsWith('Cartão de Crédito')))
  );

export interface SyncNoticesParams {
  rawObservation: string;
  isSaleDelivery: boolean;
  shipping: Record<string, any>;
  items: Array<{ handlingType?: string; assemblyResponsible?: string }>;
}

export const syncDeliveryAndAssemblyNotices = ({
  rawObservation,
  isSaleDelivery,
  shipping,
  items,
}: SyncNoticesParams): { nextObservation: string; changed: boolean } => {
  let notices = splitNoticeTags(rawObservation);
  let noticesChanged = false;

  for (const option of DELIVERY_NOTICE_OPTIONS) {
    const shouldShowNotice = isSaleDelivery && shipping[option.field] === true;
    const hasNotice = notices.some(
      (notice) => normalizeNotice(notice) === normalizeNotice(option.notice)
    );

    if (shouldShowNotice && !hasNotice) {
      notices = [...notices, option.notice];
      noticesChanged = true;
    } else if (!shouldShowNotice && hasNotice) {
      notices = notices.filter(
        (notice) => normalizeNotice(notice) !== normalizeNotice(option.notice)
      );
      noticesChanged = true;
    }
  }

  const assemblyNotices = new Set(
    isSaleDelivery
      ? items.flatMap((item) => {
          if (!requiresAssemblyResponsible(item.handlingType, shipping.deliveryMethod)) {
            return [];
          }
          if (item.assemblyResponsible === 'Nossa equipe') {
            return [ASSEMBLY_RESPONSIBLE_NOTICES['Nossa equipe']];
          }
          if (item.assemblyResponsible === 'Montador terceirizado') {
            return [ASSEMBLY_RESPONSIBLE_NOTICES['Montador terceirizado']];
          }
          return [];
        })
      : []
  );

  for (const managedNotice of Object.values(ASSEMBLY_RESPONSIBLE_NOTICES)) {
    const noticeIndex = notices.findIndex(
      (notice) => normalizeNotice(notice) === normalizeNotice(managedNotice)
    );
    const shouldShowNotice = assemblyNotices.has(managedNotice);

    if (shouldShowNotice && noticeIndex === -1) {
      notices = [...notices, managedNotice];
      noticesChanged = true;
    } else if (shouldShowNotice && notices[noticeIndex] !== managedNotice) {
      notices[noticeIndex] = managedNotice;
      noticesChanged = true;
    } else if (!shouldShowNotice && noticeIndex !== -1) {
      notices = notices.filter(
        (notice) => normalizeNotice(notice) !== normalizeNotice(managedNotice)
      );
      noticesChanged = true;
    }
  }

  return {
    nextObservation: noticesChanged ? joinNoticeTags(notices) : rawObservation,
    changed: noticesChanged,
  };
};
