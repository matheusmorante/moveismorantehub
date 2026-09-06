import { Layer, BaseLayer, DynamicTextLayer, MarketingTemplate } from '../types';

const regions: Record<string, Layer['preferredRegion']> = { main: 'CENTER_LEFT', brand: 'TOP_LEFT', badge: 'TOP_RIGHT', title: 'CENTER_RIGHT', oldPrice: 'CENTER_RIGHT', price: 'CENTER_RIGHT', installment: 'CENTER_RIGHT', productSlogan: 'BOTTOM_LEFT', gallery: 'BOTTOM_LEFT', storeSlogan: 'BOTTOM_RIGHT' };
const priorities: Record<string, Layer['priority']> = { main: 'VERY_HIGH', price: 'VERY_HIGH', title: 'HIGH', badge: 'HIGH', oldPrice: 'MEDIUM', installment: 'MEDIUM', gallery: 'MEDIUM', brand: 'MEDIUM', productSlogan: 'LOW', storeSlogan: 'LOW' };
type SemanticRole = NonNullable<Layer['role']>;
const base = (id: string, role: SemanticRole, x: number, y: number, width: number, height: number): Omit<BaseLayer, 'type'> =>
  ({ id, role, name: id, x, y, width, height, rotation: 0, zIndex: 5, opacity: 1, locked: false, visible: true,
    preferredRegion: regions[role || ''] || 'CENTER', preferredSize: role === 'main' ? 'large' : 'medium', priority: priorities[role || ''] || 'MEDIUM',
    positionTolerance: 'automatic', safeMargin: .03 });
const text = (id: string, role: SemanticRole, binding: string, x: number, y: number, width: number, height: number,
  size: number, color = '#ffffff'): DynamicTextLayer => ({ ...base(id, role, x, y, width, height),
  type: 'DYNAMIC_TEXT', textBinding: binding, fontFamily: 'Arial, sans-serif', fontWeight: '800',
  fontSizeRelative: size, color, maxLines: 2 });

export const compositionLayers: Layer[] = [
  { ...base('Foto principal', 'main', 0, 0, 1, 1), type: 'PRODUCT_MAIN_IMAGE', zIndex: 0 },
  { ...base('Marca', 'brand', .04, .035, .38, .10), type: 'ASSET', assetId: 'brand', assetUrl: '/images/logo-morante.png' },
  { ...base('Selo de oportunidade', 'badge', .53, .025, .44, .25), type: 'ASSET',
    assetId: 'asset-queima-salvados-badge', assetUrl: '/assets/queima-salvados-original.png', visible: false },
  text('Nome completo', 'title', '{{product.name}}', .65, .31, .32, .105, .041),
  { ...text('Preço antigo', 'oldPrice', '{{product.oldPrice}}', .65, .43, .32, .055, .04, '#cbd5e1'), textDecoration: 'line-through', relations: { above: 'Preço novo', keepNear: 'Preço novo' } },
  { ...text('Preço novo', 'price', '{{product.price}}', .63, .50, .34, .105, .062, '#ffec00'),
    type: 'DYNAMIC_PRICE', backgroundColor: '#df0016', backgroundPadding: 8, borderRadius: 14, backgroundShape: 'brush', maxLines: 1, relations: { keepNear: 'Parcelamento' } },
  { ...text('Parcelamento', 'installment', 'EM ATÉ 10X SEM JUROS', .63, .62, .34, .09, .024, '#111111'),
    type: 'DYNAMIC_INSTALLMENT', backgroundColor: '#ffc900', borderRadius: 12, maxLines: 1, relations: { below: 'Preço novo', keepNear: 'Preço novo' } },
  { ...text('Slogan do produto', 'productSlogan', '{{product.slogan}}', .04, .57, .28, .14, .036), fontFamily: 'cursive', fontWeight: '400', maxLines: 4 },
  { ...base('Fotos das variações', 'gallery', .04, .75, .70, .18), type: 'VARIATION_GALLERY', direction: 'horizontal',
    thumbnailSizeRelative: .18, gapRelative: .01, borderRadius: 12, borderWidth: 3, borderColor: '#ffffff' },
  { ...text('Slogan da loja', 'storeSlogan', 'Qualidade que cabe no seu bolso', .76, .80, .21, .15, .028),
    fontFamily: 'cursive', backgroundColor: '#c90016', borderRadius: 16, maxLines: 4 }
];

export const compositionTemplate: MarketingTemplate = {
  id: 'composition-reference-v2', name: 'Ambientado • elementos por campanha', aspectRatio: '4:5',
  targetWidth: 1080, targetHeight: 1350, backgroundColor: '#24170e', layers: compositionLayers,
  isDefault: true, createdAt: '2026-09-06', updatedAt: '2026-09-06'
};
