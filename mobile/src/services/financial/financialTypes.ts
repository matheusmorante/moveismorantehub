export type IntentType =
  | 'SINGLE_TRANSACTION'
  | 'RECURRING'
  | 'PAYABLE_BILL'
  | 'INSTALLMENT'
  | 'MATCH_EXISTING'
  | 'QUERY_OR_UPDATE';

export interface InstallmentItemDraft {
  number: number;
  amount: number;
  dueDate?: string | null;
}

export interface ParsedFinancialIntent {
  intentType?: IntentType;
  type?: 'income' | 'expense' | null;
  amount?: number | null;
  description?: string | null;
  categoryName?: string | null;
  categoryId?: string | null;
  date?: string | null;
  paymentMethod?: string | null;
  purpose?: 'BUSINESS' | 'PERSONAL_PARTNER' | 'NOT_INFORMED' | null;
  vehicleId?: string | null;
  vehicle?: string | null;
  counterparty?: string | null;

  // Recorrência
  frequency?: 'Mensal' | 'Semanal' | 'Anual' | null;
  dueDay?: number | null;
  startDate?: string | null;
  // Finalidade do Gasto
  businessPurpose?: 'BUSINESS' | 'PERSONAL' | 'PERSONAL_PARTNER' | 'UNKNOWN' | null;

  // Empréstimo e Credor
  creditor?: string | null;
  creditorType?: 'FINANCIAL_INSTITUTION' | 'PERSON_OR_OTHER' | 'UNKNOWN' | null;
  isLoan?: boolean;

  // Estimativa / Incerteza (DECISION-003)
  isEstimated?: boolean;
  estimationNote?: string | null;

  // Lançamentos múltiplos em lote (DECISION-001)
  batchDraftsList?: ParsedFinancialIntent[] | null;
  isRealized?: boolean;
  rememberedUnrealizedFacts?: any[] | null;

  // Conta a Pagar (Boleto/Agendamento)
  dueDate?: string | null;
  supplier?: string | null;

  // Parcelamento detalhado
  installmentsCount?: number | null;
  installmentAmount?: number | null;
  totalAmount?: number | null;
  installmentList?: InstallmentItemDraft[] | null;

  // Match existente / Alteração
  matchedAccount?: any | null;
  candidateAccounts?: any[] | null;
  fieldToUpdate?: 'amount' | 'dueDate' | 'paymentMethod' | 'description' | null;
  newValue?: string | number | null;

  missingFields: string[];
  unknownByUser?: string[];
  questionToUser?: string | null;
  confidence?: number;
  isReadyForConfirmation: boolean;
  validationStatus?: 'needs_input' | 'ready';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  parsedIntent?: ParsedFinancialIntent | null;
  timestamp: string;
  parentMessageId?: string | null;
  version?: number;
  status?: 'ACTIVE' | 'SUPERSEDED' | 'BRANCH_INACTIVE' | 'RESOLVED';
  editedAt?: string | null;
  isAlert?: boolean;
}
