import { Layer } from '../types';
import { boxesCollide, insideSafeArea, LayoutBox, overlapArea } from './layoutGeometry';

const priority: Record<string, number> = { main: 100, price: 95, badge: 90, title: 80, installment: 70, oldPrice: 60, gallery: 40, productSlogan: 30, storeSlogan: 20, brand: 20 };
const box = (layer: Layer): LayoutBox => ({ x: layer.x, y: layer.y, width: layer.width, height: layer.height || .1 });
const participates = (layer: Layer) => layer.visible && !layer.locked;

export interface CompositionValidation { valid: boolean; score: number; collisions: Array<[string, string]>; reasons: string[]; warnings: string[]; canvasUtilization: number; productOccupancy: number; }

export function validateLayout(layers: Layer[]): CompositionValidation {
  const active = layers.filter(participates);
  const reasons: string[] = [], warnings: string[] = [], collisions: Array<[string, string]> = [];
  let score = 100;
  for (const layer of active) if (!insideSafeArea(box(layer), layer.safeMargin ?? .03)) { reasons.push(`${layer.name} está fora da safe area.`); score = 0; }
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const a = active[i], b = active[j];
    if (!boxesCollide(box(a), box(b))) continue;
    collisions.push([a.name, b.name]);
    const severe = a.role === 'main' || b.role === 'main' || a.role === 'price' || b.role === 'price';
    score -= severe ? 40 : Math.max(10, Math.round(overlapArea(box(a), box(b)) * 100));
    reasons.push(`${a.name} colide com ${b.name}.`);
  }
  for (const layer of active) {
    if ('fontSizeRelative' in layer && layer.fontSizeRelative < .014) { score -= 20; reasons.push(`${layer.name} ficou ilegível.`); }
    if (layer.role === 'title' && 'maxLines' in layer && layer.maxLines && layer.maxLines > 2) { score -= 10; reasons.push('Nome do produto excede duas linhas.'); }
  }
  const ordered = [...active].sort((a, b) => (priority[b.role || ''] || 50) - (priority[a.role || ''] || 50));
  if (ordered[0]?.role !== 'main') { score -= 10; reasons.push('Produto não é o elemento dominante.'); }
  const containerArea = active.reduce((total, layer) => total + box(layer).width * box(layer).height, 0);
  const main = active.find(layer => layer.role === 'main');
  const subject = main?.subjectBounds;
  const productOccupancy = main ? main.width * (main.height || .1) * (subject ? subject.width * subject.height : .9) : 0;
  const canvasUtilization = Math.min(1, containerArea);
  if (productOccupancy < .28) { score -= 20; warnings.push('Produto abaixo da ocupação visual preferida.'); }
  if (canvasUtilization < .48) { score -= 10; warnings.push('Há espaço livre excessivo na composição.'); }
  const gallery = active.find(layer => layer.role === 'gallery');
  if (gallery && gallery.width > .58) { score -= 10; warnings.push('Grid de variações ocupa espaço excessivo.'); }
  return { valid: reasons.length === 0, score: Math.max(0, score), collisions, reasons, warnings, canvasUtilization, productOccupancy };
}
