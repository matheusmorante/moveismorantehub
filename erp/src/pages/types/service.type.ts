export type ServiceNfeComposition =
  | 'not_reviewed'
  | 'include_with_merchandise'
  | 'separate_document';

export type ServiceFiscalTreatment = {
  nfeComposition: ServiceNfeComposition;
  incorporationConfirmed?: boolean;
  validationReference?: string;
  validatedAt?: string;
  validatedBy?: string;
};

export type ServiceFiscalSnapshot = ServiceFiscalTreatment & {
  catalogServiceId?: string;
};

export type Service = {
  id?: string;
  description: string;
  unitPrice: number;
  costPrice?: number;
  /** Fiscal treatment used only by NF-e composition; copied to each order item as a snapshot. */
  fiscalTreatment?: ServiceFiscalTreatment;
  active: boolean;
  isDraft?: boolean;
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ServiceVisibilitySettings = {
  id: boolean;
  description: boolean;
  unitPrice: boolean;
  actions: boolean;
};

export default Service;
