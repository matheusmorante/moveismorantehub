export interface SmartAIFillModalProps {
  isOpen: boolean;
  onClose: () => void | Promise<void>;
  onApplyData: (data: any) => void | boolean | Promise<void | boolean>;
  contextKey?: string;
  onStartLiveMode?: () => void;
  sellerList?: string[];
}

export interface SmartAIFillIdentifiedFields {
  clientName?: string;
  clientPhone?: string;
  itemsCount?: number;
  totalAmount?: number | string;
  [key: string]: unknown;
}

export interface SmartAIFillParsedResult {
  summary: string;
  rawJSON: unknown;
  identifiedFields?: SmartAIFillIdentifiedFields;
  warnings?: string[];
  missingRequiredFields?: string[];
}

export type SmartAIFillTab = 'ai' | 'json_manual';
