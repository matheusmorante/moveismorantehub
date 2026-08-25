export type OpportunitySeal = {
  id: string;
  name: string;
  slug?: string;
  badge_color?: string;
  border_color?: string;
};

const colors: Record<string, string> = {
  'red-600': '#dc2626', 'orange-500': '#f97316', 'orange-600': '#ea580c',
  'amber-600': '#d97706', 'purple-600': '#7c3aed', 'blue-600': '#2563eb',
  'green-600': '#16a34a', 'pink-600': '#db2777', 'teal-600': '#0d9488',
  'amber-500': '#f59e0b', 'purple-500': '#8b5cf6', 'red-500': '#ef4444',
};

const resolveColor = (value = '', fallback: string) => {
  if (value.startsWith('#')) return value;
  const key = Object.keys(colors).find(color => value.includes(color));
  return key ? colors[key] : fallback;
};

export function createOpportunitySealImage(opportunity: OpportunitySeal) {
  const salvados = `${opportunity.name} ${opportunity.slug || ''}`.toLowerCase().includes('salvad');
  const label = opportunity.name.toUpperCase();
  const width = Math.max(220, Math.min(560, label.length * 15 + (salvados ? 78 : 42)));
  const background = salvados ? '#f97316' : resolveColor(opportunity.badge_color, '#dc2626');
  const border = salvados ? '#ea580c' : resolveColor(opportunity.border_color, background);
  const foreground = salvados ? '#000000' : '#ffffff';
  const flame = salvados ? `<path d="M56 18c8 14-4 19 2 31 2 4 6 7 11 7 10 0 17-8 17-18 0-8-5-16-14-25 1 11-5 17-10 19 1-9-2-18-10-26 1 9-6 15-10 21-4 6-6 12-6 18 0 15 12 27 27 27 16 0 29-12 29-29 0-14-9-29-26-43 3 13-2 20-9 25 0-10-5-18-11-25Z" fill="${foreground}" transform="translate(-30 3) scale(.72)"/>` : '';
  const textX = salvados ? width / 2 + 17 : width / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="72" viewBox="0 0 ${width} 72"><rect x="2" y="2" width="${width - 4}" height="68" rx="14" fill="${background}" stroke="${border}" stroke-width="4"/>${flame}<text x="${textX}" y="38" text-anchor="middle" dominant-baseline="middle" fill="${foreground}" font-family="Arial,sans-serif" font-size="22" font-weight="900">${label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
