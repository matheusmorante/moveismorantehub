import type {
  FiscalOrderEditAudit,
  FiscalOrderEditChange,
  FiscalOrderEditDocument,
} from '@/pages/utils/nfe/orderEditFiscalService';

export interface FiscalOrderEditConfirmDialogProps {
  readonly audit: FiscalOrderEditAudit;
  readonly isConfirmingFiscalEdit: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onNavigateToReturns?: () => void;
}

export interface FiscalOrderEditPolicyAlertProps {
  readonly isBlocked: boolean;
  readonly isProduction: boolean;
  readonly error?: string;
}

export interface FiscalOrderEditDocumentsListProps {
  readonly documents: FiscalOrderEditDocument[];
  readonly generalError?: string;
}

export interface FiscalOrderEditFieldDiffProps {
  readonly changes: FiscalOrderEditChange[];
}
