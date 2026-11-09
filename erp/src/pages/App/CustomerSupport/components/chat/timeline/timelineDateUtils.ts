import type { WhatsAppMessage } from '../../../types';

export interface MessageDateGroup {
  dateLabel: string;
  items: WhatsAppMessage[];
}

export function groupMessagesByDate(
  messages: WhatsAppMessage[]
): MessageDateGroup[] {
  const groups: { [key: string]: WhatsAppMessage[] } = {};

  for (const msg of messages) {
    const d = new Date(msg.timestamp);
    const dateKey = !isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : 'Desconhecida';

    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
  }

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  return Object.keys(groups).map((key) => {
    let dateLabel: string;
    if (key === todayKey) {
      dateLabel = 'Hoje';
    } else if (key === yesterdayKey) {
      dateLabel = 'Ontem';
    } else if (key === 'Desconhecida') {
      dateLabel = 'Data desconhecida';
    } else {
      const [y, m, d] = key.split('-');
      dateLabel = `${d}/${m}/${y}`;
    }

    return {
      dateLabel,
      items: groups[key],
    };
  });
}
