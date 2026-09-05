export type MapMarkerType = 'dot' | 'lock' | 'play' | 'check' | 'alert';

/**
 * Cria o SVG do marcador personalizado para o Google Maps Web
 */
export function createMarkerIconSvg(
  color: string,
  type: MapMarkerType,
  isSelected: boolean,
  isStore = false
) {
  if (isStore) {
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#1e3a8a" stroke="#ffffff" stroke-width="3" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))"/>
          <path d="M12 16 L20 10 L28 16 L28 28 L12 28 Z" fill="#ffffff"/>
          <rect x="17" y="21" width="6" height="7" fill="#1e3a8a"/>
        </svg>
      `),
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };
  }

  const borderCol = isSelected ? '#fbbf24' : '#ffffff';
  const borderWidth = isSelected ? '3.5' : '2.5';
  const size = isSelected ? 38 : 32;
  const radius = isSelected ? 15 : 13;
  const cx = size / 2;
  const cy = size / 2;

  let innerSvg = `<circle cx="${cx}" cy="${cy}" r="${isSelected ? 5 : 4}" fill="#ffffff"/>`;

  if (type === 'lock') {
    innerSvg = `
      <g transform="translate(${cx - 6}, ${cy - 7})">
        <rect x="1.5" y="5" width="9" height="7" rx="1.5" fill="#ffffff"/>
        <path d="M3 5 V3.5 A3 3 0 0 1 9 3.5 V5" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
      </g>
    `;
  } else if (type === 'play') {
    innerSvg = `
      <polygon points="${cx - 3},${cy - 5} ${cx + 5},${cy} ${cx - 3},${cy + 5}" fill="#ffffff"/>
    `;
  } else if (type === 'check') {
    innerSvg = `
      <path d="M${cx - 4} ${cy} L${cx - 1} ${cy + 3} L${cx + 5} ${cy - 3}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    `;
  } else if (type === 'alert') {
    innerSvg = `
      <text x="${cx}" y="${cy + 4}" font-size="12" font-weight="900" font-family="sans-serif" fill="#ffffff" text-anchor="middle">!</text>
    `;
  }

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" stroke="${borderCol}" stroke-width="${borderWidth}" filter="drop-shadow(0px 2px 5px rgba(0,0,0,0.35))"/>
        ${innerSvg}
      </svg>
    `),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(cx, cy),
  };
}
