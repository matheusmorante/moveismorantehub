import { determineResultNature } from '@/services/finance/financeDomain';
import { payablesAndReceivablesService } from '@/services/finance/payablesAndReceivablesService';
import { transactionsAndRedeService } from '@/services/finance/transactionsAndRedeService';

export {
  determineResultNature,
  type FinanceDashboardForecastSummary,
  type FinancePayablesPage,
  type FinanceReceivablesPage,
  type FinancialTransactionPage,
  type FinancialTransactionPageFilters,
  type PayableCategoryOption,
} from '@/services/finance/financeDomain';

export const financeService = {
  determineResultNature,
  ...payablesAndReceivablesService,
  ...transactionsAndRedeService,
};
