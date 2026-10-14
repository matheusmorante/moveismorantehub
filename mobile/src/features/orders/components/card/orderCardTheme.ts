/**
 * Funções puras de tema e paleta visual dos cards de pedidos.
 * Mantém harmonia com o ERP Móveis Morante.
 */

export interface StatusConfig {
  bg: string;
  border: string;
  icon: 'draft' | 'scheduled' | 'fulfilled' | 'cancelled';
}

export const getStatusConfig = (value: string): StatusConfig => {
  const status = String(value || '').toLowerCase();
  if (/draft|rascunh/.test(status)) {
    return { bg: '#64748b', border: '#475569', icon: 'draft' };
  }
  if (/sched|agendad/.test(status)) {
    return { bg: '#f59e0b', border: '#d97706', icon: 'scheduled' };
  }
  if (/fulfill|atendid|concluid|finaliz|entreg/.test(status)) {
    return { bg: '#10b981', border: '#059669', icon: 'fulfilled' };
  }
  if (status.includes('cancel')) {
    return { bg: '#f43f5e', border: '#e11d48', icon: 'cancelled' };
  }
  return { bg: '#64748b', border: '#475569', icon: 'draft' };
};

export interface HeaderColorParams {
  dark: boolean;
  cancelled: boolean;
  isDraft: boolean;
  isBudget: boolean;
  isReturn: boolean;
  isAssistance: boolean;
  pickup: boolean;
}

export const resolveHeaderColors = ({
  dark,
  cancelled,
  isDraft,
  isBudget,
  isReturn,
  isAssistance,
  pickup,
}: HeaderColorParams): { headerBg: string; headerBorder: string } => {
  if (cancelled) {
    return {
      headerBg: dark ? '#450a0a' : '#fee2e2',
      headerBorder: dark ? '#7f1d1d' : '#fca5a5',
    };
  }
  if (isDraft) {
    return {
      headerBg: dark ? '#334155' : '#f1f5f9',
      headerBorder: dark ? '#475569' : '#e2e8f0',
    };
  }
  if (isBudget) {
    return {
      headerBg: dark ? '#1e1b4b' : '#c7d2fe',
      headerBorder: dark ? '#312e81' : '#a5b4fc',
    };
  }
  if (isReturn) {
    return {
      headerBg: dark ? '#451a03' : '#fde68a',
      headerBorder: dark ? '#78350f' : '#fcd34d',
    };
  }
  if (isAssistance) {
    return {
      headerBg: dark ? '#431407' : '#fed7aa',
      headerBorder: dark ? '#7c2d12' : '#fdba74',
    };
  }
  if (pickup) {
    return {
      headerBg: dark ? '#3b0764' : '#e9d5ff',
      headerBorder: dark ? '#581c87' : '#d8b4fe',
    };
  }
  return {
    headerBg: dark ? '#022c22' : '#a7f3d0',
    headerBorder: dark ? '#065f46' : '#6ee7b7',
  };
};
