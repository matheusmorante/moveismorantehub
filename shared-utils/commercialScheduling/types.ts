import type Shipping from '../erp/src/pages/types/Shipping.type';

export type ValidationErrors = Record<string, string>;

export interface SaoPauloDayInfo {
  /** YYYY-MM-DD */
  isoDate: string;
  /** DD/MM/YYYY */
  brDate: string;
  /** DD/MM/YYYY */
  formattedDate: string;
  /** Dia da semana em português (ex.: "quinta-feira", "sexta-feira") */
  weekday: string;
}

export interface ScheduleOptionLike {
  id?: string;
  date?: string | null;
  endDate?: string | null;
  dateType?: 'fixed' | 'range' | string | null;
  time?: string | null;
  period?: 'morning' | 'afternoon' | 'full_day' | string | null;
  scheduleMode?: 'period' | 'time' | string | null;
  startTime?: string | null;
  endTime?: string | null;
  type?: 'fixed' | 'range' | string | null;
  notes?: string | null;
}

export interface ResolvedScheduleOption {
  id: string;
  index: number;
  isAlternative: boolean;
  label: string;
  shortLabel: string;
  date: string;
  endDate: string;
  dateType: 'fixed' | 'range';
  time: string;
  period?: string;
  startTime: string;
  endTime: string;
  type: 'fixed' | 'range';
  notes?: string;
  formattedDate: string;
  formattedTime: string;
  formattedSummary: string;
  cutoffDate: string;
  cutoffTime: string;
  hasPassed: boolean;
}

export interface EffectiveScheduleResolution {
  primary: ResolvedScheduleOption | null;
  defined: ResolvedScheduleOption | null;
  alternatives: ResolvedScheduleOption[];
  hasAlternatives: boolean;
  allOptions: ResolvedScheduleOption[];
  effective: ResolvedScheduleOption | null;
  isUsingAlternative: boolean;
  isRepositioned: boolean;
  repositionedFrom: ResolvedScheduleOption | null;
  alternativesSummaryText: string;
}
