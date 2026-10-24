import { supabase } from '../../../../utils/supabaseConfig';
import { saveProductReconciliationWithClient } from '../../../../../../../shared-utils/productReconciliationMutations';
import { applyProductReconciliationBatchWithClient } from '../../../../../../../shared-utils/productReconciliationBatchMutations';
import type { ReconciliationBatchInput, ReconciliationProductValues } from '../../../../../../../shared-utils/reconciliationFormSchemas';

export const applySupplierBatch = (productIds: string[], supplierId: string, replaceExisting = true) =>
  applyProductReconciliationBatchWithClient(supabase, { operation: 'supplier', productIds, supplierId, replaceExisting });

export const applyCategoryBatch = (productIds: string[], categoryId: string) =>
  applyProductReconciliationBatchWithClient(supabase, { operation: 'category', productIds, categoryId });

export const applyNcmBatch = (productIds: string[], ncm: string) =>
  applyProductReconciliationBatchWithClient(supabase, { operation: 'ncm', productIds, ncm });

export const applyAttributeBatch = (productIds: string[], name: string, value: string) =>
  applyProductReconciliationBatchWithClient(supabase, { operation: 'attribute', productIds, name, value });

export const saveSingleProductReconciliation = (
  productUpdates: ReconciliationProductValues['productUpdates'],
  variationUpdates?: ReconciliationProductValues['variationUpdates']
) => saveProductReconciliationWithClient(supabase, productUpdates, variationUpdates);
