import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

export interface BaseTechnicalInputProps {
  disabled?: boolean;
  isInvalid?: boolean;
  compact?: boolean;
}

export interface TechnicalFieldInputProps extends BaseTechnicalInputProps {
  field: TechnicalFieldDefinition;
  value: any;
  placeholder?: string;
  onChange: (value: any) => void;
}
