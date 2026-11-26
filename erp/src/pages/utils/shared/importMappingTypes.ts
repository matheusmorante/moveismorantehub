export type EntityType = 'product' | 'variation' | 'customer' | 'supplier' | 'order' | 'receivable';

export interface ColumnMapping {
  erpField: string;
  csvHeader: string;
  defaultValue?: any;
  transform?: (value: string) => any;
}

export interface ImportConfig {
  id: string;
  name: string;
  entityType: EntityType;
  delimiter: string;
  mappings: ColumnMapping[];
}

