import Order from '../../../types/order.type';
import { buttons } from './orderActionsConfig';
import { POST_RETURN_ACTION_KEYS, POST_SALE_ACTION_KEYS } from '../../../utils/postSaleActions';
import { isIdentifiedTestArtifact } from '../../../../../../shared-utils/testArtifactPolicy';

export const DELIVERY_ACTION_KEYS = new Set([
  'printShippingOrder',
  'sendShippingOrder',
  'sendCustomerOrder',
  'sendCustomerOrderDirectApi',
]);

export type PostOrderButtonConfig = (typeof buttons)[number];

export function getAvailablePostOrderActions(order: Order): PostOrderButtonConfig[] {
  const isReturnOrder = order.orderType === 'return';
  const isCollectionScheduled =
    order.status === 'scheduled' &&
    (order.returnMethod === 'store_collection' || order.returnMethod == null);
  const isTestArtifact = isIdentifiedTestArtifact(order);

  return buttons.filter(
    (btn) =>
      (isReturnOrder ? POST_RETURN_ACTION_KEYS : POST_SALE_ACTION_KEYS).has(btn.key) &&
      (isReturnOrder || !DELIVERY_ACTION_KEYS.has(btn.key)) &&
      (btn.key !== 'sendReturnOSTeam' || isCollectionScheduled) &&
      (!isReturnOrder || !isTestArtifact || !btn.key.startsWith('sendReturnOS')) &&
      (btn.key !== 'sendCustomerReviews' || !order.reviewRequested)
  );
}

export function resolvePostOrderButtonColorClass(colorClass: string): string {
  if (colorClass.includes('amber') || colorClass.includes('yellow')) {
    return 'text-[#3b1900] bg-amber-400 hover:bg-amber-300 border border-amber-500 shadow-sm dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40';
  }
  if (colorClass.includes('green')) {
    return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
  }
  if (colorClass.includes('purple')) {
    return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
  }
  if (colorClass.includes('orange')) {
    return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
  }
  if (colorClass.includes('indigo')) {
    return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
  }
  return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
}
