export interface Assembly {
  id: string;
  item: string;
  date: string;
  time: string;
  type: 'delivery' | 'showroom';
  status: 'pending' | 'completed';
  order_id?: number | null;
  created_at: string;
}

export function groupAssembliesByDateLabel(
  assemblies: Assembly[]
): Array<[string, Assembly[]]> {
  const grouped = assemblies.reduce(
    (acc, as) => {
      const d = new Date(as.date + 'T00:00:00');
      const today = new Date();
      let key = d.toLocaleDateString('pt-BR');
      if (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      ) {
        key = 'PARA HOJE';
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(as);
      return acc;
    },
    {} as Record<string, Assembly[]>
  );

  return Object.entries(grouped);
}
