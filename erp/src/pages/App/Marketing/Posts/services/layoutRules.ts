import { Layer } from '../types';
const cells = {
  TOP_LEFT: [0, 0, 1 / 3, 1 / 3], TOP_CENTER: [1 / 3, 0, 2 / 3, 1 / 3], TOP_RIGHT: [2 / 3, 0, 1, 1 / 3],
  CENTER_LEFT: [0, 1 / 3, 1 / 3, 2 / 3], CENTER: [1 / 3, 1 / 3, 2 / 3, 2 / 3], CENTER_RIGHT: [2 / 3, 1 / 3, 1, 2 / 3],
  BOTTOM_LEFT: [0, 2 / 3, 1 / 3, 1], BOTTOM_CENTER: [1 / 3, 2 / 3, 2 / 3, 1], BOTTOM_RIGHT: [2 / 3, 2 / 3, 1, 1],
} as const;
export function layoutRuleError(layer: Layer, value: { x: number; y: number; width: number; height: number }) {
  const margin = layer.safeMargin ?? .03;
  if (value.x < margin || value.y < margin || value.x + value.width > 1 - margin || value.y + value.height > 1 - margin) return 'Elemento fora da área segura.';
  const cell = cells[layer.preferredRegion || 'CENTER'];
  if (!cell) return;
  const centerX = value.x + value.width / 2, centerY = value.y + value.height / 2;
  if (layer.positionTolerance === 'strict' && (centerX < cell[0] || centerX > cell[2] || centerY < cell[1] || centerY > cell[3])) return 'Elemento saiu da região definida.';
  if (layer.preferredSize === 'small' && Math.max(value.width, value.height) > .42) return 'Elemento pequeno excede seu tamanho máximo.';
  if (layer.preferredSize === 'large' && Math.max(value.width, value.height) < .18) return 'Elemento grande ficou pequeno demais.';
}
