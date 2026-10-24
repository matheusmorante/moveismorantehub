import {
  fetchProductsForReconciliationWithClient,
  fetchProductReconciliationSelectionWithClient,
} from '../../../../../shared-utils/productReconciliationQueries';
import {
  saveProductReconciliationWithClient,
} from '../../../../../shared-utils/productReconciliationMutations';
import { applyProductReconciliationBatchWithClient } from '../../../../../shared-utils/productReconciliationBatchMutations';
import { saveAttributeValueWithClient } from '../../../../../shared-utils/productAttributeValueService';
import {
  searchReconciliationSuppliersWithClient,
} from '../../../../../shared-utils/productReconciliationSupplierSearch';
import type { ReconciliationBatchInput, ReconciliationProductValues } from '../../../../../shared-utils/reconciliationFormSchemas';
import type {
  ReconciliationFilterState,
} from '../../../../../shared-utils/productReconciliationTypes';
import type { ReconciliationBatchSelectionItem } from '../../../../../shared-utils/productReconciliationTypes';
import { supabase } from '../../../services/supabaseClient';
import { isWeightCharacteristicName } from '../domain/productCharacteristics';

export const fetchMobileProductReconciliation = (
  page = 1,
  pageSize = 15,
  filters: ReconciliationFilterState = {}
) =>
  fetchProductsForReconciliationWithClient(
    supabase,
    isWeightCharacteristicName,
    page,
    pageSize,
    filters
  );

export const fetchMobileProductReconciliationSelection = (
  filters: ReconciliationFilterState = {}
): Promise<ReconciliationBatchSelectionItem[]> =>
  fetchProductReconciliationSelectionWithClient(supabase, isWeightCharacteristicName, filters);

export const searchMobileReconciliationSuppliers = (search: string) =>
  searchReconciliationSuppliersWithClient(supabase, search);

export const saveMobileReconciliationAttributeValue = (attributeId: string, value: string) =>
  saveAttributeValueWithClient(supabase, attributeId, value);

export const saveMobileProductReconciliation = (
  productUpdates: ReconciliationProductValues['productUpdates'],
  variationUpdates?: ReconciliationProductValues['variationUpdates']
) => saveProductReconciliationWithClient(supabase, productUpdates, variationUpdates);

export const applyMobileProductReconciliationBatch = (input: ReconciliationBatchInput) =>
  applyProductReconciliationBatchWithClient(supabase, input);
