import { Layer, MarketingTemplate } from '../types';
import { compositionLayers } from './compositionDefaults';
import { templateService } from './templateService';

export interface ElementModel { id: string; name: string; role: Layer['role']; layer: Layer; opportunityId?: string }
export const defaultElementModels: ElementModel[] = compositionLayers.flatMap(layer => {
  if (layer.role === 'main') return [];
  const normal = { id: `default-${layer.role}`, name: 'Referência', role: layer.role, layer };
  if ('fontFamily' in layer) return [normal, { ...normal, id: `clean-${layer.role}`, name: 'Minimalista',
    layer: { ...layer, fontFamily: 'Georgia, serif', fontWeight: '700', backgroundColor: undefined } }];
  if (layer.type === 'VARIATION_GALLERY') return [normal, { ...normal, id: 'grid-gallery', name: 'Grid de fotos',
    layer: { ...layer, direction: 'grid' } as Layer }];
  return [normal];
});
defaultElementModels.push({ id: 'payment-image', name: 'Parcelamento com bandeiras • horizontal', role: 'installment',
  layer: { ...compositionLayers.find(l => l.role === 'installment')!, type: 'ASSET', assetId: 'payment-image',
    assetUrl: '/images/installment-badge-10x-transparent.png' } as Layer });
export function modelFromTemplate(template: MarketingTemplate): ElementModel[] {
  if (!template.name.startsWith('@element/') || !template.layers[0]?.role) return [];
  const layer = template.layers[0];
  return [{ id: template.id, name: template.name.split('/').slice(2).join('/'), role: layer.role, layer, opportunityId: layer.opportunityId }];
}
export async function loadElementModels() {
  return [...defaultElementModels, ...(await templateService.getAll()).flatMap(modelFromTemplate)];
}
export async function saveElementModel(name: string, layer: Layer) {
  return templateService.save({ name: `@element/${layer.role}/${name}`, aspectRatio: '4:5', targetWidth: 1080,
    targetHeight: 1350, layers: [layer], backgroundColor: '#24170e' });
}
export function applyElementModel(current: Layer, model: ElementModel): Layer {
  // Models style a slot; they never replace its product binding or its position.
  return { ...model.layer, id: current.id, name: current.name, role: current.role, modelId: model.id,
    x: current.x, y: current.y, width: current.width, height: current.height,
    visible: current.visible, locked: current.locked,
    ...('textBinding' in current && 'textBinding' in model.layer ? { textBinding: current.textBinding } : {}) };
}
