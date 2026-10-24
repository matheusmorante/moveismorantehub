import {
  fetchProductReconciliationSelectionWithClient,
  fetchProductsForReconciliationWithClient,
  fetchRequiredCategoryAttributesWithClient,
} from '../../../../../../../shared-utils/productReconciliationQueries';
import { supabase } from '../../../../utils/supabaseConfig';
import { isWeightCharacteristicName } from '@/pages/utils/technicalValuesService';
import type { ReconciliationFilterState } from '../types/reconciliation.types';

export const fetchRequiredCategoryAttributes = () =>
  fetchRequiredCategoryAttributesWithClient(supabase, isWeightCharacteristicName);

export const fetchProductsForReconciliation = (
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

export const fetchProductReconciliationSelection = (filters: ReconciliationFilterState = {}) =>
  fetchProductReconciliationSelectionWithClient(supabase, isWeightCharacteristicName, filters);
