export type OpportunitySeal = {
  id: string;
  name: string;
  slug?: string;
  badge_color?: string;
  border_color?: string;
  image_url?: string;
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
  if (opportunity.image_url) return opportunity.image_url;
  const salvados = `${opportunity.name} ${opportunity.slug || ''}`.toLowerCase().includes('salvad');
  const label = opportunity.name.toUpperCase();
  const width = 800;
  const height = 200;
  const background = salvados ? '#f97316' : resolveColor(opportunity.badge_color, '#dc2626');
  const border = salvados ? '#ea580c' : resolveColor(opportunity.border_color, background);
  const foreground = salvados ? '#000000' : '#ffffff';
  const flame = salvados ? `<path d="M56 18c8 14-4 19 2 31 2 4 6 7 11 7 10 0 17-8 17-18 0-8-5-16-14-25 1 11-5 17-10 19 1-9-2-18-10-26 1 9-6 15-10 21-4 6-6 12-6 18 0 15 12 27 27 27 16 0 29-12 29-29 0-14-9-29-26-43 3 13-2 20-9 25 0-10-5-18-11-25Z" fill="${foreground}" transform="translate(42 34) scale(1.8)"/>` : '';
  const textX = salvados ? width / 2 + 45 : width / 2;
  const fontSize = Math.max(34, Math.min(62, 660 / Math.max(label.length, 1) * 1.65));
  const escapedLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="6" y="6" width="788" height="188" rx="34" fill="${background}" stroke="${border}" stroke-width="12"/>${flame}<text x="${textX}" y="104" text-anchor="middle" dominant-baseline="middle" fill="${foreground}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="900">${escapedLabel}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
