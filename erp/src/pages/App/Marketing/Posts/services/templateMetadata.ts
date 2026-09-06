import { Layer, TemplateEditorSettings, MarketingTemplate } from '../types';
const id = '__template_editor_settings_v1__';
/** Hidden metadata keeps layers_json an array, compatible with existing readers. */
export function encodeTemplateLayers(layers: Layer[], editorSettings?: TemplateEditorSettings, layouts?: MarketingTemplate['layouts']): Layer[] {
  return editorSettings || layouts ? [...layers, { id, name: 'Configuração do editor', type: 'HEADER_FOOTER_DECORATION',
    x: 0, y: 0, width: 0, height: 0, rotation: 0, zIndex: -1, opacity: 0, locked: true, visible: false,
    editorSettings, layouts } as Layer] : layers;
}
export function decodeTemplateLayers(value: unknown) {
  const layers = Array.isArray(value) ? value : [];
  const metadata = layers.find(layer => layer?.id === id);
  const settings = metadata?.editorSettings;
  return { layers: layers.filter(layer => layer && layer.id !== id) as Layer[],
    editorSettings: settings && typeof settings === 'object' ? settings as TemplateEditorSettings : undefined,
    layouts: metadata?.layouts && typeof metadata.layouts === 'object' ? metadata.layouts as MarketingTemplate['layouts'] : undefined };
}
