import { PackagePlus, PackageMinus, Scale } from 'lucide-react-native';
import type { StockMove } from '../../../types/stock.types';

export const getTypeVisualConfig = (move: StockMove, isDarkMode: boolean) => {
  const isEntry = move.type === 'in' || move.type === 'entry';
  const isExit = move.type === 'out' || move.type === 'exit' || move.type === 'withdrawal';

  let TypeIcon = Scale;
  let typeText = 'AJUSTE';
  let typeColor = isDarkMode ? '#fdb95b' : '#d97706';
  let typeBg = isDarkMode ? 'rgba(253,185,91,0.15)' : '#fef3c7';
  let typeBorder = isDarkMode ? '#a16207' : '#fde68a';

  if (isEntry) {
    TypeIcon = PackagePlus;
    typeText = 'ENTRADA';
    typeColor = isDarkMode ? '#4ade80' : '#16a34a';
    typeBg = isDarkMode ? 'rgba(74,222,128,0.15)' : '#dcfce7';
    typeBorder = isDarkMode ? '#166534' : '#bbf7d0';
  } else if (isExit) {
    TypeIcon = PackageMinus;
    typeText = 'SAÍDA';
    typeColor = isDarkMode ? '#f87171' : '#dc2626';
    typeBg = isDarkMode ? 'rgba(248,113,113,0.15)' : '#fee2e2';
    typeBorder = isDarkMode ? '#991b1b' : '#fecaca';
  }

  return { TypeIcon, typeText, typeColor, typeBg, typeBorder, isEntry, isExit };
};

export const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const formatDateAndTime = (createdAt: string) => {
  const dateObj = new Date(createdAt);
  const dateStr = dateObj.toLocaleDateString('pt-BR');
  const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { dateStr, timeStr };
};

export const getReversedLabel = (isReversed: boolean, reversedAt?: string | null): string => {
  if (isReversed && reversedAt) {
    const r = new Date(reversedAt);
    return `Estornado em ${r.toLocaleDateString('pt-BR')} as ${r.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }
  return '';
};

export const parseObservationAndReason = (move: StockMove, isReversed: boolean) => {
  let obsText = move.observation || '';
  if (obsText.startsWith('{') || obsText.startsWith('[')) {
    try {
      const p = JSON.parse(obsText);
      if (typeof (p.note || p.observation || p.reason) === 'string') {
        obsText = p.note || p.observation || p.reason;
      }
    } catch {
      obsText = move.observation || '';
    }
  }

  const reasonText =
    move.reversalReason ||
    (isReversed && typeof move.observation === 'string' && !move.observation.startsWith('{')
      ? move.observation
      : '');

  const finalObs =
    isReversed && reasonText
      ? obsText && obsText !== reasonText
        ? `Original: ${obsText} | Estorno: ${reasonText}`
        : reasonText
      : obsText;

  const obsLabel = isReversed && reasonText ? 'MOTIVO/OBS:' : 'OBSERVACAO:';

  return { finalObs, obsLabel, reasonText };
};

export const getQuantityDisplay = (
  move: StockMove,
  isEntry: boolean,
  isExit: boolean,
  isDarkMode: boolean
) => {
  const qtyPrefix = isEntry ? '+' : isExit ? '-' : '';
  const displayedQuantity =
    isEntry || isExit ? Math.abs(Number(move.quantity || 0)) : Number(move.quantity || 0);

  const qtyColor = isEntry
    ? isDarkMode
      ? '#4ade80'
      : '#16a34a'
    : isExit
      ? isDarkMode
        ? '#f87171'
        : '#dc2626'
      : isDarkMode
        ? '#fdb95b'
        : '#d97706';

  return { qtyPrefix, displayedQuantity, qtyColor };
};
