import {
  DeliveryResponsibleItem,
  AvailableStaffMember,
} from './deliveryPreparation.types';
import { hasGrantedNonAccountantAccessProfile } from '../../../../../../shared-utils/operationalCollaborators';

/**
 * Resolve os responsáveis iniciais pela entrega a 0s.
 * Se o pedido já tiver responsáveis persistidos, preserva.
 * Caso contrário, vincula automaticamente o operador logado atual.
 */
export function resolveInitialDeliveryResponsibles(
  order: any,
  userProfile?: any
): DeliveryResponsibleItem[] {
  const d = order?.order_data || order || {};
  if (Array.isArray(d.deliveryResponsibles) && d.deliveryResponsibles.length > 0) {
    return d.deliveryResponsibles;
  }
  if (d.deliveryResponsibleName) {
    return [{ id: d.deliveryResponsibleId, name: d.deliveryResponsibleName }];
  }
  if (!hasGrantedNonAccountantAccessProfile(userProfile || {})) return [];
  const currentName =
    userProfile?.fullName || userProfile?.name || userProfile?.email || 'Operador';
  return [{ id: userProfile?.id, name: currentName, role: userProfile?.role || 'entregador' }];
}

/**
 * Adiciona um responsável à lista evitando duplicatas pelo nome (case-insensitive).
 */
export function addDeliveryResponsible(
  current: DeliveryResponsibleItem[],
  newResp: DeliveryResponsibleItem
): DeliveryResponsibleItem[] {
  const trimmed = (newResp.name || '').trim();
  if (!trimmed) return current;

  const alreadyExists = current.some(
    (r) => (r.name || '').trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (alreadyExists) return current;

  return [...current, { ...newResp, name: trimmed }];
}

/**
 * Remove um responsável pelo índice, garantindo que nunca fique com 0 responsáveis.
 */
export function removeDeliveryResponsible(
  current: DeliveryResponsibleItem[],
  indexToRemove: number
): DeliveryResponsibleItem[] {
  if (current.length <= 1) return current;
  return current.filter((_, i) => i !== indexToRemove);
}

/**
 * Filtra colaboradores que ainda não foram vinculados como responsáveis.
 */
export function filterUnaddedStaff(
  staffList: AvailableStaffMember[],
  currentResponsibles: DeliveryResponsibleItem[]
): AvailableStaffMember[] {
  return staffList.filter(
    (staff) =>
      Boolean(staff.fullName?.trim()) &&
      !currentResponsibles.some(
        (r) =>
          (r.id && r.id === staff.id) ||
          (r.name || '').trim().toLowerCase() === staff.fullName.trim().toLowerCase()
      )
  );
}
