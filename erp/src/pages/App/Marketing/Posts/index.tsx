import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';
import { uploadFile } from '@/pages/utils/storageService';
import { useLocation, useSearchParams } from 'react-router-dom';
import HeaderFooterModelEditor from './HeaderFooterModelEditor';
import AvatarLibrary from './AvatarLibrary';
import OpportunitySealLibrary from './OpportunitySealLibrary';
import TextColorPicker from './TextColorPicker';
import TextBackgroundControls, { type TextBackground } from './TextBackgroundControls';
import TextAlignmentControls from './TextAlignmentControls';
import PostImageSourcePicker, { type PostImageOption } from './PostImageSourcePicker';
import InstallmentImageGallery from './InstallmentImageGallery';
import ImageGridControls from './ImageGridControls';
import type { OpportunitySeal } from './opportunitySealImage';
import { DEFAULT_IMAGE_GRID_SETTINGS, drawImageGrid, drawMoreColorsLabel, getPostImageGrid, placeImageInCell, type ImageGridSettings } from './postImageGrid';
import { type HorizontalTextAlignment, type VerticalTextAlignment } from './textAlignment';
import { getPostGridImages, parseVariationImageUrls } from './variationGridImages';
import { shouldShowPreviousPrice } from './postPriceVisibility';

interface Product {
  id: string;
  name: string;
  price: number;
  promo_price: number | null;
  product_images: { image_url: string; is_main: boolean }[];
  opportunities: { name: string; badge_color: string; border_color: string } | null;
  product_variations?: { id: string; name?: string; sku?: string; image_url?: unknown }[];
  technical_specs?: any | null;
  width?: number | null;
  depth?: number | null;
  height?: number | null;
}

const TEMPLATE_PREVIEW_PRODUCT: Product = {
  id: "template-preview",
  name: "PRODUTO MODELO",
  price: 999,
  promo_price: 799,
  product_images: [],
  opportunities: null,
};

const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (Padrão)' },
  { value: 'Impact, sans-serif', label: 'Impact (Pesada)' },
  { value: 'Oswald, sans-serif', label: 'Oswald (Condensada)' },
  { value: '"Bebas Neue", sans-serif', label: 'Bebas Neue (Alta)' },
  { value: 'Anton, sans-serif', label: 'Anton (Extra Bold)' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat (Moderna)' },
  { value: 'Roboto, sans-serif', label: 'Roboto (Limpa)' },
  { value: 'Poppins, sans-serif', label: 'Poppins (Arredondada)' },
  { value: '"Playfair Display", Georgia, serif', label: 'Playfair (Clássica)' },
  { value: 'ui-monospace, monospace', label: 'Monospace (Digital)' },
  { value: "'Segoe UI', Arial, sans-serif", label: 'Segoe UI' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS' },
  { value: "'Courier New', monospace", label: 'Courier New' },
];

const DEFAULT_FONT_FAMILY = FONT_OPTIONS[0].value;
const CONTAINER_CHILD_KEYS = ['title', 'priceDeLabel', 'priceDe', 'porApenas', 'pricePor'];
const TEXT_ELEMENT_KEYS = ['title', 'priceDeLabel', 'priceDe', 'pricePor', 'porApenas', 'measures', 'brand', 'slogan', 'footerTitle', 'footerAddress'];
const IMAGE_CELL_KEYS = ['mainImage', 'secondaryImage'];
const DEFAULT_TEXT_COLORS: Record<string, string> = { brand: '#ffffff', slogan: '#0d1b2a', footerTitle: '#0d1b2a', footerAddress: '#e0a96d', title: '#111827', priceDeLabel: '#dc2626', priceDe: '#dc2626', porApenas: '#e0a96d', pricePor: '#111827', installments: '#111827', measures: '#94a3b8' };
const INITIAL_COLOR_HISTORY = ['#000000', '#1e3a8a', '#dc2626', '#ea580c', '#ffffff', '#2563eb', '#16a34a', '#ff7900', '#7c3aed'];
const EMPTY_TEXT_BACKGROUND: TextBackground = { color: '#ffffff', paddingX: 0, paddingY: 0, opacity: 0 };

function drawTextBackground(
  ctx: CanvasRenderingContext2D,
  scale: number,
  width: number,
  height: number,
  background: TextBackground,
  x = 0,
  baselineY = 0,
  selection?: { width: number; height: number; offsetX: number; offsetY: number },
) {
  if (background.opacity <= 0) return;
  const selectionWidth = selection?.width ?? width;
  const selectionHeight = selection?.height ?? height;
  const selectionOffsetX = selection?.offsetX ?? 0;
  const selectionOffsetY = selection?.offsetY ?? 0;
  const extraPaddingX = selection ? 0 : background.paddingX;
  const extraPaddingY = selection ? 0 : background.paddingY;
  ctx.save();
  ctx.globalAlpha = background.opacity;
  ctx.fillStyle = background.color;
  ctx.beginPath();
  ctx.roundRect(
    (x - selectionOffsetX - extraPaddingX) * scale,
    (baselineY - height - selectionOffsetY - extraPaddingY) * scale,
    (selectionWidth + extraPaddingX * 2) * scale,
    (selectionHeight + extraPaddingY * 2) * scale,
    Math.min(18, selectionHeight / 2) * scale,
  );
  ctx.fill();
  ctx.restore();
}

// Helper para detectar a caixa delimitadora (bounding box) da imagem
function getBoundingBox(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { x: 0, y: 0, w: img.width, h: img.height };
  
  try {
    ctx.drawImage(img, 0, 0);
  } catch {
    return { x: 0, y: 0, w: img.width, h: img.height };
  }
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    // Imagens de domínios sem CORS ainda podem ser exibidas no grid; apenas
    // não permitem a leitura dos pixels para remover bordas transparentes.
    return { x: 0, y: 0, w: img.width, h: img.height };
  }
  const data = imageData.data;
  
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      
      const isWhite = r > 248 && g > 248 && b > 248;
      const isTransparent = a < 15;
      
      if (!isWhite && !isTransparent) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, w: img.width, h: img.height };
  }
  
  const padding = 15;
  const x = Math.max(0, minX - padding);
  const y = Math.max(0, minY - padding);
  const w = Math.min(canvas.width - x, (maxX - minX) + padding * 2);
  const h = Math.min(canvas.height - y, (maxY - minY) + padding * 2);
  
  return { x, y, w, h };
}

function resolveBadgeColor(badgeColorClass: string) {
  if (!badgeColorClass) return "#ef4444";
  if (badgeColorClass.includes("red-600")) return "#dc2626";
  if (badgeColorClass.includes("orange-500")) return "#f97316";
  if (badgeColorClass.includes("orange-600")) return "#ea580c";
  if (badgeColorClass.includes("amber-600")) return "#d97706";
  if (badgeColorClass.includes("purple-600")) return "#7c3aed";
  if (badgeColorClass.includes("blue-600")) return "#2563eb";
  if (badgeColorClass.includes("green-600")) return "#16a34a";
  if (badgeColorClass.includes("pink-600")) return "#db2777";
  if (badgeColorClass.includes("teal-600")) return "#0d9488";
  if (badgeColorClass.startsWith("#")) return badgeColorClass;
  return "#ef4444";
}

function drawFlameIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color = "#ffffff") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  const scale = size / 24;
  ctx.scale(scale, scale);
  const p = new Path2D("M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z");
  ctx.fill(p);
  ctx.restore();
}

export default function MarketingPosts() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isTemplateRoute = location.pathname === '/templates/posts';

  useEffect(() => {
    if (document.getElementById('marketing-post-fonts')) return;
    const link = document.createElement('link');
    link.id = 'marketing-post-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Poppins:wght@400;700;900&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@700;900&display=swap';
    document.head.appendChild(link);
  }, []);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Opções de customização do banner
  const [brandName, setBrandName] = useState("MÓVEIS MORANTE");
  const [textFontFamilies, setTextFontFamilies] = useState<Record<string, string>>({});
  const [textColors, setTextColors] = useState<Record<string, string>>(DEFAULT_TEXT_COLORS);
  const [textBackgrounds, setTextBackgrounds] = useState<Record<string, TextBackground>>({ pricePor: { color: '#ffe600', paddingX: 18, paddingY: 17, opacity: 1 } });
  const [textHorizontalAlignments, setTextHorizontalAlignments] = useState<Record<string, HorizontalTextAlignment>>({});
  const [textVerticalAlignments, setTextVerticalAlignments] = useState<Record<string, VerticalTextAlignment>>({});
  const [textSelectionWidths, setTextSelectionWidths] = useState<Record<string, number>>({});
  const [textSelectionHeights, setTextSelectionHeights] = useState<Record<string, number>>({});
  const [colorHistory, setColorHistory] = useState(INITIAL_COLOR_HISTORY);
  const [brandFontSize, setBrandFontSize] = useState<number>(42);
  const [brandOffsetX, setBrandOffsetX] = useState<number>(120);
  const [brandOffsetY, setBrandOffsetY] = useState<number>(82);
  const [slogan, setSlogan] = useState("Qualidade que cabe no seu bolso");
  const [sloganFontSize, setSloganFontSize] = useState<number>(20);
  const [sloganOffsetX, setSloganOffsetX] = useState<number>(120);
  const [sloganOffsetY, setSloganOffsetY] = useState<number>(130);

  const [installmentImageUrl, setInstallmentImageUrl] = useState('/images/installment-badge-10x-transparent.png');
  const [installmentImageLibrary, setInstallmentImageLibrary] = useState<string[]>(['/images/installment-badge-10x-transparent.png', '/images/installment-badge-10x-juros.png']);
  const [installmentImageScale, setInstallmentImageScale] = useState(100);
  const [uploadingInstallmentImage, setUploadingInstallmentImage] = useState(false);
  const [showSecondaryImage, setShowSecondaryImage] = useState(true);
  const [showOpportunityBadge, setShowOpportunityBadge] = useState(true);
  const [selectedOpportunitySeal, setSelectedOpportunitySeal] = useState<OpportunitySeal | null>(null);
  
  const [oppRotation, setOppRotation] = useState<number>(0);
  const [oppScale, setOppScale] = useState<number>(100);
  const [oppOffsetX, setOppOffsetX] = useState<number>(270);
  const [oppOffsetY, setOppOffsetY] = useState<number>(240);

  const [avatarUrl, setAvatarUrl] = useState("/images/avatar-morante.png");
  const [avatarScale, setAvatarScale] = useState<number>(100);
  const [avatarOffsetX, setAvatarOffsetX] = useState<number>(35);
  const [avatarOffsetY, setAvatarOffsetY] = useState<number>(1208);
  const [footerAddressTitle, setFooterAddressTitle] = useState("VISITE NOSSA LOJA NO ENDEREÇO");
  const [footerAddressTitleFontSize, setFooterAddressTitleFontSize] = useState<number>(24);
  const [footerAddressTitleOffsetX, setFooterAddressTitleOffsetX] = useState<number>(175);
  const [footerAddressTitleOffsetY, setFooterAddressTitleOffsetY] = useState<number>(1258);
  const [footerAddressText, setFooterAddressText] = useState("RUA CASCAVEL, 306, GUARAITUBA, COLOMBO");
  const [footerAddressTextFontSize, setFooterAddressTextFontSize] = useState<number>(28);
  const [footerAddressTextOffsetX, setFooterAddressTextOffsetX] = useState<number>(175);
  const [footerAddressTextOffsetY, setFooterAddressTextOffsetY] = useState<number>(1302);
  const [installmentsFontSize, setInstallmentsFontSize] = useState<number>(26);
  const [installmentsOffsetX, setInstallmentsOffsetX] = useState<number>(600);
  const [installmentsOffsetY, setInstallmentsOffsetY] = useState<number>(1140);

  const [productTitle, setProductTitle] = useState("");
  const [priceContainerBackgroundColor, setPriceContainerBackgroundColor] = useState("#f8fafc");
  const [showPriceContainer, setShowPriceContainer] = useState(true);
  const [priceContainerOffsetX, setPriceContainerOffsetX] = useState(0);
  const [priceContainerOffsetY, setPriceContainerOffsetY] = useState(0);
  const [priceContainerWidth, setPriceContainerWidth] = useState(460);
  const [priceContainerHeight, setPriceContainerHeight] = useState(450);
  const [detachedContainerElements, setDetachedContainerElements] = useState<Record<string, boolean>>({});
  const [productTitleFontSize, setProductTitleFontSize] = useState<number>(30);
  const [productTitleOffsetX, setProductTitleOffsetX] = useState<number>(600);
  const [productTitleOffsetY, setProductTitleOffsetY] = useState<number>(720);
  const [productTitleMaxContainerWidth, setProductTitleMaxContainerWidth] = useState<number>(390);
  const [isTitleWidthFixed, setIsTitleWidthFixed] = useState(false);
  const [productTitleRotation, setProductTitleRotation] = useState<number>(0);
  const [productTitleScale, setProductTitleScale] = useState<number>(100);

  const [priceFontSize, setPriceFontSize] = useState<number>(48);
  const [priceHighlightBackgroundColor, setPriceHighlightBackgroundColor] = useState('#ffe600');
  const [priceHighlightOffsetX, setPriceHighlightOffsetX] = useState(0);
  const [priceHighlightOffsetY, setPriceHighlightOffsetY] = useState(0);
  const [priceHighlightExtraWidth, setPriceHighlightExtraWidth] = useState(0);
  const [priceHighlightExtraHeight, setPriceHighlightExtraHeight] = useState(0);
  const [priceDeFontSize, setPriceDeFontSize] = useState<number>(20);
  const [priceDeText, setPriceDeText] = useState('De');
  const [priceOffsetX, setPriceOffsetX] = useState<number>(600);
  const [priceOffsetY, setPriceOffsetY] = useState<number>(920);
  const [priceRotation, setPriceRotation] = useState<number>(0);
  const [priceScale, setPriceScale] = useState<number>(100);

  const [priceDeOffsetX, setPriceDeOffsetX] = useState<number>(600);
  const [priceDeOffsetY, setPriceDeOffsetY] = useState<number>(780);
  const [priceDeRotation, setPriceDeRotation] = useState<number>(0);
  const [priceDeScale, setPriceDeScale] = useState<number>(100);

  const [porApenasText, setPorApenasText] = useState("POR APENAS");
  const [porApenasFontSize, setPorApenasFontSize] = useState<number>(16);
  const [porApenasColor, setPorApenasColor] = useState("#e0a96d");
  const [porApenasOffsetX, setPorApenasOffsetX] = useState<number>(600);
  const [porApenasOffsetY, setPorApenasOffsetY] = useState<number>(825);
  const [porApenasRotation, setPorApenasRotation] = useState<number>(0);
  const [porApenasScale, setPorApenasScale] = useState<number>(100);

  const [measuresText, setMeasuresText] = useState("");
  const [measuresFontSize, setMeasuresFontSize] = useState<number>(20);
  const [measuresOffsetX, setMeasuresOffsetX] = useState<number>(600);
  const [measuresOffsetY, setMeasuresOffsetY] = useState<number>(1035);

  const [customPrice, setCustomPrice] = useState("");
  const [customPromoPrice, setCustomPromoPrice] = useState("");
  const [mainImageScale, setMainImageScale] = useState<number>(100);
  const [secondaryImageScale, setSecondaryImageScale] = useState<number>(100);
  const [mainImageOffsetX, setMainImageOffsetX] = useState<number>(0);
  const [mainImageOffsetY, setMainImageOffsetY] = useState<number>(0);
  const [secondaryImageOffsetX, setSecondaryImageOffsetX] = useState<number>(0);
  const [secondaryImageOffsetY, setSecondaryImageOffsetY] = useState<number>(0);
  const [imageGridSettings, setImageGridSettings] = useState<ImageGridSettings>(DEFAULT_IMAGE_GRID_SETTINGS);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  const [secondaryImageIndex, setSecondaryImageIndex] = useState<number>(1);
  const [mainImageSource, setMainImageSource] = useState('product:0');
  const [secondaryImageSource, setSecondaryImageSource] = useState('product:1');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editorZoom, setEditorZoom] = useState(1);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isHeaderFooterLibraryOpen, setIsHeaderFooterLibraryOpen] = useState(false);
  const [isOpportunityLibraryOpen, setIsOpportunityLibraryOpen] = useState(false);
  const [isAvatarLibraryOpen, setIsAvatarLibraryOpen] = useState(false);
  const [avatarLibrary, setAvatarLibrary] = useState([{ id: 'lisandro', name: 'Lisandro', url: '/images/avatar-morante.png' }]);
  const [isHeaderFooterInfoOpen, setIsHeaderFooterInfoOpen] = useState(false);
  const [isHeaderFooterEditorOpen, setIsHeaderFooterEditorOpen] = useState(false);
  const [headerFooterModelName, setHeaderFooterModelName] = useState('Padrão');
  const [headerTemplateImage, setHeaderTemplateImage] = useState('/images/banner-header-standard.svg');
  const [footerTemplateImage, setFooterTemplateImage] = useState('/images/banner-footer-bg.svg');
  const [uploadingTemplateImage, setUploadingTemplateImage] = useState(false);
  const [layerOrder, setLayerOrder] = useState<string[]>(['imageGrid', 'opportunityBadge', 'title', 'priceDe', 'porApenas', 'pricePor', 'installments', 'measures']);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [modelProductQuery, setModelProductQuery] = useState('');
  const [isModelProductPickerOpen, setIsModelProductPickerOpen] = useState(false);
  const [defaultModelProductId, setDefaultModelProductId] = useState('');
  const postLayerLabels: Record<string, string> = { imageGrid: 'Grid de fotos', opportunityBadge: 'Selo oportunidade', title: 'Título do produto', priceDe: 'Preço de', porApenas: 'Texto por', pricePor: 'Preço por', installments: 'Parcelamento', measures: 'Descrição' };
  useEffect(() => {
    setLayerOrder(current => current.filter(key => key !== 'priceContainer'));
  }, []);
  const uploadTemplateImage = async (kind: 'header' | 'footer', file: File) => {
    setUploadingTemplateImage(true);
    try {
      const extension = file.name.split('.').pop() || 'png';
      const url = await uploadFile(file, `marketing/post-templates/${kind}-${Date.now()}.${extension}`);
      if (kind === 'header') setHeaderTemplateImage(url); else setFooterTemplateImage(url);
      const defaults = { ...getCurrentState(), [kind === 'header' ? 'headerTemplateImage' : 'footerTemplateImage']: url };
      const { error } = await supabase.from('store_style_settings').upsert({ id: true, marketing_defaults: defaults });
      if (error) throw error;
      setMarketingDefaults(defaults);
      toast.success(`${kind === 'header' ? 'Cabeçalho' : 'Rodapé'} enviado ao Storage.`);
    } catch { toast.error('Não foi possível enviar a imagem.'); }
    finally { setUploadingTemplateImage(false); }
  };

  useEffect(() => {
    if (isTemplateRoute) {
      setIsEditingTemplate(true);
      setIsModalOpen(true);
    }
  }, [isTemplateRoute]);
  const [marketingDefaults, setMarketingDefaults] = useState<any>(null);
  const [selectedQuickActionsPost, setSelectedQuickActionsPost] = useState<any>(null);

  // Elemento selecionado no canvas para edição interativa
  type SelectedElement = 'headerFooter' | 'imageGrid' | 'mainImage' | 'secondaryImage' | 'opportunityBadge' | 'priceContainer' | 'priceHighlight' | 'brand' | 'slogan' | 'installments' | 'avatar' | 'footerTitle' | 'footerAddress' | 'title' | 'priceDeLabel' | 'priceDe' | 'pricePor' | 'porApenas' | 'measures' | null;
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [isGridHovered, setIsGridHovered] = useState(false);
  useEffect(() => {
    if (selectedElement === 'priceContainer') setSelectedElement(null);
  }, [selectedElement]);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const productPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const imageBoundsCacheRef = useRef<WeakMap<HTMLImageElement, { x: number; y: number; w: number; h: number }>>(new WeakMap());
  const drawRequestRef = useRef(0);
  const imageSourceProductIdRef = useRef<string | null>(null);
  const renderedRegionsRef = useRef<Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }>>({});
  const renderedLayerOrderRef = useRef<string[]>([]);
  const postDragRef = useRef<{ key: SelectedElement; x: number; y: number; mode: 'move' | 'resize' | 'rotate' | 'resize-container' | 'resize-text' | 'resize-side'; side?: 'top' | 'right' | 'bottom' | 'left'; centerX?: number; centerY?: number } | null>(null);

  // Histórico de alterações (Undo / Redo)
  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isApplyingHistoryRef = useRef<boolean>(false);
  const previousSelectedElementRef = useRef<SelectedElement>(null);
  const isTemplateStateInitializedRef = useRef(false);
  const templateUserDirtyRef = useRef(false);
  const templateSaveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const getCurrentState = useCallback(() => ({
    headerFooterModelVersion: 2,
    headerFooterModelName, headerTemplateImage, footerTemplateImage, defaultModelProductId,
    brandName, brandFontSize, brandOffsetX, brandOffsetY, textFontFamilies, textColors, textBackgrounds, textHorizontalAlignments, textVerticalAlignments, colorHistory, textSelectionWidths, textSelectionHeights,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY,
    footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX, footerAddressTitleOffsetY,
    footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    installmentImageUrl, installmentImageLibrary, installmentImageScale, installmentsOffsetX, installmentsOffsetY,
    showSecondaryImage, showOpportunityBadge, selectedOpportunitySeal,
    oppRotation, oppScale, oppOffsetX, oppOffsetY,
    customPrice, customPromoPrice,
    mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY,
    secondaryImageOffsetX, secondaryImageOffsetY,
    imageGridSettings,
    mainImageIndex, secondaryImageIndex, mainImageSource, secondaryImageSource,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleMaxContainerWidth, isTitleWidthFixed, priceContainerBackgroundColor, showPriceContainer, priceContainerOffsetX, priceContainerOffsetY, priceContainerWidth, priceContainerHeight, detachedContainerElements,
    productTitleRotation, productTitleScale,
    priceFontSize, priceHighlightBackgroundColor, priceHighlightOffsetX, priceHighlightOffsetY, priceHighlightExtraWidth, priceHighlightExtraHeight, priceDeFontSize, priceDeText, priceOffsetX, priceOffsetY,
    priceRotation, priceScale,
    priceDeOffsetX, priceDeOffsetY, priceDeRotation, priceDeScale,
    porApenasText, porApenasFontSize, porApenasColor, porApenasOffsetX, porApenasOffsetY,
    porApenasRotation, porApenasScale,
    measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY
  }), [
    headerFooterModelName, headerTemplateImage, footerTemplateImage, defaultModelProductId,
    brandName, brandFontSize, brandOffsetX, brandOffsetY, textFontFamilies, textColors, textBackgrounds, textHorizontalAlignments, textVerticalAlignments, colorHistory, textSelectionWidths, textSelectionHeights,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY,
    footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX, footerAddressTitleOffsetY,
    footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    installmentImageUrl, installmentImageLibrary, installmentImageScale, installmentsOffsetX, installmentsOffsetY,
    showSecondaryImage, showOpportunityBadge, selectedOpportunitySeal,
    oppRotation, oppScale, oppOffsetX, oppOffsetY,
    customPrice, customPromoPrice,
    mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY,
    secondaryImageOffsetX, secondaryImageOffsetY,
    imageGridSettings,
    mainImageIndex, secondaryImageIndex, mainImageSource, secondaryImageSource,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleMaxContainerWidth, isTitleWidthFixed, priceContainerBackgroundColor, showPriceContainer, priceContainerOffsetX, priceContainerOffsetY, priceContainerWidth, priceContainerHeight, detachedContainerElements,
    productTitleRotation, productTitleScale,
    priceFontSize, priceHighlightBackgroundColor, priceHighlightOffsetX, priceHighlightOffsetY, priceHighlightExtraWidth, priceHighlightExtraHeight, priceDeFontSize, priceDeText, priceOffsetX, priceOffsetY,
    priceRotation, priceScale,
    priceDeOffsetX, priceDeOffsetY, priceDeRotation, priceDeScale,
    porApenasText, porApenasFontSize, porApenasColor, porApenasOffsetX, porApenasOffsetY,
    porApenasRotation, porApenasScale,
    measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY
  ]);
  const templateStateSignature = useMemo(() => JSON.stringify(getCurrentState()), [getCurrentState]);

  const applyState = (s: any) => {
    const canvasCoordinate = (value: unknown, fallback: number, limit: number) => {
      const coordinate = Number(value);
      return Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= limit ? coordinate : fallback;
    };
    if (s.headerFooterModelName !== undefined) setHeaderFooterModelName(s.headerFooterModelName);
    if (s.headerTemplateImage !== undefined) setHeaderTemplateImage(s.headerTemplateImage);
    if (s.footerTemplateImage !== undefined) setFooterTemplateImage(s.footerTemplateImage);
    if (s.defaultModelProductId !== undefined) setDefaultModelProductId(s.defaultModelProductId);
    if (!s) return;
    isApplyingHistoryRef.current = true;
    
    if (s.brandName !== undefined) setBrandName(s.brandName);
    if (s.textFontFamilies !== undefined) setTextFontFamilies(s.textFontFamilies);
    if (s.textColors !== undefined) setTextColors(current => ({ ...current, ...s.textColors }));
    if (s.textBackgrounds !== undefined) setTextBackgrounds(current => ({ ...current, ...s.textBackgrounds }));
    if (s.textHorizontalAlignments !== undefined) setTextHorizontalAlignments(s.textHorizontalAlignments);
    if (s.textVerticalAlignments !== undefined) setTextVerticalAlignments(s.textVerticalAlignments);
    if (s.colorHistory !== undefined) setColorHistory(s.colorHistory);
    if (s.textSelectionWidths !== undefined) {
      setTextSelectionWidths(s.textSelectionWidths);
      const savedTitleWidth = Number(s.textSelectionWidths?.title);
      if (Number.isFinite(savedTitleWidth)) setProductTitleMaxContainerWidth(Math.max(120, savedTitleWidth));
    }
    if (s.textSelectionHeights !== undefined) setTextSelectionHeights(s.textSelectionHeights);
    if (s.brandFontSize !== undefined) setBrandFontSize(s.brandFontSize);
    if (s.brandOffsetX !== undefined) setBrandOffsetX(s.brandOffsetX);
    if (s.brandOffsetY !== undefined) setBrandOffsetY(s.brandOffsetY);
    if (s.slogan !== undefined) setSlogan(s.slogan);
    if (s.sloganFontSize !== undefined) setSloganFontSize(s.sloganFontSize);
    if (s.sloganOffsetX !== undefined) setSloganOffsetX(s.sloganOffsetX);
    if (s.sloganOffsetY !== undefined) setSloganOffsetY(s.sloganOffsetY);
    if (s.avatarUrl !== undefined) setAvatarUrl(s.avatarUrl);
    if (s.avatarScale !== undefined) setAvatarScale(s.avatarScale);
    if (s.avatarOffsetX !== undefined) setAvatarOffsetX(s.avatarOffsetX);
    if (s.avatarOffsetY !== undefined) setAvatarOffsetY(s.avatarOffsetY);
    if (s.footerAddressTitle !== undefined) setFooterAddressTitle(s.footerAddressTitle);
    if (s.footerAddressTitleFontSize !== undefined) setFooterAddressTitleFontSize(s.footerAddressTitleFontSize);
    if (s.footerAddressTitleOffsetX !== undefined) setFooterAddressTitleOffsetX(s.footerAddressTitleOffsetX);
    if (s.footerAddressTitleOffsetY !== undefined) setFooterAddressTitleOffsetY(s.footerAddressTitleOffsetY);
    if (s.footerAddressText !== undefined) setFooterAddressText(s.footerAddressText);
    if (s.footerAddressTextFontSize !== undefined) setFooterAddressTextFontSize(s.footerAddressTextFontSize);
    if (s.footerAddressTextOffsetX !== undefined) setFooterAddressTextOffsetX(s.footerAddressTextOffsetX);
    if (s.footerAddressTextOffsetY !== undefined) setFooterAddressTextOffsetY(s.footerAddressTextOffsetY);
    if (s.installmentImageUrl !== undefined) setInstallmentImageUrl(s.installmentImageUrl);
    if (s.installmentImageLibrary !== undefined) setInstallmentImageLibrary(s.installmentImageLibrary);
    if (s.installmentImageScale !== undefined) setInstallmentImageScale(Math.max(20, Math.min(300, Number(s.installmentImageScale) || 100)));
    if (s.installmentsFontSize !== undefined) setInstallmentsFontSize(s.installmentsFontSize);
    if (s.installmentsOffsetX !== undefined) setInstallmentsOffsetX(canvasCoordinate(s.installmentsOffsetX, 600, 1080));
    if (s.installmentsOffsetY !== undefined) setInstallmentsOffsetY(canvasCoordinate(s.installmentsOffsetY, 1140, 1350));
    if (s.showSecondaryImage !== undefined) setShowSecondaryImage(s.showSecondaryImage);
    if (s.showOpportunityBadge !== undefined) setShowOpportunityBadge(s.showOpportunityBadge);
    if (s.selectedOpportunitySeal !== undefined) setSelectedOpportunitySeal(s.selectedOpportunitySeal);
    if (s.oppRotation !== undefined) setOppRotation(s.oppRotation);
    if (s.oppScale !== undefined) setOppScale(s.oppScale);
    if (s.oppOffsetX !== undefined) setOppOffsetX(s.oppOffsetX);
    if (s.oppOffsetY !== undefined) setOppOffsetY(s.oppOffsetY);
    if (s.customPrice !== undefined) setCustomPrice(s.customPrice);
    if (s.customPromoPrice !== undefined) setCustomPromoPrice(s.customPromoPrice);
    if (s.mainImageScale !== undefined) setMainImageScale(s.mainImageScale);
    if (s.secondaryImageScale !== undefined) setSecondaryImageScale(s.secondaryImageScale);
    if (s.mainImageOffsetX !== undefined) setMainImageOffsetX(s.mainImageOffsetX);
    if (s.mainImageOffsetY !== undefined) setMainImageOffsetY(s.mainImageOffsetY);
    if (s.secondaryImageOffsetX !== undefined) setSecondaryImageOffsetX(s.secondaryImageOffsetX);
    if (s.secondaryImageOffsetY !== undefined) setSecondaryImageOffsetY(s.secondaryImageOffsetY);
    if (s.imageGridSettings !== undefined) setImageGridSettings(current => ({ ...current, ...s.imageGridSettings }));
    if (s.mainImageIndex !== undefined) setMainImageIndex(s.mainImageIndex);
    if (s.secondaryImageIndex !== undefined) setSecondaryImageIndex(s.secondaryImageIndex);
    if (s.mainImageSource !== undefined) setMainImageSource(s.mainImageSource);
    if (s.secondaryImageSource !== undefined) setSecondaryImageSource(s.secondaryImageSource);
    
    if (s.productTitle !== undefined) setProductTitle(s.productTitle);
    if (s.priceContainerBackgroundColor !== undefined) setPriceContainerBackgroundColor(s.priceContainerBackgroundColor);
    if (s.showPriceContainer !== undefined) setShowPriceContainer(s.showPriceContainer);
    if (s.priceContainerOffsetX !== undefined) setPriceContainerOffsetX(s.priceContainerOffsetX);
    if (s.priceContainerOffsetY !== undefined) setPriceContainerOffsetY(s.priceContainerOffsetY);
    if (s.priceContainerWidth !== undefined) setPriceContainerWidth(s.priceContainerWidth);
    if (s.priceContainerHeight !== undefined) setPriceContainerHeight(s.priceContainerHeight);
    if (s.detachedContainerElements !== undefined) setDetachedContainerElements(s.detachedContainerElements);
    if (s.productTitleFontSize !== undefined) setProductTitleFontSize(s.productTitleFontSize);
    if (s.productTitleOffsetX !== undefined) setProductTitleOffsetX(canvasCoordinate(s.productTitleOffsetX, 600, 1080));
    if (s.productTitleOffsetY !== undefined) setProductTitleOffsetY(canvasCoordinate(s.productTitleOffsetY, 720, 1350));
    if (s.productTitleMaxContainerWidth !== undefined) setProductTitleMaxContainerWidth(s.productTitleMaxContainerWidth);
    if (s.isTitleWidthFixed !== undefined) setIsTitleWidthFixed(Boolean(s.isTitleWidthFixed));
    if (s.productTitleRotation !== undefined) setProductTitleRotation(s.productTitleRotation);
    if (s.productTitleScale !== undefined) setProductTitleScale(s.productTitleScale);
    if (s.priceFontSize !== undefined) setPriceFontSize(s.priceFontSize);
    if (s.priceHighlightBackgroundColor !== undefined) setPriceHighlightBackgroundColor(s.priceHighlightBackgroundColor);
    if (s.priceHighlightOffsetX !== undefined) setPriceHighlightOffsetX(s.priceHighlightOffsetX);
    if (s.priceHighlightOffsetY !== undefined) setPriceHighlightOffsetY(s.priceHighlightOffsetY);
    if (s.priceHighlightExtraWidth !== undefined) setPriceHighlightExtraWidth(s.priceHighlightExtraWidth);
    if (s.priceHighlightExtraHeight !== undefined) setPriceHighlightExtraHeight(s.priceHighlightExtraHeight);
    if (s.priceDeFontSize !== undefined) setPriceDeFontSize(s.priceDeFontSize);
    if (s.priceDeText !== undefined) setPriceDeText(s.priceDeText);
    if (s.priceOffsetX !== undefined) setPriceOffsetX(canvasCoordinate(s.priceOffsetX, 600, 1080));
    if (s.priceOffsetY !== undefined) setPriceOffsetY(canvasCoordinate(s.priceOffsetY, 920, 1350));
    if (s.priceRotation !== undefined) setPriceRotation(s.priceRotation);
    if (s.priceScale !== undefined) setPriceScale(s.priceScale);
    if (s.priceDeOffsetX !== undefined) setPriceDeOffsetX(s.priceDeOffsetX);
    if (s.priceDeOffsetY !== undefined) setPriceDeOffsetY(s.priceDeOffsetY);
    if (s.priceDeRotation !== undefined) setPriceDeRotation(s.priceDeRotation);
    if (s.priceDeScale !== undefined) setPriceDeScale(s.priceDeScale);
    if (s.porApenasText !== undefined) setPorApenasText(s.porApenasText);
    if (s.porApenasFontSize !== undefined) setPorApenasFontSize(s.porApenasFontSize);
    if (s.porApenasColor !== undefined) setPorApenasColor(s.porApenasColor);
    if (s.porApenasOffsetX !== undefined) setPorApenasOffsetX(canvasCoordinate(s.porApenasOffsetX, 600, 1080));
    if (s.porApenasOffsetY !== undefined) setPorApenasOffsetY(canvasCoordinate(s.porApenasOffsetY, 825, 1350));
    if (s.porApenasRotation !== undefined) setPorApenasRotation(s.porApenasRotation);
    if (s.porApenasScale !== undefined) setPorApenasScale(s.porApenasScale);
    if (s.measuresText !== undefined) setMeasuresText(s.measuresText);
    if (s.measuresFontSize !== undefined) setMeasuresFontSize(s.measuresFontSize);
    if (s.measuresOffsetX !== undefined) setMeasuresOffsetX(s.measuresOffsetX);
    if (s.measuresOffsetY !== undefined) setMeasuresOffsetY(s.measuresOffsetY);

    // Templates antigos chegaram a salvar eixos como null. Como a posição de
    // cada camada é relativa a esses valores, isso deixa os elementos fora da
    // arte e impede que a ação de centralizar calcule um destino utilizável.
    const hasInvalidPostLayout = [
      s.productTitleOffsetY,
      s.priceOffsetY,
      s.porApenasOffsetY,
      s.installmentsOffsetX,
      s.textSelectionHeights?.title,
    ].some(value => value === null || value === undefined || !Number.isFinite(Number(value)))
      || s.showPriceContainer === false
      || Number(s.priceOffsetY) <= 0;

    if (hasInvalidPostLayout) {
      setShowPriceContainer(true);
      setProductTitleOffsetX(600);
      setProductTitleOffsetY(720);
      setPriceOffsetX(600);
      setPriceOffsetY(920);
      setPriceDeOffsetX(600);
      setPriceDeOffsetY(780);
      setPorApenasOffsetX(600);
      setPorApenasOffsetY(825);
      setMeasuresOffsetX(600);
      setMeasuresOffsetY(1035);
      setInstallmentsOffsetX(600);
      setInstallmentsOffsetY(1140);
      setDetachedContainerElements({});
      setTextSelectionWidths(current => ({ ...current, title: 420, pricePor: 320, porApenas: 180 }));
      setTextSelectionHeights(current => ({ ...current, title: 120 }));
      templateUserDirtyRef.current = true;
    }
    
    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 50);
  };
  const uploadInstallmentImage = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) return toast.error('A imagem do parcelamento deve ter no máximo 2 MB.');
    setUploadingInstallmentImage(true);
    try {
      const extension = file.name.split('.').pop() || 'png';
      const url = await uploadFile(file, `marketing/installments/${Date.now()}.${extension}`);
      setInstallmentImageUrl(url);
      setInstallmentImageLibrary(current => current.includes(url) ? current : [...current, url]);
    } catch {
      toast.error('Não foi possível enviar a imagem do parcelamento.');
    } finally {
      setUploadingInstallmentImage(false);
    }
  };

  // Recupera também um editor que já estava aberto quando um template com
  // coordenadas corrompidas foi carregado. Sem isso, a correção persistida só
  // apareceria após fechar e abrir toda a tela novamente.
  useEffect(() => {
    if (!isEditingTemplate || !isModalOpen) return;

    const hasInvalidLayout = [
      productTitleOffsetY,
      priceOffsetY,
      porApenasOffsetY,
      installmentsOffsetX,
    ].some(value => value === null || value === undefined || !Number.isFinite(Number(value)))
      || Number(priceOffsetY) <= 0;

    if (!hasInvalidLayout) return;

    setShowPriceContainer(true);
    setProductTitleOffsetX(600);
    setProductTitleOffsetY(720);
    setPriceOffsetX(600);
    setPriceOffsetY(920);
    setPriceDeOffsetX(600);
    setPriceDeOffsetY(780);
    setPorApenasOffsetX(600);
    setPorApenasOffsetY(825);
    setMeasuresOffsetX(600);
    setMeasuresOffsetY(1035);
    setInstallmentsOffsetX(600);
    setInstallmentsOffsetY(1140);
    setDetachedContainerElements({});
    setTextSelectionWidths(current => ({ ...current, title: 420, pricePor: 320, porApenas: 180 }));
    setTextSelectionHeights(current => ({ ...current, title: 120 }));
    templateUserDirtyRef.current = true;
  }, [
    isEditingTemplate,
    isModalOpen,
    productTitleOffsetY,
    priceOffsetY,
    porApenasOffsetY,
    installmentsOffsetX,
  ]);

  const pushToHistory = (s: any) => {
    if (isApplyingHistoryRef.current) return;
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (nextHistory.length > 0 && JSON.stringify(nextHistory[nextHistory.length - 1]) === JSON.stringify(s)) {
      return;
    }
    nextHistory.push(s);
    if (nextHistory.length > 100) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
  };

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevState = historyRef.current[historyIndexRef.current];
      applyState(prevState);
      toast.info("Desfeito (Ctrl+Z)");
    } else {
      toast.info("Nada a desfazer");
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextState = historyRef.current[historyIndexRef.current];
      applyState(nextState);
      toast.info("Refeito (Ctrl+Y)");
    } else {
      toast.info("Nada a refazer");
    }
  }, []);

  const saveTemplateDefaults = async (showToast = false, overrides: Record<string, unknown> = {}) => {
    setIsAutoSaving(true);
    const defaults = { ...getCurrentState(), ...overrides };
    const saveTask = templateSaveQueueRef.current.catch(() => false).then(async () => {
      const { data, error } = await supabase
        .from("store_style_settings")
        .upsert({ id: true, marketing_defaults: defaults })
        .select('marketing_defaults')
        .single();
      if (error) throw error;
      if (!data?.marketing_defaults) throw new Error('O banco não confirmou o salvamento do template.');
      setMarketingDefaults(data.marketing_defaults);
      return true;
    });
    templateSaveQueueRef.current = saveTask;
    try {
      const saved = await saveTask;
      if (showToast) toast.success("Padrões de marketing salvos com sucesso! 📌");
      return saved;
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar automaticamente o template.");
      return false;
    } finally {
      if (templateSaveQueueRef.current === saveTask) setIsAutoSaving(false);
    }
  };

  // Atalhos globais de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else if (selectedElement === 'installments') {
          // Parcelamento é uma imagem: apenas o canto altera a escala proporcionalmente.
          ctx.lineWidth = 3 * S;
          ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Carrega produtos do Supabase
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: prodData, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            price,
            promo_price,
            technical_specs,
            width,
            depth,
            height,
            product_images (
              image_url,
              is_main
            ),
            opportunities (
              name,
              badge_color,
              border_color
            )
          `)
          .order("name");

        if (error) throw error;
        const productRows = (prodData as unknown as Product[]) || [];
        const { data: variationData } = productRows.length
          ? await supabase.from('product_variations').select('id, product_id, name, sku, image_url').in('product_id', productRows.map(product => product.id)).order('sku', { ascending: true })
          : { data: [] };
        const variationsByProduct = (variationData || []).reduce<Record<string, Product['product_variations']>>((groups, variation: any) => {
          const productId = String(variation.product_id);
          groups[productId] = [...(groups[productId] || []), variation];
          return groups;
        }, {});
        const loadedProducts = productRows.map(product => ({ ...product, product_variations: variationsByProduct[String(product.id)] || [] }));
        setProducts(loadedProducts);

        // Auto-seleciona o produto caso seu ID seja passado na URL (?product=ID)
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('product') || urlParams.get('productId') || urlParams.get('id');
        if (targetId && loadedProducts.length > 0) {
          const found = loadedProducts.find((p: any) => p.id === targetId);
          if (found) {
            setSelectedProductId(found.id);
          }
        }

        // Carrega configurações de marketing padrão
        const { data: styleData } = await supabase
          .from("store_style_settings")
          .select("marketing_defaults")
          .eq("id", true)
          .maybeSingle();

        let defaults = styleData?.marketing_defaults || {};
        if (defaults.headerFooterModelVersion !== 2 || !defaults.headerTemplateImage || !defaults.footerTemplateImage) {
          const uploadDefault = async (url: string, name: string, type: string) => {
            const blob = await fetch(url).then(response => response.blob());
            return uploadFile(new File([blob], name, { type }), `marketing/post-templates/${name}`);
          };
          const [defaultHeader, defaultFooter] = await Promise.all([
            uploadDefault('/images/banner-header-standard.svg', 'padrao-cabecalho-v2.svg', 'image/svg+xml'),
            uploadDefault('/images/banner-footer-bg.svg', 'padrao-rodape-v2.svg', 'image/svg+xml'),
          ]);
          defaults = { ...defaults, headerFooterModelVersion: 2, headerFooterModelName: defaults.headerFooterModelName || 'Padrão', headerTemplateImage: defaultHeader, footerTemplateImage: defaultFooter };
          await supabase.from('store_style_settings').upsert({ id: true, marketing_defaults: defaults });
        }
        setMarketingDefaults(defaults);
        applyState(defaults);
        setDefaultModelProductId(defaults.defaultModelProductId || '');
        if (isTemplateRoute && defaults.defaultModelProductId && loadedProducts.some((product: Product) => product.id === defaults.defaultModelProductId)) {
          setSelectedProductId(defaults.defaultModelProductId);
        }
        setHeaderFooterModelName(defaults.headerFooterModelName || 'Padrão');
        setHeaderTemplateImage(defaults.headerTemplateImage);
        setFooterTemplateImage(defaults.footerTemplateImage);
      } catch (err: any) {
        console.error("Erro ao carregar dados:", err);
        toast.error("Falha ao carregar produtos.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const activeProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || (isEditingTemplate ? TEMPLATE_PREVIEW_PRODUCT : null);
  }, [products, selectedProductId, isEditingTemplate]);
  const renderProduct = activeProduct || TEMPLATE_PREVIEW_PRODUCT;
  const gridImages = useMemo(() => getPostGridImages(renderProduct.product_images || [], renderProduct.product_variations || []), [renderProduct]);

  useEffect(() => {
    if (!activeProduct || imageSourceProductIdRef.current === activeProduct.id) return;
    imageSourceProductIdRef.current = activeProduct.id;
    setMainImageIndex(0);
    setSecondaryImageIndex(1);
    setMainImageSource(gridImages.main?.key || 'product:0');
    setSecondaryImageSource(gridImages.secondary?.key || 'product:1');
  }, [activeProduct, gridImages]);

  const postImageOptions = useMemo<PostImageOption[]>(() => {
    const orderedProductImages = [...(renderProduct.product_images || [])].filter(image => Boolean(image.image_url)).sort((a, b) => Number(b.is_main) - Number(a.is_main));
    const productOptions = orderedProductImages.map((image, index) => ({ key: `product:${index}`, label: `Imagem ${index + 1}`, url: image.image_url }));
    const variationOptions = (renderProduct.product_variations || []).flatMap((variation, variationIndex) => {
      const variationName = variation.name || `Variação ${variationIndex + 1}`;
      return parseVariationImageUrls(variation.image_url).map((url, imageIndex) => ({ key: `variation:${variation.id}:${imageIndex}`, label: `${variationName} — Imagem ${imageIndex + 1}`, url, variationName }));
    });
    return [...productOptions, ...variationOptions];
  }, [renderProduct]);

  const gridExtraImageUrls = useMemo(() => {
    return gridImages.extra.map(image => image.url);
  }, [gridImages]);

  const getPostImageUrl = (source: string, fallbackIndex: number) => {
    const selected = postImageOptions.find(option => option.key === source);
    return selected?.url || postImageOptions[fallbackIndex]?.url || '';
  };

  useEffect(() => {
    if (!postImageOptions.length) return;
    if (!postImageOptions.some(option => option.key === mainImageSource)) setMainImageSource(postImageOptions[0].key);
    if (!postImageOptions.some(option => option.key === secondaryImageSource)) setSecondaryImageSource(postImageOptions[1]?.key || postImageOptions[0].key);
  }, [postImageOptions, mainImageSource, secondaryImageSource]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  // Posts salvos no produto ativo
  const postsList = useMemo(() => {
    if (!activeProduct) return [];
    const specs = activeProduct.technical_specs;
    if (specs && Array.isArray(specs.posts)) {
      return specs.posts;
    }
    return [];
  }, [activeProduct]);

  // Inicializa os campos ao selecionar/trocar de produto
  useEffect(() => {
    if (!activeProduct) return;

    setProductTitle(activeProduct.name);
    setCustomPrice(activeProduct.price ? activeProduct.price.toString() : "");
    setCustomPromoPrice(activeProduct.promo_price ? activeProduct.promo_price.toString() : "");

    // Medidas do produto
    const w = activeProduct.width || activeProduct.technical_specs?.width || "";
    const h = activeProduct.height || activeProduct.technical_specs?.height || "";
    const d = activeProduct.depth || activeProduct.technical_specs?.depth || "";
    if (w || h || d) {
      setMeasuresText(`L ${w}cm · A ${h}cm · P ${d}cm`);
    } else {
      setMeasuresText("");
    }

    // Carrega padrões de marketing se existirem
    if (marketingDefaults) {
      const def = marketingDefaults;
      if (def.brandName) setBrandName(def.brandName);
      if (def.slogan) setSlogan(def.slogan);
      if (def.avatarUrl) setAvatarUrl(def.avatarUrl);
      if (def.footerAddressText) setFooterAddressText(def.footerAddressText);
    }
  }, [activeProduct, marketingDefaults]);

  // Pré-carregamento e cache de imagem
  const loadImg = (url: string): Promise<HTMLImageElement | null> => {
    if (!url) return Promise.resolve(null);
    if (imageCacheRef.current[url]) {
      return Promise.resolve(imageCacheRef.current[url]);
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = (image: HTMLImageElement | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(image);
      };
      const timeoutId = window.setTimeout(() => finish(null), 3000);
      const tryLoad = (withCors: boolean) => {
        const img = new window.Image();
        if (withCors) img.crossOrigin = "anonymous";
        img.onload = () => {
          imageCacheRef.current[url] = img;
          finish(img);
        };
        img.onerror = () => {
          // Alguns servidores de fornecedores não liberam CORS. Tentamos
          // novamente para que a foto ainda apareça no editor.
          if (withCors) tryLoad(false);
          else finish(null);
        };
        img.src = url;
      };
      tryLoad(true);
    });
  };

  const loadFirstAvailableImage = async (...urls: (string | null | undefined)[]) => {
    for (const url of [...new Set(urls.filter((value): value is string => Boolean(value)))]) {
      const image = await loadImg(url);
      if (image) return image;
    }
    return null;
  };

  const getCachedBoundingBox = (image: HTMLImageElement) => {
    const cached = imageBoundsCacheRef.current.get(image);
    if (cached) return cached;
    const bounds = getBoundingBox(image);
    imageBoundsCacheRef.current.set(image, bounds);
    return bounds;
  };

  // Motor de Desenho Síncrono no Canvas 2D
  const drawBannerSync = (
    canvas: HTMLCanvasElement,
    images: { headerBg: HTMLImageElement | null; footerBg: HTMLImageElement | null; logo: HTMLImageElement | null; mainImg: HTMLImageElement | null; secImg: HTMLImageElement | null; installmentImg: HTMLImageElement | null; variationImgs: (HTMLImageElement | null)[] },
    isExport = false
  ) => {
    if (!activeProduct && !isEditingTemplate) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const S = canvas.width / 1080;
    const reg: Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }> = {};
    const getTextAreaAlignment = (key: string, width: number, height: number) => {
      const background = textBackgrounds[key] || EMPTY_TEXT_BACKGROUND;
      const hasBackground = background.opacity > 0;
      const paddingLeft = hasBackground ? background.paddingLeft ?? background.paddingX ?? 0 : 0;
      const paddingRight = hasBackground ? background.paddingRight ?? background.paddingX ?? 0 : 0;
      const paddingTop = hasBackground ? background.paddingTop ?? background.paddingY ?? 0 : 0;
      const paddingBottom = hasBackground ? background.paddingBottom ?? background.paddingY ?? 0 : 0;
      const areaWidth = Math.max(width + paddingLeft + paddingRight, textSelectionWidths[key] || 0);
      const areaHeight = Math.max(height + paddingTop + paddingBottom, textSelectionHeights[key] || 0);
      const horizontal = textHorizontalAlignments[key] || (hasBackground ? 'center' : 'left');
      const vertical = textVerticalAlignments[key] || 'middle';
      // O espaço configurado pertence à área do fundo. Os controles de
      // alinhamento redistribuem esse espaço ao redor do texto: topo deixa o
      // espaço embaixo, meio divide, e base deixa o espaço em cima.
      const freeWidth = Math.max(0, areaWidth - width);
      const freeHeight = Math.max(0, areaHeight - height);
      const textX = horizontal === 'right' ? freeWidth : horizontal === 'center' ? freeWidth / 2 : 0;
      const textBaseline = height + (vertical === 'bottom' ? freeHeight : vertical === 'middle' ? freeHeight / 2 : 0);
      return { x: textX, y: textBaseline - height, width: areaWidth, height: areaHeight };
    };

    // 1. Área principal clara, conforme o template institucional padrão.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1080 * S, 1350 * S);

    // 2. Imagens do Produto (Principal e Secundária)
    const imageGrid = getPostImageGrid(imageGridSettings, images.variationImgs.length);
    reg.mainImage = { ...imageGrid.main, key: 'mainImage', label: 'Célula da imagem 1' };
    reg.secondaryImage = { ...imageGrid.secondary, key: 'secondaryImage', label: 'Célula da imagem 2' };
    const drawImageGridLayer = () => {
      if (images.mainImg) {
        const bb = getCachedBoundingBox(images.mainImg);
        const placement = placeImageInCell(bb, imageGrid.main, 100, 0, 0);
        const targetW = placement.w * S;
        const targetH = placement.h * S;
        const posX = placement.x * S;
        const posY = placement.y * S;

        ctx.save();
        ctx.beginPath();
        ctx.rect(imageGrid.main.x * S, imageGrid.main.y * S, imageGrid.main.w * S, imageGrid.main.h * S);
        ctx.clip();
        ctx.drawImage(
          images.mainImg,
          bb.x, bb.y, bb.w, bb.h,
          posX, posY, targetW, targetH
        );
        ctx.restore();
      }

      if (showSecondaryImage && images.secImg) {
        const bb = getCachedBoundingBox(images.secImg);
        const placement = placeImageInCell(bb, imageGrid.secondary, 100, 0, 0);
        const targetW = placement.w * S;
        const targetH = placement.h * S;
        const posX = placement.x * S;
        const posY = placement.y * S;

        ctx.save();
        ctx.beginPath();
        ctx.rect(imageGrid.secondary.x * S, imageGrid.secondary.y * S, imageGrid.secondary.w * S, imageGrid.secondary.h * S);
        ctx.clip();
        ctx.drawImage(
          images.secImg,
          bb.x, bb.y, bb.w, bb.h,
          posX, posY, targetW, targetH
        );
        ctx.restore();
      }

      images.variationImgs.forEach((variationImage, index) => {
        const cell = imageGrid.variationCells[index];
        if (!variationImage || !cell) return;
        const bb = getCachedBoundingBox(variationImage);
        const placement = placeImageInCell(bb, cell, 100, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.rect(cell.x * S, cell.y * S, cell.w * S, cell.h * S);
        ctx.clip();
        ctx.drawImage(variationImage, bb.x, bb.y, bb.w, bb.h, placement.x * S, placement.y * S, placement.w * S, placement.h * S);
        ctx.restore();
      });
    };

    // O grid é a base da arte. Desenhá-lo antes dos demais elementos impede
    // que ele encubra título, preços e textos quando estes forem centralizados.
    drawImageGridLayer();

    // 3. Cabeçalho (Marca e Slogan)
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 0, 1080 * S, 170 * S);

    if (images.headerBg) {
      ctx.drawImage(images.headerBg, 0, 0, images.headerBg.width, images.headerBg.height, 0, 0, 1080 * S, 170 * S);
    } else {
    const headerGrad = ctx.createLinearGradient(0, 0, 1080 * S, 0);
    headerGrad.addColorStop(0, "rgba(12, 21, 35, 1)");
    headerGrad.addColorStop(0.4, "rgba(12, 21, 35, 1)");
    headerGrad.addColorStop(0.7, "rgba(12, 21, 35, 0.4)");
    headerGrad.addColorStop(1, "rgba(12, 21, 35, 0)");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, 1080 * S, 170 * S);

    const brandNameStr = brandName || "MÓVEIS MORANTE";
    const brandSize = brandFontSize || 42;
    const brandX = brandOffsetX ?? 120;
    const brandY = brandOffsetY ?? 82;

    ctx.font = `italic bold ${brandSize * S}px ${textFontFamilies.brand || DEFAULT_FONT_FAMILY}`;
    drawTextBackground(ctx, S, ctx.measureText(brandNameStr).width / S, brandSize, textBackgrounds.brand || EMPTY_TEXT_BACKGROUND, brandX, brandY);
    if (brandNameStr.toUpperCase().startsWith("MÓVEIS MORANTE")) {
      const p1 = "MÓVEIS ";
      const p2 = brandNameStr.substring(7);
      ctx.fillStyle = textColors.brand || DEFAULT_TEXT_COLORS.brand;
      ctx.fillText(p1, brandX * S, brandY * S);
      const p1W = ctx.measureText(p1).width;
      ctx.fillStyle = textColors.brand || DEFAULT_TEXT_COLORS.brand;
      ctx.fillText(p2, brandX * S + p1W, brandY * S);
    } else {
      ctx.fillStyle = textColors.brand || DEFAULT_TEXT_COLORS.brand;
      ctx.fillText(brandNameStr, brandX * S, brandY * S);
    }

    ctx.strokeStyle = "#e0a96d";
    ctx.lineWidth = 3 * S;
    ctx.beginPath();
    ctx.moveTo(brandX * S, (brandY + 11) * S);
    ctx.lineTo((brandX + 320) * S, (brandY + 11) * S);
    ctx.stroke();

    const sloganText = slogan || "Qualidade que cabe no seu bolso";
    const sloganSize = sloganFontSize || 20;
    const sloganX = sloganOffsetX ?? 120;
    const sloganY = sloganOffsetY ?? 130;

    ctx.fillStyle = textColors.slogan || DEFAULT_TEXT_COLORS.slogan;
    ctx.font = `${sloganSize * S}px ${textFontFamilies.slogan || DEFAULT_FONT_FAMILY}`;
    drawTextBackground(ctx, S, ctx.measureText(sloganText).width / S, sloganSize, textBackgrounds.slogan || EMPTY_TEXT_BACKGROUND, sloganX, sloganY);
    ctx.fillText(sloganText, sloganX * S, sloganY * S);
    }

    // 4. Rodapé
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 1180 * S, 1080 * S, 170 * S);
    if (images.footerBg) ctx.drawImage(images.footerBg, 0, 0, images.footerBg.width, images.footerBg.height, 0, 1180 * S, 1080 * S, 170 * S);

    if (!images.footerBg && images.logo) {
      const aspect = images.logo.width / images.logo.height;
      const targetHeight = 135 * (avatarScale / 100) * S;
      const targetWidth = targetHeight * aspect;
      const aX = (avatarOffsetX ?? 35) * S;
      const aY = (avatarOffsetY ?? 1208) * S;
      ctx.drawImage(images.logo, aX, aY, targetWidth, targetHeight);
      ctx.fillStyle = textColors.footerAddress || DEFAULT_TEXT_COLORS.footerAddress;
      ctx.font = `bold ${(footerAddressTextFontSize || 28) * S}px ${textFontFamilies.footerAddress || DEFAULT_FONT_FAMILY}`;
      const ftAddr = footerAddressText || "RUA CASCAVEL, 306, GUARAITUBA, COLOMBO";
      drawTextBackground(ctx, S, ctx.measureText(ftAddr).width / S, footerAddressTextFontSize || 28, textBackgrounds.footerAddress || EMPTY_TEXT_BACKGROUND, footerAddressTextOffsetX ?? 175, footerAddressTextOffsetY ?? 1302);
      ctx.fillText(ftAddr, (footerAddressTextOffsetX ?? 175) * S, (footerAddressTextOffsetY ?? 1302) * S);
    }

    // 5. Bloco de descrição e preço, abaixo da foto secundária à direita.
    const effectivePrice = customPrice ? parseFloat(customPrice) : renderProduct.price;
    const effectivePromo = customPromoPrice ? parseFloat(customPromoPrice) : renderProduct.promo_price;
    const finalPriceVal = effectivePromo || effectivePrice;
    const priceStr = `R$ ${finalPriceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const prSize = priceFontSize || 48;
    const prX = priceOffsetX ?? 600;
    const prY = priceOffsetY ?? 920;
    const priceContainerX = priceContainerOffsetX ?? 0;
    const priceContainerY = priceContainerOffsetY ?? 0;
    // O preço principal sempre pertence ao container: ao movê-lo ou aumentar a
    // fonte, o container expande em vez de deixar o conteúdo vazar.
    const isPricePorDetached = false;
    ctx.font = `bold ${prSize * S}px ${textFontFamilies.pricePor || DEFAULT_FONT_FAMILY}`;
    const priceTextWidth = ctx.measureText(priceStr).width / S;
    const rawPriceRowStartX = 580 + ((priceOffsetX ?? 600) - 600);
    const priceRowStartX = Math.max(18 - priceContainerX, Math.min(rawPriceRowStartX, 1080 - priceContainerX - priceTextWidth - 38));
    const priceRequiredWidth = Math.ceil(priceRowStartX - 560 + priceTextWidth + 54);
    // Enquanto o preço estiver no container, o fundo nunca pode ficar menor que ele.
    const effectiveContainerWidth = isPricePorDetached ? priceContainerWidth : Math.max(priceContainerWidth, priceRequiredWidth);
    const pTitleSize = productTitleFontSize || 30;
    // A largura salva é o limite máximo. A caixa de seleção fica flexível e
    // acompanha o conteúdo enquanto ele couber em uma única linha.
    const pTitleLimit = Math.min(1040, Math.max(120, productTitleMaxContainerWidth || 0, textSelectionWidths.title || 0, 390));
    ctx.font = `bold ${pTitleSize * S}px ${textFontFamilies.title || DEFAULT_FONT_FAMILY}`;
    // O nome exibido é sempre o do produto em uso. No editor de template,
    // o produto-modelo serve para testar a área e regular as quebras de linha.
    const titleWords = (renderProduct.name || productTitle || 'PRODUTO').split(/\s+/);
    const titleSingleLineWidth = ctx.measureText(titleWords.join(' ')).width / S;
    const titleLines: string[] = [];
    let titleLine = '';
    for (const word of titleWords) {
      const nextLine = titleLine ? `${titleLine} ${word}` : word;
      if (titleLine && ctx.measureText(nextLine).width / S > pTitleLimit) { titleLines.push(titleLine); titleLine = word; } else titleLine = nextLine;
    }
    if (titleLine) titleLines.push(titleLine);
    const expandedContainerHeight = Math.max(80, priceContainerHeight);
    const expandedTop = 650;

    // O bloco de preço não usa mais uma caixa visual: título e preços ficam
    // diretamente sobre a arte, preservando apenas a área interna de cálculo.
    reg['priceContainer'] = { key: 'priceContainer', label: 'Área de preços', x: 560 + priceContainerX, y: expandedTop + priceContainerY, w: effectiveContainerWidth, h: expandedContainerHeight };

    const contentLeft = 580;
    const isTitleDetached = false;
    const pTitleX = isTitleDetached ? (productTitleOffsetX ?? 600) : contentLeft + ((productTitleOffsetX ?? 600) - 600);
    ctx.font = `bold ${pTitleSize * S}px ${textFontFamilies.title || DEFAULT_FONT_FAMILY}`;
    const pTitleY = productTitleOffsetY ?? 720;
    ctx.fillStyle = textColors.title || DEFAULT_TEXT_COLORS.title;
    const titleContentWidth = Math.max(...titleLines.map(line => ctx.measureText(line).width / S), 0);
    const titleContentHeight = titleLines.length * (pTitleSize + 6);
    const titleAreaWidth = isTitleWidthFixed ? pTitleLimit : Math.min(pTitleLimit, Math.max(120, titleSingleLineWidth, titleContentWidth));
    const titleAlignment = getTextAreaAlignment('title', titleContentWidth, titleContentHeight);
    const drawTitleLayer = () => {
      ctx.save();
      if (!isTitleDetached) ctx.translate(priceContainerX * S, priceContainerY * S);
      ctx.translate((pTitleX + titleAlignment.x) * S, (pTitleY + titleAlignment.y) * S);
      ctx.rotate((productTitleRotation * Math.PI) / 180);
      // As demais camadas alteram a fonte do canvas. O título precisa definir
      // a sua própria fonte aqui para o tamanho visual e o espaçamento coincidirem.
      ctx.font = `bold ${pTitleSize * S}px ${textFontFamilies.title || DEFAULT_FONT_FAMILY}`;
      ctx.fillStyle = textColors.title || DEFAULT_TEXT_COLORS.title;
      drawTextBackground(ctx, S, titleContentWidth, titleContentHeight, textBackgrounds.title || EMPTY_TEXT_BACKGROUND, 0, titleContentHeight - pTitleSize, { ...titleAlignment, offsetX: titleAlignment.x, offsetY: titleAlignment.y });
      titleLines.forEach((line, index) => ctx.fillText(line, 0, index * (pTitleSize + 6) * S));
      ctx.restore();
      // A região usa a largura de seleção, e não apenas a largura das letras,
      // para que os puxadores laterais controlem a área de quebra do título.
      reg['title'] = { key: 'title', label: 'Título Produto', x: pTitleX, y: pTitleY - pTitleSize, w: titleAreaWidth, h: titleAlignment.height };
    };
    if (shouldShowPreviousPrice(effectivePrice, effectivePromo, isEditingTemplate)) {
      const deLabel = priceDeText || 'De';
      const deStr = `R$ ${effectivePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const deSize = priceDeFontSize || 20;
      const isPriceDeDetached = false;
      const deX = isPriceDeDetached ? (priceDeOffsetX ?? 600) : contentLeft + ((priceDeOffsetX ?? 600) - 600);
      const deY = priceDeOffsetY ?? 780;
      const drawPriceDeLayer = () => {
        ctx.save();
        if (!isPriceDeDetached) ctx.translate(priceContainerX * S, priceContainerY * S);
        ctx.translate(deX * S, deY * S);
        ctx.rotate((priceDeRotation * Math.PI) / 180);
        ctx.fillStyle = textColors.priceDeLabel || DEFAULT_TEXT_COLORS.priceDeLabel;
        ctx.font = `bold ${deSize * S}px ${textFontFamilies.priceDeLabel || DEFAULT_FONT_FAMILY}`;
        const deLabelWidth = ctx.measureText(deLabel).width / S;
        const deLabelAlignment = getTextAreaAlignment('priceDeLabel', deLabelWidth, deSize);
        drawTextBackground(ctx, S, deLabelWidth, deSize, textBackgrounds.priceDeLabel || EMPTY_TEXT_BACKGROUND, deLabelAlignment.x, deLabelAlignment.y, { ...deLabelAlignment, offsetX: deLabelAlignment.x, offsetY: deLabelAlignment.y });
        ctx.fillText(deLabel, deLabelAlignment.x * S, deLabelAlignment.y * S);
        ctx.restore();
        reg['priceDeLabel'] = { key: 'priceDeLabel', label: 'Texto De', x: deX, y: deY - deSize, w: deLabelAlignment.width, h: deLabelAlignment.height };
      };
      const drawPriceDeValueLayer = () => {
        ctx.save();
        if (!isPriceDeDetached) ctx.translate(priceContainerX * S, priceContainerY * S);
        ctx.translate(deX * S, deY * S);
        ctx.rotate((priceDeRotation * Math.PI) / 180);
        ctx.fillStyle = textColors.priceDe || DEFAULT_TEXT_COLORS.priceDe;
        ctx.font = `bold ${deSize * S}px ${textFontFamilies.priceDe || DEFAULT_FONT_FAMILY}`;
        const deWidth = ctx.measureText(deStr).width / S;
        const deAlignment = getTextAreaAlignment('priceDe', deWidth, deSize);
        const deLabelWidth = ctx.measureText(deLabel).width / S;
        const deBaseX = deLabelWidth + 8;
        drawTextBackground(ctx, S, deWidth, deSize, textBackgrounds.priceDe || EMPTY_TEXT_BACKGROUND, deBaseX + deAlignment.x, deAlignment.y, { ...deAlignment, offsetX: deAlignment.x, offsetY: deAlignment.y });
        ctx.fillText(deStr, (deBaseX + deAlignment.x) * S, deAlignment.y * S);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.moveTo((deBaseX + deAlignment.x) * S, (deAlignment.y - deSize * 0.3) * S);
        ctx.lineTo((deBaseX + deAlignment.x + deWidth) * S, (deAlignment.y - deSize * 0.3) * S);
        ctx.stroke();
        ctx.restore();
        reg['priceDe'] = { key: 'priceDe', label: 'Preço antigo', x: deX + deBaseX, y: deY - deSize, w: deAlignment.width, h: deAlignment.height };
      };
    }

    const porApStr = porApenasText || "POR APENAS";
    const porApSize = porApenasFontSize || 16;
    const priceRowX = isPricePorDetached ? (priceOffsetX ?? 600) : priceRowStartX;
    const priceRowY = isPricePorDetached ? (priceOffsetY ?? 920) : Math.max(prSize + 18, Math.min(priceOffsetY ?? 920, 1330 - priceContainerY));
    ctx.font = `bold ${porApSize * S}px ${textFontFamilies.porApenas || DEFAULT_FONT_FAMILY}`;
    const porApWidth = ctx.measureText(porApStr).width / S;
    // “Por apenas” é independente: mover o preço principal não pode alterar
    // sua posição. Mantemos apenas os limites seguros da arte.
    const porApX = Math.max(20, Math.min(porApenasOffsetX ?? 600, 1060 - porApWidth));
    const porApY = Math.max(porApSize + 8, Math.min(porApenasOffsetY ?? 825, 1330));
    const porAlignment = getTextAreaAlignment('porApenas', porApWidth, porApSize);
    const drawPorApenasLayer = () => {
      ctx.fillStyle = textColors.porApenas || porApenasColor || DEFAULT_TEXT_COLORS.porApenas;
      ctx.font = `bold ${porApSize * S}px ${textFontFamilies.porApenas || DEFAULT_FONT_FAMILY}`;
      ctx.save();
      ctx.translate(priceContainerX * S, priceContainerY * S);
      ctx.translate((porApX + porAlignment.x) * S, (porApY + porAlignment.y) * S);
      ctx.rotate((porApenasRotation * Math.PI) / 180);
      drawTextBackground(ctx, S, porApWidth, porApSize, textBackgrounds.porApenas || EMPTY_TEXT_BACKGROUND, 0, 0, { ...porAlignment, offsetX: porAlignment.x, offsetY: porAlignment.y });
      ctx.fillText(porApStr, 0, 0);
      ctx.restore();
      reg['porApenas'] = { key: 'porApenas', label: 'Texto Por Apenas', x: porApX, y: porApY - porApSize, w: porAlignment.width, h: porAlignment.height };
    };

    ctx.font = `bold ${prSize * S}px ${textFontFamilies.pricePor || DEFAULT_FONT_FAMILY}`;
    const flowPriceX = isPricePorDetached ? (priceOffsetX ?? 600) : priceRowX;
    const flowPriceY = isPricePorDetached ? (priceOffsetY ?? 920) : priceRowY;
    const priceMetrics = ctx.measureText(priceStr);
    const priceContentWidth = priceMetrics.width / S;
    const priceAscent = Math.max(1, priceMetrics.actualBoundingBoxAscent / S || prSize * 0.72);
    const priceDescent = Math.max(0, priceMetrics.actualBoundingBoxDescent / S || prSize * 0.12);
    const priceContentHeight = priceAscent + priceDescent;
    const priceAlignment = getTextAreaAlignment('pricePor', priceContentWidth, priceContentHeight);
    // O Canvas posiciona texto pela linha de base. A área de seleção é medida
    // pelo topo e pela base visíveis do desenho; por isso descontamos a
    // descendente ao posicionar o preço dentro do fundo.
    const priceBaselineOffsetY = priceAlignment.y - priceDescent;
    const drawPricePorLayer = () => {
      ctx.save();
      if (!isPricePorDetached) ctx.translate(priceContainerX * S, priceContainerY * S);
      ctx.translate((flowPriceX + priceAlignment.x) * S, (flowPriceY + priceBaselineOffsetY) * S);
      ctx.rotate((priceRotation * Math.PI) / 180);
      // O preço não pode herdar a fonte da camada desenhada antes dele.
      ctx.font = `bold ${prSize * S}px ${textFontFamilies.pricePor || DEFAULT_FONT_FAMILY}`;
      // Aqui usamos o textBackgrounds.pricePor como estava
      let defaultBg = { color: '#ffe600', paddingLeft: 18, paddingRight: 18, paddingTop: 17, paddingBottom: 17, opacity: 1 };
      // Mas com fallbacks corretos caso não seja esse. Se não for vazio:
      drawTextBackground(ctx, S, priceContentWidth, priceContentHeight, textBackgrounds.pricePor || defaultBg, 0, 0, { ...priceAlignment, offsetX: priceAlignment.x, offsetY: priceBaselineOffsetY });
      ctx.fillStyle = textColors.pricePor || DEFAULT_TEXT_COLORS.pricePor;
      ctx.fillText(priceStr, 0, 0);
      ctx.restore();
      reg['pricePor'] = { key: 'pricePor', label: 'Preço POR', x: flowPriceX, y: flowPriceY - priceContentHeight, w: priceAlignment.width, h: priceAlignment.height };
    };
    // Medidas
    if (measuresText) {
      const mSize = measuresFontSize || 20;
      const mX = measuresOffsetX ?? 785;
      const mY = measuresOffsetY ?? 1035;
      ctx.fillStyle = textColors.measures || DEFAULT_TEXT_COLORS.measures;
      ctx.font = `bold ${mSize * S}px ${textFontFamilies.measures || DEFAULT_FONT_FAMILY}`;
      const measuresWidth = ctx.measureText(measuresText).width / S;
      const measuresAlignment = getTextAreaAlignment('measures', measuresWidth, mSize);
      const drawMeasuresLayer = () => {
        ctx.save();
        drawTextBackground(ctx, S, measuresWidth, mSize, textBackgrounds.measures || EMPTY_TEXT_BACKGROUND, mX + measuresAlignment.x, mY + measuresAlignment.y, { ...measuresAlignment, offsetX: measuresAlignment.x, offsetY: measuresAlignment.y });
        ctx.fillText(measuresText, (mX + measuresAlignment.x) * S, (mY + measuresAlignment.y) * S);
        ctx.restore();
        reg['measures'] = { key: 'measures', label: 'Medidas', x: mX, y: mY - mSize, w: measuresAlignment.width, h: measuresAlignment.height };
      };
    }
    // Parcelamento é uma imagem livre, sem texto gerado pelo template.
    const instX = installmentsOffsetX ?? 540;
    const instY = installmentsOffsetY ?? 1140;
    if (images.installmentImg) {
      const bounds = getCachedBoundingBox(images.installmentImg);
      const maxWidth = 380;
      const maxHeight = 120;
      const scale = Math.min(maxWidth / bounds.w, maxHeight / bounds.h, 1) * (installmentImageScale / 100);
      const width = bounds.w * scale;
      const height = bounds.h * scale;
      ctx.drawImage(images.installmentImg, bounds.x, bounds.y, bounds.w, bounds.h, instX * S, (instY - height) * S, width * S, height * S);
      reg['installments'] = { key: 'installments', label: 'Imagem do parcelamento', x: instX, y: instY - height, w: width, h: height };
    }

    // 7. Oportunidade
    if (showOpportunityBadge && (selectedOpportunitySeal || renderProduct.opportunities)) {
      const opp = selectedOpportunitySeal || renderProduct.opportunities!;
      const labelText = opp.name.toUpperCase();
      ctx.save();
      const bx = oppOffsetX * S;
      const by = oppOffsetY * S;
      ctx.translate(bx, by);
      ctx.rotate((oppRotation * Math.PI) / 180);
      const currentScale = (oppScale / 100) * S;
      ctx.scale(currentScale, currentScale);

      ctx.font = `bold 20px 'Segoe UI', Arial, sans-serif`;
      const textW = ctx.measureText(labelText).width;
      const isSalvados = opp.name.toLowerCase().includes("salvado");
      const iconSpace = isSalvados ? 28 : 0;
      const badgeW = textW + 30 + iconSpace;
      const badgeH = 44;

      ctx.fillStyle = isSalvados ? "#f97316" : resolveBadgeColor(opp.badge_color || '');
      const rx = -badgeW / 2;
      const ry = -badgeH / 2;
      const radius = 8;

      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + badgeW - radius, ry);
      ctx.quadraticCurveTo(rx + badgeW, ry, rx + badgeW, ry + radius);
      ctx.lineTo(rx + badgeW, ry + badgeH - radius);
      ctx.quadraticCurveTo(rx + badgeW, ry + badgeH, rx + badgeW - radius, ry + badgeH);
      ctx.lineTo(rx + radius, ry + badgeH);
      ctx.quadraticCurveTo(rx, ry + badgeH, rx, ry + badgeH - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();
      ctx.fill();

      if (opp.border_color) {
        ctx.strokeStyle = opp.border_color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (isSalvados) {
        drawFlameIcon(ctx, rx + 15, ry + 12, 20, "#000000");
      }

      ctx.fillStyle = isSalvados ? "#000000" : "#ffffff";
      ctx.font = `bold 16px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, isSalvados ? iconSpace / 2 : 0, 0);
      ctx.restore();

      const scaleFactor = (oppScale / 100);
      reg['opportunityBadge'] = {
        key: 'opportunityBadge',
        label: 'Selo de oportunidade',
        x: oppOffsetX - (badgeW * scaleFactor) / 2 - 6,
        y: oppOffsetY - (badgeH * scaleFactor) / 2 - 6,
        w: badgeW * scaleFactor + 12,
        h: badgeH * scaleFactor + 12
      };
    }


    const layerDrawFns: Record<string, () => void> = {
      imageGrid: undefined,
      title: typeof drawTitleLayer !== 'undefined' ? drawTitleLayer : undefined,
      priceDeLabel: typeof drawPriceDeLayer !== 'undefined' ? drawPriceDeLayer : undefined,
      priceDe: typeof drawPriceDeValueLayer !== 'undefined' ? drawPriceDeValueLayer : undefined,
      porApenas: typeof drawPorApenasLayer !== 'undefined' ? drawPorApenasLayer : undefined,
      pricePor: typeof drawPricePorLayer !== 'undefined' ? drawPricePorLayer : undefined,
      measures: typeof drawMeasuresLayer !== 'undefined' ? drawMeasuresLayer : undefined,
      installments: typeof drawInstallmentsLayer !== 'undefined' ? drawInstallmentsLayer : undefined,
      opportunityBadge: typeof drawOpportunityLayer !== 'undefined' ? drawOpportunityLayer : undefined,
    };

    // Uma ordem salva incompleta não pode fazer o conteúdo do post sumir.
    // Mantemos a personalização da pilha, mas garantimos as camadas essenciais
    // e as desenhamos depois do grid e do container de preço.
    const requiredPostLayers = ['title', 'priceDeLabel', 'priceDe', 'porApenas', 'pricePor', 'installments', 'measures', 'opportunityBadge'];
    const drawOrder = [...new Set([...requiredPostLayers, ...layerOrder])].reverse();
    renderedLayerOrderRef.current = drawOrder;
    drawOrder.forEach(key => {
      if (layerDrawFns[key]) layerDrawFns[key]();
    });

    for (const key of [...CONTAINER_CHILD_KEYS, 'priceHighlight']) {
      // As camadas do bloco de preço são desenhadas sempre em relação ao
      // container; a região clicável precisa usar a mesma referência.
      if (reg[key]) {
        reg[key].x += priceContainerX;
        reg[key].y += priceContainerY;
      }
    }

    if (!isExport) {
      if (isGridHovered) drawImageGrid(ctx, S, imageGrid);
      const gridSelectionMargin = 24;
      reg.imageGrid = { key: 'imageGrid', label: 'Grid de fotos', x: imageGrid.outer.x - gridSelectionMargin, y: imageGrid.outer.y - gridSelectionMargin, w: imageGrid.outer.w + gridSelectionMargin * 2, h: imageGrid.outer.h + gridSelectionMargin * 2 };
    }
    if (gridImages.hasMoreColors) {
      const lastPhotoCell = imageGrid.variationCells[images.variationImgs.length - 1] || imageGrid.secondary;
      drawMoreColorsLabel(ctx, S, lastPhotoCell, imageGridSettings);
    }

    // 8. Destaque do elemento selecionado em tela
    if (selectedElement && !isExport) {
      const region = reg[selectedElement];
      if (region) {
        ctx.save();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2 * S;
        ctx.strokeRect(region.x * S, region.y * S, region.w * S, region.h * S);
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2 * S;
        if (selectedElement === 'priceContainer') {
          const handleColor = "#2563eb";
          ctx.strokeStyle = handleColor;
          ctx.lineWidth = 6 * S;
          ctx.beginPath();
          ctx.moveTo(region.x * S, (region.y + region.h / 2 - 35) * S); ctx.lineTo(region.x * S, (region.y + region.h / 2 + 35) * S);
          ctx.moveTo((region.x + region.w) * S, (region.y + region.h / 2 - 35) * S); ctx.lineTo((region.x + region.w) * S, (region.y + region.h / 2 + 35) * S);
          ctx.moveTo((region.x + region.w / 2 - 50) * S, region.y * S); ctx.lineTo((region.x + region.w / 2 + 50) * S, region.y * S);
          ctx.moveTo((region.x + region.w / 2 - 50) * S, (region.y + region.h) * S); ctx.lineTo((region.x + region.w / 2 + 50) * S, (region.y + region.h) * S);
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 3 * S;
          [[region.x, region.y + region.h / 2], [region.x + region.w, region.y + region.h / 2], [region.x + region.w / 2, region.y], [region.x + region.w / 2, region.y + region.h]].forEach(([handleX, handleY]) => {
            ctx.fillRect((handleX - 7) * S, (handleY - 7) * S, 14 * S, 14 * S);
            ctx.strokeRect((handleX - 7) * S, (handleY - 7) * S, 14 * S, 14 * S);
          });
          ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
        } else if (IMAGE_CELL_KEYS.includes(selectedElement)) {
          // Células do grid exibem somente a borda de seleção.
        } else if (TEXT_ELEMENT_KEYS.includes(selectedElement)) {
          ctx.fillStyle = '#ffffff';
          ctx.lineWidth = 2 * S;
          if (selectedElement === 'title') {
            [[region.x, region.y + region.h / 2], [region.x + region.w, region.y + region.h / 2]].forEach(([handleX, handleY]) => {
              ctx.fillRect((handleX - 9) * S, (handleY - 9) * S, 18 * S, 18 * S);
              ctx.strokeRect((handleX - 9) * S, (handleY - 9) * S, 18 * S, 18 * S);
            });
            // O canto inferior direito continua exclusivo para o tamanho da fonte.
            ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
            ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          } else {
            ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
            ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          }
        } else {
          ctx.lineWidth = 3 * S;
          [[region.x, region.y + region.h / 2], [region.x + region.w, region.y + region.h / 2], [region.x + region.w / 2, region.y], [region.x + region.w / 2, region.y + region.h]].forEach(([handleX, handleY]) => {
            ctx.fillRect((handleX - 6) * S, (handleY - 6) * S, 12 * S, 12 * S);
            ctx.strokeRect((handleX - 6) * S, (handleY - 6) * S, 12 * S, 12 * S);
          });
          ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
        }
        if (!IMAGE_CELL_KEYS.includes(selectedElement) && selectedElement !== 'installments') {
          const rotateX = region.x + region.w + 42;
          const rotateY = region.y + region.h + 42;
          ctx.beginPath();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(rotateX * S, rotateY * S, 11 * S, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#2563eb";
          ctx.font = `bold ${15 * S}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("↻", rotateX * S, rotateY * S + 1 * S);
        }
        ctx.restore();
      }
    }

    renderedRegionsRef.current = reg;
  };

  const drawBannerAsync = async (canvas: HTMLCanvasElement, isExport = false, requestId?: number) => {
    // Desenha a estrutura imediatamente; imagens lentas ou inválidas não podem
    // deixar o editor inteiro em branco enquanto carregam.
    try {
      drawBannerSync(canvas, { headerBg: null, footerBg: null, logo: null, mainImg: null, secImg: null, installmentImg: null, variationImgs: [] }, isExport);
    } catch (error) {
      console.error('Falha ao desenhar a estrutura do post:', error);
    }
    const images = renderProduct.product_images || [];
    const productMainImageUrl = images.find(image => image.is_main)?.image_url || images.find(image => Boolean(image.image_url))?.image_url || "";
    // O grid sempre obedece à ordem da regra visual. Assim, uma seleção antiga
    // ou inválida do editor não deixa o slot 1 vazio.
    const mainImageUrl = gridImages.main?.url || getPostImageUrl(mainImageSource, mainImageIndex) || productMainImageUrl;
    const secImageUrl = gridImages.secondary?.url || getPostImageUrl(secondaryImageSource, secondaryImageIndex) || images.find(image => !image.is_main)?.image_url || images[1]?.image_url || "";
    const shouldRenderSecondaryImage = showSecondaryImage && Boolean(secImageUrl) && secImageUrl !== mainImageUrl;

    const [headerBg, footerBg, logo, mainImg, secImg, installmentImg, variationImgs] = await Promise.all([
      loadImg(headerTemplateImage || "/images/banner-header-bg.png"),
      footerTemplateImage ? loadImg(footerTemplateImage) : Promise.resolve(null),
      avatarUrl ? loadImg(avatarUrl) : loadImg("/images/avatar-morante.png"),
      loadFirstAvailableImage(mainImageUrl, productMainImageUrl),
      shouldRenderSecondaryImage ? loadImg(secImageUrl) : Promise.resolve(null),
      loadImg(installmentImageUrl),
      Promise.all(gridExtraImageUrls.map(url => loadImg(url))),
    ]);

    if (requestId !== undefined && requestId !== drawRequestRef.current) return;
    try {
      const renderedCanvas = document.createElement('canvas');
      renderedCanvas.width = canvas.width;
      renderedCanvas.height = canvas.height;
      drawBannerSync(renderedCanvas, { headerBg, footerBg, logo, mainImg, secImg, installmentImg, variationImgs }, isExport);
      const visibleContext = canvas.getContext('2d');
      if (visibleContext) {
        visibleContext.clearRect(0, 0, canvas.width, canvas.height);
        visibleContext.drawImage(renderedCanvas, 0, 0);
      }
    } catch (error) {
      // Mantém a estrutura já desenhada em vez de apagar a arte visível.
      console.error('Falha ao desenhar o post com imagens:', error);
    }
  };

  // Re-renderiza o canvas sempre que os estados mudam
  useEffect(() => {
    if (!loading && isModalOpen && previewCanvasRef.current && (activeProduct || isEditingTemplate)) {
      const requestId = ++drawRequestRef.current;
      const canvas = previewCanvasRef.current;
      void drawBannerAsync(canvas, false, requestId);
    }
    if (productPreviewCanvasRef.current && activeProduct) {
      drawBannerAsync(productPreviewCanvasRef.current, true);
    }
  }, [
    loading, isModalOpen, activeProduct, isEditingTemplate, headerTemplateImage, footerTemplateImage, brandName, brandFontSize, brandOffsetX, brandOffsetY, slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY, footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX,
    footerAddressTitleOffsetY, footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    installmentImageUrl, installmentImageLibrary, installmentImageScale, installmentsOffsetX, installmentsOffsetY, showSecondaryImage, showOpportunityBadge,
    oppRotation, oppScale, oppOffsetX, oppOffsetY, customPrice, customPromoPrice, mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY, secondaryImageOffsetX, secondaryImageOffsetY, mainImageIndex, secondaryImageIndex, mainImageSource, secondaryImageSource, imageGridSettings,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleMaxContainerWidth, isTitleWidthFixed, productTitleRotation, textSelectionWidths, textSelectionHeights, priceContainerBackgroundColor, showPriceContainer, priceContainerOffsetX, priceContainerOffsetY, priceContainerWidth, priceContainerHeight, priceFontSize, priceHighlightBackgroundColor, priceHighlightOffsetX, priceHighlightOffsetY, priceHighlightExtraWidth, priceHighlightExtraHeight, priceDeFontSize, priceDeText,
    priceOffsetX, priceOffsetY, priceRotation, priceDeOffsetX, priceDeOffsetY, priceDeRotation, porApenasText, porApenasFontSize, porApenasColor,
    porApenasOffsetX, porApenasOffsetY, porApenasRotation, measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY, textFontFamilies, textColors, textBackgrounds, textHorizontalAlignments, textVerticalAlignments, selectedOpportunitySeal, detachedContainerElements, selectedElement, isGridHovered, gridImages, gridExtraImageUrls
  ]);

  // Registra no histórico
  useEffect(() => {
    if (activeProduct && !isApplyingHistoryRef.current) {
      pushToHistory(getCurrentState());
    }
  }, [getCurrentState, activeProduct]);

  useEffect(() => {
    const previousElement = previousSelectedElementRef.current;
    previousSelectedElementRef.current = selectedElement;
    if (isEditingTemplate && isModalOpen && templateUserDirtyRef.current && previousElement !== null && previousElement !== selectedElement) {
      void saveTemplateDefaults().then(saved => { if (saved) templateUserDirtyRef.current = false; });
    }
  }, [selectedElement]);

  useEffect(() => {
    if (!isEditingTemplate || !isModalOpen) {
      isTemplateStateInitializedRef.current = false;
      return;
    }
    if (!isTemplateStateInitializedRef.current) {
      isTemplateStateInitializedRef.current = true;
      return;
    }
    if (!templateUserDirtyRef.current) return;
    const saveTimer = window.setTimeout(() => {
      void saveTemplateDefaults().then(saved => { if (saved) templateUserDirtyRef.current = false; });
    }, 450);
    return () => window.clearTimeout(saveTimer);
  }, [templateStateSignature, isEditingTemplate, isModalOpen]);

  useEffect(() => {
    if (isEditingTemplate && defaultModelProductId && products.some(product => product.id === defaultModelProductId)) {
      setSelectedProductId(defaultModelProductId);
      setSearchTerm(products.find(product => product.id === defaultModelProductId)?.name || '');
    }
  }, [isEditingTemplate, defaultModelProductId, products]);

  useEffect(() => {
    if (selectedElement === 'priceHighlight') setSelectedElement('pricePor');
  }, [selectedElement]);

  // Handlers de Ações
  const handleNewPost = () => {
    setIsEditingTemplate(false);
    setActivePostId(null);
    setIsModalOpen(true);
  };

  const moveSelectedElement = (key: SelectedElement, dx: number, dy: number) => {
    if (!key) return;
    const move = (setX: React.Dispatch<React.SetStateAction<number>>, setY: React.Dispatch<React.SetStateAction<number>>) => { setX(v => v + dx); setY(v => v + dy); };
    if (key === 'title') move(setProductTitleOffsetX, setProductTitleOffsetY);
    else if (key === 'imageGrid') setImageGridSettings(current => ({ ...current, offsetX: current.offsetX + dx, offsetY: current.offsetY + dy }));
    else if (key === 'priceContainer') move(setPriceContainerOffsetX, setPriceContainerOffsetY);
    else if (key === 'priceDeLabel') move(setPriceDeOffsetX, setPriceDeOffsetY);
    else if (key === 'priceDe') move(setPriceDeOffsetX, setPriceDeOffsetY);
    else if (key === 'pricePor') move(setPriceOffsetX, setPriceOffsetY);
    else if (key === 'priceHighlight') move(setPriceHighlightOffsetX, setPriceHighlightOffsetY);
    else if (key === 'porApenas') move(setPorApenasOffsetX, setPorApenasOffsetY);
    else if (key === 'installments') move(setInstallmentsOffsetX, setInstallmentsOffsetY);
    else if (key === 'measures') move(setMeasuresOffsetX, setMeasuresOffsetY);
    else if (key === 'brand') move(setBrandOffsetX, setBrandOffsetY);
    else if (key === 'slogan') move(setSloganOffsetX, setSloganOffsetY);
    else if (key === 'avatar') move(setAvatarOffsetX, setAvatarOffsetY);
    else if (key === 'footerTitle') move(setFooterAddressTitleOffsetX, setFooterAddressTitleOffsetY);
    else if (key === 'footerAddress') move(setFooterAddressTextOffsetX, setFooterAddressTextOffsetY);
    else if (key === 'opportunityBadge') move(setOppOffsetX, setOppOffsetY);
    else if (key === 'mainImage') move(setMainImageOffsetX, setMainImageOffsetY);
    else if (key === 'secondaryImage') move(setSecondaryImageOffsetX, setSecondaryImageOffsetY);
  };

  const centerLayerElement = (key: SelectedElement) => {
    const element = key ? renderedRegionsRef.current[key] : null;
    if (!element) {
      toast.info('Esta camada ainda não possui conteúdo para centralizar.');
      return;
    }
    const targetX = (1080 - element.w) / 2;
    const targetY = (1350 - element.h) / 2;
    const containerKey = key === 'priceDeLabel' ? 'priceDe' : key;
    templateUserDirtyRef.current = true;
    setSelectedElement(key);
    if (containerKey && CONTAINER_CHILD_KEYS.includes(containerKey)) {
      setDetachedContainerElements(current => ({ ...current, [containerKey]: true }));
    }
    moveSelectedElement(key, targetX - element.x, targetY - element.y);
  };

  useEffect(() => {
    if (!isModalOpen || !selectedElement || selectedElement === 'headerFooter') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const step = event.shiftKey ? 10 : 1;
      const movement: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      const delta = movement[event.key];
      if (!delta) return;
      event.preventDefault();
      templateUserDirtyRef.current = true;
      moveSelectedElement(selectedElement, delta[0], delta[1]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, selectedElement]);

  const alignSelectedElementInContainer = (axis: 'horizontal' | 'vertical', alignment: 'start' | 'center' | 'end') => {
    if (!selectedElement || ![...CONTAINER_CHILD_KEYS, 'priceHighlight'].includes(selectedElement)) return;
    const container = renderedRegionsRef.current.priceContainer;
    const element = renderedRegionsRef.current[selectedElement];
    if (!container || !element) return;
    const padding = 20;
    const target = axis === 'horizontal'
      ? alignment === 'start' ? container.x + padding : alignment === 'center' ? container.x + (container.w - element.w) / 2 : container.x + container.w - element.w - padding
      : alignment === 'start' ? container.y + padding : alignment === 'center' ? container.y + (container.h - element.h) / 2 : container.y + container.h - element.h - padding;
    moveSelectedElement(selectedElement, axis === 'horizontal' ? target - element.x : 0, axis === 'vertical' ? target - element.y : 0);
    setDetachedContainerElements(current => ({ ...current, [selectedElement]: false }));
  };

  const resizeSelectedElement = (key: SelectedElement, amount: number) => {
    const resizeFont = (setSize: React.Dispatch<React.SetStateAction<number>>) => setSize(value => Math.max(8, Math.min(180, value + amount)));
    if (key === 'title') resizeFont(setProductTitleFontSize);
    else if (key === 'imageGrid') setImageGridSettings(current => ({ ...current, scale: Math.max(50, Math.min(120, current.scale + amount)) }));
    else if (key === 'priceDeLabel' || key === 'priceDe') resizeFont(setPriceDeFontSize);
    else if (key === 'pricePor') resizeFont(setPriceFontSize);
    else if (key === 'porApenas') resizeFont(setPorApenasFontSize);
    else if (key === 'installments') setInstallmentImageScale(value => Math.max(20, Math.min(300, value + amount)));
    else if (key === 'measures') resizeFont(setMeasuresFontSize);
    else if (key === 'brand') resizeFont(setBrandFontSize);
    else if (key === 'slogan') resizeFont(setSloganFontSize);
    else if (key === 'footerTitle') resizeFont(setFooterAddressTitleFontSize);
    else if (key === 'footerAddress') resizeFont(setFooterAddressTextFontSize);
    else if (key === 'mainImage') setMainImageScale(value => Math.max(40, Math.min(180, value + amount)));
    else if (key === 'secondaryImage') setSecondaryImageScale(value => Math.max(40, Math.min(180, value + amount)));
    else if (key === 'opportunityBadge') setOppScale(value => Math.max(40, Math.min(180, value + amount)));
    else if (key === 'avatar') setAvatarScale(value => Math.max(20, Math.min(250, value + amount)));
    else if (key === 'priceHighlight') {
      setPriceHighlightExtraWidth(value => Math.max(-20, value + amount));
      setPriceHighlightExtraHeight(value => Math.max(-20, value + amount));
    }
  };

  const rotateSelectedElement = (key: SelectedElement, angle: number) => {
    if (key === 'title') setProductTitleRotation(angle);
    else if (key === 'priceDe') setPriceDeRotation(angle);
    else if (key === 'pricePor') setPriceRotation(angle);
    else if (key === 'porApenas') setPorApenasRotation(angle);
    else if (key === 'opportunityBadge') setOppRotation(angle);
  };

  const startPostDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1080 / rect.width);
    const y = (e.clientY - rect.top) * (1350 / rect.height);
    if (y <= 170 || y >= 1180) {
      setSelectedElement('headerFooter');
      postDragRef.current = null;
      return;
    }
    const selectedRegion = selectedElement ? renderedRegionsRef.current[selectedElement] : null;
    const activeRegion = selectedElement && !IMAGE_CELL_KEYS.includes(selectedElement) ? selectedRegion : null;
    if (activeRegion) {
      if (selectedElement === 'priceContainer') {
        const scaleHandleX = activeRegion.x + activeRegion.w;
        const scaleHandleY = activeRegion.y + activeRegion.h;
        // O controle de escala fica no mesmo canto da alça inferior direita.
        // Ele precisa ter prioridade quando o container estiver baixo, pois nesse
        // caso a alça lateral fica próxima demais do canto.
        if (Math.hypot(x - scaleHandleX, y - scaleHandleY) <= 24) {
          postDragRef.current = { key: selectedElement, x, y, mode: 'resize' };
          return;
        }
        const centerX = activeRegion.x + activeRegion.w / 2;
        const centerY = activeRegion.y + activeRegion.h / 2;
        const side = Math.abs(x - activeRegion.x) <= 16 && Math.abs(y - centerY) <= 52 ? 'left'
          : Math.abs(x - (activeRegion.x + activeRegion.w)) <= 16 && Math.abs(y - centerY) <= 52 ? 'right'
          : Math.abs(x - centerX) <= 80 && Math.abs(y - activeRegion.y) <= 16 ? 'top'
          : Math.abs(x - centerX) <= 80 && Math.abs(y - (activeRegion.y + activeRegion.h)) <= 16 ? 'bottom'
          : null;
        if (side) { postDragRef.current = { key: selectedElement, x, y, mode: 'resize-container', side }; return; }
        const rotateX = activeRegion.x + activeRegion.w + 42;
        const rotateY = activeRegion.y + activeRegion.h + 42;
        if (Math.hypot(x - rotateX, y - rotateY) <= 22) { postDragRef.current = { key: selectedElement, x, y, mode: 'rotate' }; return; }
        if (x >= activeRegion.x && x <= activeRegion.x + activeRegion.w && y >= activeRegion.y && y <= activeRegion.y + activeRegion.h) {
          postDragRef.current = { key: selectedElement, x, y, mode: 'move' };
          return;
        }
      }
      const handleX = activeRegion.x + activeRegion.w;
      const handleY = activeRegion.y + activeRegion.h;
      const rotateX = activeRegion.x + activeRegion.w + 42;
      const rotateY = activeRegion.y + activeRegion.h + 42;
      if (selectedElement && TEXT_ELEMENT_KEYS.includes(selectedElement)) {
        if (selectedElement === 'title') {
          if (Math.hypot(x - handleX, y - handleY) <= 22) {
            postDragRef.current = { key: selectedElement, x, y, mode: 'resize' };
            return;
          }
          const centerY = activeRegion.y + activeRegion.h / 2;
          const side = Math.abs(x - activeRegion.x) <= 28 && Math.abs(y - centerY) <= Math.max(36, activeRegion.h / 2 + 12) ? 'left'
            : Math.abs(x - (activeRegion.x + activeRegion.w)) <= 28 && Math.abs(y - centerY) <= Math.max(36, activeRegion.h / 2 + 12) ? 'right'
            : null;
          if (side) {
            postDragRef.current = { key: selectedElement, x, y, mode: 'resize-text', side };
            return;
          }
        }
        // Os demais textos usam somente o quadrado do canto para alterar a fonte.
      } else if (selectedElement && selectedElement !== 'installments') {
        const centerX = activeRegion.x + activeRegion.w / 2;
        const centerY = activeRegion.y + activeRegion.h / 2;
        const side = Math.abs(x - activeRegion.x) <= 14 && Math.abs(y - centerY) <= 30 ? 'left'
          : Math.abs(x - (activeRegion.x + activeRegion.w)) <= 14 && Math.abs(y - centerY) <= 30 ? 'right'
          : Math.abs(x - centerX) <= 30 && Math.abs(y - activeRegion.y) <= 14 ? 'top'
          : Math.abs(x - centerX) <= 30 && Math.abs(y - (activeRegion.y + activeRegion.h)) <= 14 ? 'bottom'
          : null;
        if (side) { postDragRef.current = { key: selectedElement, x, y, mode: 'resize-side', side }; return; }
      }
      if (Math.hypot(x - handleX, y - handleY) <= 22) {
        postDragRef.current = { key: selectedElement, x, y, mode: 'resize' };
        return;
      }
      if (selectedElement !== 'installments' && Math.hypot(x - rotateX, y - rotateY) <= 22) {
        postDragRef.current = { key: selectedElement, x, y, mode: 'rotate', centerX: activeRegion.x + activeRegion.w / 2, centerY: activeRegion.y + activeRegion.h / 2 };
        return;
      }
    }
    const priceHighlightRegion = renderedRegionsRef.current.priceHighlight;
    if (selectedElement !== 'priceHighlight' && priceHighlightRegion && x >= priceHighlightRegion.x && x <= priceHighlightRegion.x + priceHighlightRegion.w && y >= priceHighlightRegion.y && y <= priceHighlightRegion.y + priceHighlightRegion.h) {
      setSelectedElement('priceHighlight');
      postDragRef.current = null;
      return;
    }
    const regions = Object.values(renderedRegionsRef.current)
      .filter(region => region.key !== 'imageGrid' && region.key !== 'priceContainer');
    const drawnOrder = renderedLayerOrderRef.current;
    const topmostFirst = [...regions].sort((first, second) => drawnOrder.indexOf(second.key) - drawnOrder.indexOf(first.key));
    const hit = [...topmostFirst, ...regions.filter(region => !drawnOrder.includes(region.key)).reverse()]
      .find(region => x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h);
    if (!hit) {
      const gridRegion = renderedRegionsRef.current.imageGrid;
      if (gridRegion && x >= gridRegion.x && x <= gridRegion.x + gridRegion.w && y >= gridRegion.y && y <= gridRegion.y + gridRegion.h) {
        setSelectedElement('imageGrid');
        postDragRef.current = { key: 'imageGrid', x, y, mode: 'move' };
        return;
      }
    }
    setSelectedElement((hit?.key || null) as SelectedElement);
    postDragRef.current = hit && !IMAGE_CELL_KEYS.includes(hit.key) ? { key: hit.key as SelectedElement, x, y, mode: 'move' } : null;
  };

  const dragPostElement = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = postDragRef.current;
    if (!drag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1080 / rect.width);
    const y = (e.clientY - rect.top) * (1350 / rect.height);
    const dx = Math.round(x - drag.x), dy = Math.round(y - drag.y);
    if (drag.mode === 'resize') {
      const amount = Math.round((dx + dy) / (drag.key === 'title' || drag.key === 'installments' ? 2 : 8));
      if (amount) {
        if (drag.key === 'priceContainer') {
          setPriceContainerWidth(value => Math.max(180, value + amount));
          setPriceContainerHeight(value => Math.max(80, value + amount));
        } else resizeSelectedElement(drag.key, amount);
        postDragRef.current = { ...drag, x, y };
      }
    } else if (drag.mode === 'resize-container' && drag.side) {
      if (drag.side === 'right') setPriceContainerWidth(value => Math.max(180, value + dx));
      else if (drag.side === 'bottom') setPriceContainerHeight(value => Math.max(80, value + dy));
      else if (drag.side === 'left') { setPriceContainerWidth(value => Math.max(180, value - dx)); setPriceContainerOffsetX(value => value + dx); }
      else { setPriceContainerHeight(value => Math.max(80, value - dy)); setPriceContainerOffsetY(value => value + dy); }
      postDragRef.current = { ...drag, x, y };
    } else if (drag.mode === 'resize-side' && drag.side) {
      const distance = drag.side === 'left' ? -dx : drag.side === 'right' ? dx : drag.side === 'top' ? -dy : dy;
      const amount = Math.round(distance / 4);
      if (amount) {
        if (drag.key === 'priceHighlight') {
          if (drag.side === 'left' || drag.side === 'right') setPriceHighlightExtraWidth(value => Math.max(-20, value + amount));
          else setPriceHighlightExtraHeight(value => Math.max(-20, value + amount));
        } else resizeSelectedElement(drag.key, amount);
        postDragRef.current = { ...drag, x, y };
      }
    } else if (drag.mode === 'resize-text' && drag.side) {
      const distance = drag.side === 'left' ? -dx : drag.side === 'right' ? dx : drag.side === 'top' ? -dy : dy;
      const region = drag.key ? renderedRegionsRef.current[drag.key] : null;
      if (drag.side === 'left' || drag.side === 'right') {
        if (drag.key && region && distance) {
          const minimum = drag.key === 'title' ? 120 : 30;
          const nextWidth = Math.min(900, Math.max(minimum, drag.key === 'title' ? region.w + distance : (textSelectionWidths[drag.key as string] || region.w) + distance));
          if (drag.key === 'title') { setProductTitleMaxContainerWidth(nextWidth); setIsTitleWidthFixed(true); }
          setTextSelectionWidths(current => ({ ...current, [drag.key as string]: nextWidth }));
        }
      } else if (drag.key && region && distance) setTextSelectionHeights(current => ({ ...current, [drag.key as string]: Math.max(20, (current[drag.key as string] || region.h) + distance) }));
      postDragRef.current = { ...drag, x, y };
    } else if (drag.mode === 'rotate' && drag.centerX !== undefined && drag.centerY !== undefined) {
      rotateSelectedElement(drag.key, Math.round(Math.atan2(y - drag.centerY, x - drag.centerX) * 180 / Math.PI + 90));
    } else if (dx || dy) {
      moveSelectedElement(drag.key, dx, dy);
      if (drag.key && CONTAINER_CHILD_KEYS.includes(drag.key)) {
        const container = renderedRegionsRef.current.priceContainer;
        if (container && (x < container.x || x > container.x + container.w || y < container.y || y > container.y + container.h)) {
          setDetachedContainerElements(current => ({ ...current, [drag.key as string]: true }));
        }
      }
      postDragRef.current = { ...drag, x, y };
    }
  };

  const handlePostPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragPostElement(event);
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (1080 / rect.width);
    const y = (event.clientY - rect.top) * (1350 / rect.height);
    const grid = renderedRegionsRef.current.imageGrid;
    const hovering = Boolean(grid && x >= grid.x && x <= grid.x + grid.w && y >= grid.y && y <= grid.y + grid.h);
    setIsGridHovered(current => current === hovering ? current : hovering);
  };

  const handleOpenTemplate = () => {
    setActivePostId(null);
    if (marketingDefaults) applyState(marketingDefaults);
    setIsEditingTemplate(true);
    setIsModalOpen(true);
  };

  const handleChooseModelProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setMainImageIndex(0);
    setSecondaryImageIndex(1);
    setMainImageSource('product:0');
    setSecondaryImageSource('product:1');
    setDefaultModelProductId(product.id);
    setSearchTerm(product.name);
    setModelProductQuery('');
    setIsModelProductPickerOpen(false);
    void saveTemplateDefaults(false, { defaultModelProductId: product.id });
    toast.success(`"${product.name}" definido como produto modelo padrão.`);
  };

  const handleEditPost = (post: any) => {
    setActivePostId(post.id);
    if (post.settings) {
      applyState(post.settings);
    }
    setIsModalOpen(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (!activeProduct) return;
    try {
      const currentSpecs = activeProduct.technical_specs || {};
      const currentPosts = Array.isArray(currentSpecs.posts) ? currentSpecs.posts : [];
      const updatedPosts = currentPosts.filter((p: any) => p.id !== postId);
      const updatedSpecs = { ...currentSpecs, posts: updatedPosts };
      
      const { error } = await supabase.from("products").update({ technical_specs: updatedSpecs }).eq("id", activeProduct.id);
      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === activeProduct.id ? { ...p, technical_specs: updatedSpecs } : p));
      toast.success("Post excluído com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao excluir post.");
    }
  };

  const handleDownloadDirect = async () => {
    if (!activeProduct) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    await drawBannerAsync(canvas, true);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `post-${activeProduct.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Download da imagem iniciado!");
    }, "image/png");
  };

  const handleCopyDirect = async () => {
    if (!activeProduct) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    await drawBannerAsync(canvas, true);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        toast.success("Imagem copiada para a área de transferência! 📋");
      } catch (err) {
        toast.error("Seu navegador não suporta cópia direta de imagem.");
      }
    }, "image/png");
  };

  const handleShareDirect = async () => {
    if (!activeProduct) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    await drawBannerAsync(canvas, true);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `post-${activeProduct.name}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: activeProduct.name });
      } else {
        await handleCopyDirect();
      }
    }, "image/png");
  };

  const handleSavePost = async () => {
    if (!activeProduct) return;
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
      await drawBannerAsync(canvas, true);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const postUniqueId = activePostId || Date.now().toString();
        const fileName = `post-${activeProduct.id}-${postUniqueId}.png`;
        try {
          const file = new File([blob], fileName, { type: "image/png" });
          const fileUrl = await uploadFile(file, `marketing-posts/${fileName}`);
          const currentSpecs = activeProduct.technical_specs || {};
          const currentPosts = Array.isArray(currentSpecs.posts) ? currentSpecs.posts : [];
          const nowISO = new Date().toISOString();
          const newPostData = {
            id: postUniqueId,
            imageUrl: fileUrl,
            createdAt: activePostId ? (currentPosts.find((p: any) => p.id === activePostId)?.createdAt || nowISO) : nowISO,
            updatedAt: nowISO,
            settings: getCurrentState()
          };
          const updatedPosts = activePostId
            ? currentPosts.map((p: any) => p.id === activePostId ? newPostData : p)
            : [newPostData, ...currentPosts];
          const updatedSpecs = { ...currentSpecs, posts: updatedPosts, marketing_banner_url: fileUrl };
          
          const { error } = await supabase.from("products").update({ technical_specs: updatedSpecs }).eq("id", activeProduct.id);
          if (error) throw error;

          setProducts(prev => prev.map(p => p.id === activeProduct.id ? { ...p, technical_specs: updatedSpecs } : p));
          setActivePostId(postUniqueId);
          setIsModalOpen(false);
          toast.success("Post salvo e publicado com sucesso! ✨");
        } catch (err: any) {
          console.error(err);
          toast.error("Falha ao salvar imagem do post.");
        } finally {
          setDownloading(false);
        }
      }, "image/png");
    } catch (e: any) {
      console.error(e);
      setDownloading(false);
    }
  };

  const handleSaveDefaults = () => saveTemplateDefaults(true);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-slate-400 text-sm uppercase tracking-wider">Carregando gerador de posts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={isTemplateRoute ? 'h-[100dvh] w-full overflow-hidden bg-white dark:bg-slate-900' : 'mx-auto max-w-7xl animate-fade-in space-y-8 p-4 md:p-8'}>
      {!isTemplateRoute && <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 shrink-0">
            <i className="bi bi-instagram text-2xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Posts para Redes Sociais
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-100 dark:border-pink-800">
                Marketing Visual
              </span>
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mt-1">
              Crie artes promocionais profissionais (1080 × 1350, proporção 4:5) para Instagram, Facebook e WhatsApp.
            </p>
            <button
              type="button"
              onClick={() => window.open('/templates/posts', '_blank')}
              title="Editar as regras usadas na geração dos posts"
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-pink-500/20"
            >
              <i className="bi bi-layout-text-window-reverse text-xs" />
              Template para os Posts
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDefaults}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            title="Salvar cabeçalhos e rodapés como padrão para novos posts"
          >
            <i className="bi bi-pin-angle-fill text-amber-500" />
            <span>Fixar Padrões</span>
          </button>
        </div>
      </div>

      {/* Caixa de Seleção do Produto */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm max-w-xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-base font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">Selecione um Produto</h2>
          <p className="text-xs text-slate-400">Busque pelo nome para criar ou visualizar os posts promocionais</p>
        </div>

        <div className="relative">
          <div className="relative">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Digite o nome do produto..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (selectedProductId) setSelectedProductId("");
              }}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-slate-100"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(""); setSelectedProductId(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <i className="bi bi-x-lg text-xs" />
              </button>
            )}
          </div>

          {/* Sugestões */}
          {searchTerm && !selectedProductId && filteredProducts.length > 0 && (
            <ul className="absolute z-[100] top-full mt-1 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
              {filteredProducts.slice(0, 10).map(p => {
                const mainImg = p.product_images?.find(img => img.is_main)?.image_url || p.product_images?.[0]?.image_url || null;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setSearchTerm(p.name);
                      }}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                        {mainImg ? (
                          <img src={mainImg} alt={p.name} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <i className="bi bi-image text-slate-400" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{p.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Badge do Produto Selecionado */}
        {activeProduct && (() => {
          const mainImg = activeProduct.product_images?.find(img => img.is_main)?.image_url || activeProduct.product_images?.[0]?.image_url || null;
          return (
            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-3 py-2">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/40 shrink-0 flex items-center justify-center">
                {mainImg ? (
                  <img src={mainImg} alt={activeProduct.name} className="w-full h-full object-contain p-0.5" />
                ) : (
                  <i className="bi bi-image text-slate-400" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <i className="bi bi-check-circle-fill text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">{activeProduct.name}</span>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedProductId(""); setSearchTerm(""); }}
                className="text-blue-400 hover:text-blue-600 shrink-0"
              >
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>
          );
        })()}
      </div>

      {activeProduct && (
        <section className="mx-auto w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 text-center">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">Post gerado pelo template</h2>
            <p className="mt-1 text-xs text-slate-400">Prévia para {activeProduct.name}</p>
          </div>
          <canvas ref={productPreviewCanvasRef} width={1080} height={1350} className="mx-auto block aspect-[4/5] w-full max-w-sm rounded-2xl bg-slate-950 shadow-lg" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" onClick={handleDownloadDirect} className="rounded-xl bg-pink-600 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-pink-700">
              <i className="bi bi-download mr-1" />Baixar
            </button>
            <button type="button" onClick={handleCopyDirect} className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
              <i className="bi bi-copy mr-1" />Copiar
            </button>
            <button type="button" onClick={handleShareDirect} className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
              <i className="bi bi-share mr-1" />Compartilhar
            </button>
          </div>
        </section>
      )}

      {/* Grid de Posts do Produto */}
      {activeProduct && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{activeProduct.name}</h2>
              <p className="text-xs text-slate-400">Artes promocionais cadastradas para este produto</p>
            </div>
            <button
              type="button"
              onClick={handleNewPost}
              className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-pink-500/20 self-start sm:self-auto"
            >
              <i className="bi bi-plus-lg text-sm" />
              <span>Criar Novo Post</span>
            </button>
          </div>

          {postsList.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
              <i className="bi bi-images text-5xl text-slate-300 dark:text-slate-700 block animate-pulse" />
              <div className="space-y-1">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Nenhum post criado ainda</h3>
                <p className="text-xs text-slate-400">Clique em "Criar Novo Post" para montar a arte promocional deste produto!</p>
              </div>
              <button
                type="button"
                onClick={handleNewPost}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                Criar Primeiro Post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {postsList.map((post: any) => (
                <div key={post.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col">
                  <div className="relative aspect-[4/5] w-full bg-slate-950 flex items-center justify-center border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                    <img src={post.imageUrl} alt="Post" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 px-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleEditPost(post)}
                        className="px-3 py-1.5 bg-white text-slate-900 rounded-full hover:scale-105 transition shadow-lg font-bold text-[11px] flex items-center gap-1.5"
                      >
                        <i className="bi bi-pencil-fill text-blue-600" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(post.imageUrl, "_blank")}
                        className="px-3 py-1.5 bg-white text-slate-900 rounded-full hover:scale-105 transition shadow-lg font-bold text-[11px] flex items-center gap-1.5"
                      >
                        <i className="bi bi-eye-fill text-emerald-600" />
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Deseja realmente excluir este post?")) {
                            handleDeletePost(post.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-white text-rose-600 rounded-full hover:scale-105 transition shadow-lg font-bold text-[11px] flex items-center gap-1.5"
                      >
                        <i className="bi bi-trash-fill" />
                        Excluir
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        Criado: {new Date(post.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3">
                      <button
                        type="button"
                        onClick={() => setSelectedQuickActionsPost(post)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Opções de Compartilhamento e Download"
                      >
                        <i className="bi bi-three-dots-vertical" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Ações Rápidas (3 Pontos) */}
      {selectedQuickActionsPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-sm w-full p-6 shadow-2xl relative space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Opções do Post</h4>
              <button 
                onClick={() => setSelectedQuickActionsPost(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
              >
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>

            <div className="aspect-square w-32 h-32 mx-auto rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-950 flex items-center justify-center">
              <img src={selectedQuickActionsPost.imageUrl} alt="Preview" className="object-contain p-1 w-full h-full" />
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  handleEditPost(selectedQuickActionsPost);
                  setSelectedQuickActionsPost(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center gap-2"
              >
                <i className="bi bi-pencil" />
                Editar no Editor Visual
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(selectedQuickActionsPost.imageUrl);
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `post-${selectedQuickActionsPost.id}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Download concluído!");
                  } catch (e) {
                    toast.error("Falha ao baixar imagem.");
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center gap-2"
              >
                <i className="bi bi-download" />
                Baixar Imagem (Download)
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(selectedQuickActionsPost.imageUrl);
                    const blob = await res.blob();
                    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                    toast.success("Imagem copiada para a área de transferência! 📋");
                  } catch (e) {
                    await navigator.clipboard.writeText(selectedQuickActionsPost.imageUrl);
                    toast.success("Link da imagem copiado!");
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center gap-2"
              >
                <i className="bi bi-copy" />
                Copiar Imagem
              </button>
            </div>
          </div>
        </div>
      )}

      </>}

      {/* Editor Visual de Post */}
      {isModalOpen && (activeProduct || isEditingTemplate) && (
        <div className={`z-50 flex w-full p-0 overflow-hidden ${isTemplateRoute ? 'relative h-full bg-white dark:bg-slate-900' : 'fixed inset-0 h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-screen bg-slate-950/80 backdrop-blur-md'}`}>
          <div className={`flex min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-slate-900 ${isTemplateRoute ? 'h-full' : 'h-[100dvh] shadow-2xl'}`} onPointerDownCapture={() => { if (isEditingTemplate) templateUserDirtyRef.current = true; }} onChangeCapture={() => { if (isEditingTemplate) templateUserDirtyRef.current = true; }} onBlurCapture={() => { if (isEditingTemplate && templateUserDirtyRef.current) void saveTemplateDefaults().then(saved => { if (saved) templateUserDirtyRef.current = false; }); }}>
            
            {/* Modal Header */}
            <div className={`${isTemplateRoute ? 'px-6 pb-4 pt-0' : 'px-6 py-4'} border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 flex items-center justify-center">
                  <i className="bi bi-brush text-lg" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    {isEditingTemplate ? 'Template para os Posts' : 'Editor de Post Promocional'}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isEditingTemplate ? 'Regras globais de geração' : activeProduct?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="px-3 py-2 text-xs font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Desfazer (Ctrl+Z)"
                >
                  Desfazer
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  className="px-3 py-2 text-xs font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Refazer (Ctrl+Y)"
                >
                  Refazer
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    if (isTemplateRoute && window.opener) window.close();
                    else if (isTemplateRoute) window.history.back();
                  }}
                  className="px-3 py-2 text-xs font-black text-slate-500 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <i className="bi bi-arrow-left mr-1" />Voltar ao ERP
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
              <div className="relative shrink-0">
                <button type="button" onClick={() => setIsFileMenuOpen(value => !value)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800" title="Arquivos">
                  Arquivos <i className="bi bi-chevron-down text-[9px] text-slate-400" />
                </button>
                {isFileMenuOpen && (
                  <div className="absolute left-0 top-full z-30 mt-2 w-52 rounded-2xl border border-slate-200 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                    <button type="button" onClick={() => { setIsFileMenuOpen(false); handleDownloadDirect(); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-950">
                      <i className="bi bi-file-earmark-arrow-down-fill text-sm text-emerald-600" /> Baixar PNG
                    </button>
                    <button type="button" onClick={() => { setIsFileMenuOpen(false); handleCopyDirect(); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-950">
                      <i className="bi bi-clipboard-check-fill text-sm text-blue-600" /> Copiar imagem
                    </button>
                  </div>
                )}
              </div>
              <div className="relative shrink-0">
                <button type="button" onClick={() => setIsLayersPanelOpen(v => !v)} className="rounded-lg px-2 py-1 text-xs font-black text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800" title="Camadas"><i className="bi bi-layers-fill text-blue-600" /></button>
                {isLayersPanelOpen && (
                  <div className="absolute left-0 top-full z-30 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Arraste para organizar</p>
                    <div className="max-h-72 overflow-y-auto">
                      {layerOrder.map(key => (
                        <div key={key} draggable onDragStart={event => event.dataTransfer.setData('text/plain', key)} onDragOver={event => event.preventDefault()} onDrop={event => { const dragged = event.dataTransfer.getData('text/plain'); if (dragged && dragged !== key) setLayerOrder(items => { const next = items.filter(item => item !== dragged); next.splice(next.indexOf(key), 0, dragged); return next; }); }} className={`mb-1 flex w-full cursor-grab items-center gap-1 rounded-lg p-1 text-left text-[10px] font-bold active:cursor-grabbing ${selectedElement === key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                          <button type="button" onClick={() => { setSelectedElement(key as SelectedElement); setIsLayersPanelOpen(false); }} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1">
                            <i className="bi bi-grip-vertical shrink-0 text-slate-400" /><span className="truncate">{postLayerLabels[key]}</span>
                          </button>
                          <button type="button" onClick={event => { event.stopPropagation(); centerLayerElement(key as SelectedElement); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/80 text-blue-600 shadow-sm hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700" title={`Trazer ${postLayerLabels[key]} para o centro`} aria-label={`Centralizar ${postLayerLabels[key]}`}>
                            <i className="bi bi-bullseye" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button type="button" onClick={() => setIsModelProductPickerOpen(v => !v)} className="flex max-w-56 items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800" title="Escolher produto modelo padrão">
                  <i className="bi bi-box-seam text-pink-600" />
                  <span className="truncate">{activeProduct?.id === TEMPLATE_PREVIEW_PRODUCT.id ? 'Produto modelo padrão' : activeProduct?.name || 'Produto modelo padrão'}</span>
                  <i className="bi bi-chevron-down text-[9px]" />
                </button>
                {isModelProductPickerOpen && (
                  <div className="absolute left-0 top-full z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="relative mb-2">
                      <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input autoFocus value={modelProductQuery} onChange={event => setModelProductQuery(event.target.value)} placeholder="Buscar produto no ERP..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-pink-400 dark:border-slate-700 dark:bg-slate-800" />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {products.filter(product => product.name.toLowerCase().includes(modelProductQuery.trim().toLowerCase())).slice(0, 10).map(product => (
                        <button key={product.id} type="button" onClick={() => handleChooseModelProduct(product)} className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
                          <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{product.name}</span>
                          <span className="text-[10px] text-slate-500">R$ {Number(product.promo_price ?? product.price ?? 0).toFixed(2).replace('.', ',')}</span>
                        </button>
                      ))}
                      {!products.some(product => product.name.toLowerCase().includes(modelProductQuery.trim().toLowerCase())) && (
                        <p className="px-3 py-4 text-center text-xs text-slate-500">Nenhum produto encontrado.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-700" />
              <button type="button" onClick={() => setEditorZoom(v => Math.max(0.5, v - 0.1))} className="rounded-lg px-2 py-1 text-xs font-black text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800" title="Diminuir zoom"><i className="bi bi-zoom-out" /></button>
              <button type="button" onClick={() => setEditorZoom(1)} className="rounded-lg px-2 py-1 text-xs font-black text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800">{Math.round(editorZoom * 100)}%</button>
              <button type="button" onClick={() => setEditorZoom(v => Math.min(1.4, v + 0.1))} className="rounded-lg px-2 py-1 text-xs font-black text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800" title="Aumentar zoom"><i className="bi bi-zoom-in" /></button>
            </div>

            <div className="hidden min-h-12 shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
              {!selectedElement && <span className="text-xs font-medium text-slate-400">Selecione um elemento no preview.</span>}
              {selectedElement && <>
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-600">{selectedElement === 'mainImage' ? 'Foto principal' : selectedElement === 'secondaryImage' ? 'Foto secundária' : selectedElement === 'opportunityBadge' ? 'Selo de oportunidade' : selectedElement === 'priceContainer' ? 'Container de preços' : selectedElement === 'priceHighlight' ? 'Fundo do preço principal' : selectedElement === 'title' ? 'Título do produto' : selectedElement === 'priceDe' ? 'Preço de' : selectedElement === 'pricePor' ? 'Preço por' : selectedElement === 'porApenas' ? 'Texto por' : selectedElement === 'installments' ? 'Parcelamento' : selectedElement === 'measures' ? 'Descrição' : selectedElement === 'brand' ? 'Marca' : selectedElement === 'slogan' ? 'Slogan' : selectedElement === 'footerAddress' ? 'Endereço' : 'Título do rodapé'}</span>
                {selectedElement === 'priceContainer' && <>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">Cor do fundo <input type="color" value={priceContainerBackgroundColor} onChange={event => setPriceContainerBackgroundColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" /><output className="w-20 font-mono text-[10px] uppercase text-slate-400">{priceContainerBackgroundColor}</output></label>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                    <span className="px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Altura</span>
                    <button type="button" onClick={() => setPriceContainerHeight(value => Math.max(80, value - 20))} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700" title="Diminuir altura"><i className="bi bi-dash-lg" /></button>
                    <input type="number" min="80" value={priceContainerHeight} onChange={event => setPriceContainerHeight(Math.max(80, Number(event.target.value) || 80))} className="w-14 bg-transparent text-center text-xs font-black outline-none" />
                    <button type="button" onClick={() => setPriceContainerHeight(value => value + 20)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700" title="Aumentar altura"><i className="bi bi-plus-lg" /></button>
                  </div>
                </>}
                {selectedElement === 'priceHighlight' && <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">Cor do fundo <input type="color" value={priceHighlightBackgroundColor} onChange={event => setPriceHighlightBackgroundColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" /><output className="w-20 font-mono text-[10px] uppercase text-slate-400">{priceHighlightBackgroundColor}</output></label>}
                {selectedElement === 'priceContainer' && <button type="button" onClick={() => { setShowPriceContainer(false); setSelectedElement(null); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Remover container" aria-label="Remover container"><i className="bi bi-trash3-fill" /></button>}
                {selectedElement === 'title' && <span className="text-xs font-bold text-slate-500">Nome dinâmico do produto selecionado</span>}
                {selectedElement === 'priceDe' && <input type="number" step="0.01" value={customPrice} onChange={event => setCustomPrice(event.target.value)} placeholder="Preço antigo" className="w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'pricePor' && <input type="number" step="0.01" value={customPromoPrice} onChange={event => setCustomPromoPrice(event.target.value)} placeholder="Preço final" className="w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'porApenas' && <input value={porApenasText} onChange={event => setPorApenasText(event.target.value)} className="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'measures' && <input value={measuresText} onChange={event => setMeasuresText(event.target.value)} placeholder="Descrição e medidas" className="w-72 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'brand' && <input value={brandName} onChange={event => setBrandName(event.target.value)} className="w-56 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'slogan' && <input value={slogan} onChange={event => setSlogan(event.target.value)} className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'footerAddress' && <input value={footerAddressText} onChange={event => setFooterAddressText(event.target.value)} className="w-80 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'footerTitle' && <input value={footerAddressTitle} onChange={event => setFooterAddressTitle(event.target.value)} className="w-72 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {(['title', 'priceDe', 'pricePor', 'porApenas', 'measures', 'brand', 'slogan', 'footerTitle', 'footerAddress'] as SelectedElement[]).includes(selectedElement) && (
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">Tamanho
                    <input type="number" min="1" value={selectedElement === 'title' ? productTitleFontSize : selectedElement === 'priceDe' ? priceDeFontSize : selectedElement === 'pricePor' ? priceFontSize : selectedElement === 'porApenas' ? porApenasFontSize : selectedElement === 'installments' ? installmentsFontSize : selectedElement === 'measures' ? measuresFontSize : selectedElement === 'brand' ? brandFontSize : selectedElement === 'slogan' ? sloganFontSize : selectedElement === 'footerTitle' ? footerAddressTitleFontSize : footerAddressTextFontSize} onChange={event => { const value = Math.max(1, Number(event.target.value) || 1); if (selectedElement === 'title') setProductTitleFontSize(value); else if (selectedElement === 'priceDe') setPriceDeFontSize(value); else if (selectedElement === 'pricePor') setPriceFontSize(value); else if (selectedElement === 'porApenas') setPorApenasFontSize(value); else if (selectedElement === 'installments') setInstallmentsFontSize(value); else if (selectedElement === 'measures') setMeasuresFontSize(value); else if (selectedElement === 'brand') setBrandFontSize(value); else if (selectedElement === 'slogan') setSloganFontSize(value); else if (selectedElement === 'footerTitle') setFooterAddressTitleFontSize(value); else setFooterAddressTextFontSize(value); }} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" /> px
                  </label>
                )}
                {(['title', 'priceDe', 'pricePor', 'porApenas', 'measures', 'brand', 'slogan', 'footerTitle', 'footerAddress'] as SelectedElement[]).includes(selectedElement) && (
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">Fonte
                    <select value={textFontFamilies[selectedElement as string] || DEFAULT_FONT_FAMILY} onChange={event => setTextFontFamilies(current => ({ ...current, [selectedElement as string]: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" style={{ fontFamily: textFontFamilies[selectedElement as string] || DEFAULT_FONT_FAMILY }}>
                      {FONT_OPTIONS.map(font => <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.label}</option>)}
                    </select>
                  </label>
                )}
                {(['title', 'priceDe', 'pricePor', 'porApenas', 'measures', 'brand', 'slogan', 'footerTitle', 'footerAddress'] as SelectedElement[]).includes(selectedElement) && (
                  <TextColorPicker color={textColors[selectedElement as string] || DEFAULT_TEXT_COLORS[selectedElement as string] || '#000000'} label={selectedElement === 'title' ? 'Título do produto' : selectedElement === 'priceDe' ? 'Preço de' : selectedElement === 'pricePor' ? 'Preço por' : selectedElement === 'porApenas' ? 'Texto por apenas' : selectedElement === 'installments' ? 'Parcelamento' : selectedElement === 'measures' ? 'Descrição' : selectedElement === 'brand' ? 'Marca' : selectedElement === 'slogan' ? 'Slogan' : selectedElement === 'footerTitle' ? 'Título do rodapé' : 'Endereço'} recentColors={colorHistory} onChange={color => setTextColors(current => ({ ...current, [selectedElement as string]: color }))} onCommit={color => setColorHistory(current => [color, ...current.filter(item => item.toLowerCase() !== color.toLowerCase())].slice(0, 10))} />
                )}
                {selectedElement === 'opportunityBadge' && <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">Escala <input type="number" min="40" max="180" value={oppScale} onChange={event => setOppScale(Math.min(180, Math.max(40, Number(event.target.value) || 40)))} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" /> %</label>}
              </>}
            </div>

            {/* Modal Body: 2 Colunas (Canvas Preview + Controles) */}
            <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-6 grid grid-cols-[minmax(132px,30vw)_minmax(0,1fr)] lg:grid-cols-12 gap-3 sm:gap-6">
              <aside className="lg:col-span-2 -mb-4 -ml-4 -mt-4 min-h-0 self-stretch overflow-y-auto border-b border-r border-slate-200 bg-slate-50 p-3 custom-scrollbar sm:-mb-6 sm:-ml-6 sm:-mt-6 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col gap-3">
                  {selectedElement === 'headerFooter' && <label className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-black text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">Cabeçalho e rodapé
                    <button type="button" onClick={() => setIsHeaderFooterEditorOpen(true)} className="flex items-center justify-between rounded-lg bg-white/80 px-2 py-2 text-left text-[10px] font-bold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200"><span className="truncate">{headerFooterModelName || 'Padrão'}</span><i className="bi bi-chevron-right" /></button>
                  </label>}
                  {selectedElement ? <div className="rounded-xl border border-pink-200 bg-pink-50 p-3 dark:border-pink-900/50 dark:bg-pink-950/20"><p className="text-[9px] font-black uppercase tracking-wider text-pink-500">Elemento selecionado</p><p className="mt-1 text-xs font-black text-slate-700 dark:text-slate-200">{selectedElement === 'headerFooter' ? 'Cabeçalho e rodapé' : selectedElement === 'imageGrid' ? 'Grid de fotos' : selectedElement === 'priceContainer' ? 'Container de preços' : selectedElement === 'priceHighlight' ? 'Fundo do preço principal' : selectedElement}</p></div> : <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-[10px] font-bold text-slate-400 dark:border-slate-700">Selecione um elemento no preview.</p>}
                  {(selectedElement === 'mainImage' || selectedElement === 'secondaryImage' || selectedElement === 'imageGrid') && <PostImageSourcePicker activeSlot={selectedElement === 'mainImage' ? 'main' : selectedElement === 'secondaryImage' ? 'secondary' : undefined} mainImageSource={mainImageSource} secondaryImageSource={secondaryImageSource} options={postImageOptions} onMainImageSourceChange={setMainImageSource} onSecondaryImageSourceChange={setSecondaryImageSource} />}
                  {selectedElement === 'imageGrid' && <ImageGridControls settings={imageGridSettings} additionalImageCount={gridExtraImageUrls.length} onChange={setImageGridSettings} />}
                  {selectedElement === 'priceDe' && <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Preço antigo<input type="number" step="0.01" value={customPrice} onChange={event => setCustomPrice(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" /></label>}
                  {selectedElement === 'priceDeLabel' && <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Texto “De”<input value={priceDeText} onChange={event => setPriceDeText(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" /></label>}
                  {selectedElement === 'porApenas' && <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Texto “Por apenas”<input value={porApenasText} onChange={event => setPorApenasText(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" /></label>}
                  {selectedElement === 'pricePor' && <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Altura da área de texto
                    <input type="number" min="20" value={textSelectionHeights.pricePor || Math.ceil(priceFontSize * 1.45)} onChange={event => setTextSelectionHeights(current => ({ ...current, pricePor: Math.max(20, Number(event.target.value) || 20) }))} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-black outline-none dark:border-slate-700 dark:bg-slate-900" />
                  </label>}
                  {selectedElement === 'installments' && <>
                    <InstallmentImageGallery images={installmentImageLibrary} selected={installmentImageUrl} uploading={uploadingInstallmentImage} onSelect={setInstallmentImageUrl} onUpload={uploadInstallmentImage} />
                    <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Escala da imagem (%)
                      <input type="number" min="20" max="300" value={installmentImageScale} onChange={event => setInstallmentImageScale(Math.max(20, Math.min(300, Number(event.target.value) || 20)))} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-black outline-none dark:border-slate-700 dark:bg-slate-900" />
                    </label>
                  </>}
                  {selectedElement === 'brand' && <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Marca<input value={brandName} onChange={event => setBrandName(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" /></label>}
                  {selectedElement === 'slogan' && <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Slogan<input value={slogan} onChange={event => setSlogan(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" /></label>}
                  {selectedElement === 'footerTitle' && <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Título do rodapé<input value={footerAddressTitle} onChange={event => setFooterAddressTitle(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" /></label>}
                  {selectedElement === 'footerAddress' && <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Endereço<input value={footerAddressText} onChange={event => setFooterAddressText(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" /></label>}
                  {selectedElement === 'priceContainer' && <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Tamanho do container</p>
                    <div className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-500"><span>Laterais</span><div className="flex items-center gap-1"><button type="button" onClick={() => setPriceContainerWidth(value => Math.max(180, value - 20))} className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Diminuir largura">−</button><output className="w-10 text-center">{priceContainerWidth}</output><button type="button" onClick={() => setPriceContainerWidth(value => value + 20)} className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Aumentar largura">+</button></div></div>
                    <div className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-500"><span>Altura</span><div className="flex items-center gap-1"><button type="button" onClick={() => setPriceContainerHeight(value => Math.max(80, value - 20))} className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Diminuir altura">−</button><output className="w-10 text-center">{priceContainerHeight}</output><button type="button" onClick={() => setPriceContainerHeight(value => value + 20)} className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Aumentar altura">+</button></div></div>
                    <div className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-500"><span>Escala</span><div className="flex items-center gap-1"><button type="button" onClick={() => { setPriceContainerWidth(value => Math.max(180, value - 20)); setPriceContainerHeight(value => Math.max(80, value - 20)); }} className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Diminuir escala">−</button><button type="button" onClick={() => { setPriceContainerWidth(value => value + 20); setPriceContainerHeight(value => value + 20); }} className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Aumentar escala">+</button></div></div>
                  </div>}
                  {(['title', 'priceDeLabel', 'priceDe', 'pricePor', 'porApenas', 'measures', 'brand', 'slogan', 'footerTitle', 'footerAddress'] as SelectedElement[]).includes(selectedElement) && <>
                    <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Tamanho da fonte (px)
                      <input type="number" min="1" value={selectedElement === 'title' ? productTitleFontSize : selectedElement === 'priceDeLabel' || selectedElement === 'priceDe' ? priceDeFontSize : selectedElement === 'pricePor' ? priceFontSize : selectedElement === 'porApenas' ? porApenasFontSize : selectedElement === 'installments' ? installmentsFontSize : selectedElement === 'measures' ? measuresFontSize : selectedElement === 'brand' ? brandFontSize : selectedElement === 'slogan' ? sloganFontSize : selectedElement === 'footerTitle' ? footerAddressTitleFontSize : footerAddressTextFontSize} onChange={event => { const value = Math.max(1, Number(event.target.value) || 1); if (selectedElement === 'title') setProductTitleFontSize(value); else if (selectedElement === 'priceDeLabel' || selectedElement === 'priceDe') setPriceDeFontSize(value); else if (selectedElement === 'pricePor') setPriceFontSize(value); else if (selectedElement === 'porApenas') setPorApenasFontSize(value); else if (selectedElement === 'installments') setInstallmentsFontSize(value); else if (selectedElement === 'measures') setMeasuresFontSize(value); else if (selectedElement === 'brand') setBrandFontSize(value); else if (selectedElement === 'slogan') setSloganFontSize(value); else if (selectedElement === 'footerTitle') setFooterAddressTitleFontSize(value); else setFooterAddressTextFontSize(value); }} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-black outline-none dark:border-slate-700 dark:bg-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800">Fonte
                      <select value={textFontFamilies[selectedElement as string] || DEFAULT_FONT_FAMILY} onChange={event => setTextFontFamilies(current => ({ ...current, [selectedElement as string]: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" style={{ fontFamily: textFontFamilies[selectedElement as string] || DEFAULT_FONT_FAMILY }}>
                        {FONT_OPTIONS.map(font => <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.label}</option>)}
                      </select>
                    </label>
                  </>}
                  {(['title', 'priceDeLabel', 'priceDe', 'pricePor', 'porApenas', 'measures', 'brand', 'slogan', 'footerTitle', 'footerAddress'] as SelectedElement[]).includes(selectedElement) && <TextColorPicker color={textColors[selectedElement as string] || DEFAULT_TEXT_COLORS[selectedElement as string] || '#000000'} label="Cor do texto" recentColors={colorHistory} onChange={color => setTextColors(current => ({ ...current, [selectedElement as string]: color }))} onCommit={color => setColorHistory(current => [color, ...current.filter(item => item.toLowerCase() !== color.toLowerCase())].slice(0, 10))} />}
                  {selectedElement && TEXT_ELEMENT_KEYS.includes(selectedElement) && <TextBackgroundControls value={textBackgrounds[selectedElement] || EMPTY_TEXT_BACKGROUND} onChange={background => setTextBackgrounds(current => ({ ...current, [selectedElement]: background }))} />}
                  {selectedElement && TEXT_ELEMENT_KEYS.includes(selectedElement) && <TextAlignmentControls horizontal={textHorizontalAlignments[selectedElement] || 'left'} vertical={textVerticalAlignments[selectedElement] || 'middle'} onHorizontalChange={alignment => setTextHorizontalAlignments(current => ({ ...current, [selectedElement]: alignment }))} onVerticalChange={alignment => setTextVerticalAlignments(current => ({ ...current, [selectedElement]: alignment }))} />}
                  {selectedElement === 'priceContainer' && <button type="button" onClick={() => { setShowPriceContainer(false); setSelectedElement(null); }} className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20"><i className="bi bi-trash3-fill" /> Remover container</button>}
                </div>
              </aside>
              
              {/* Coluna Esquerda: Canvas Preview Interativo (6 cols) */}
              <div className="lg:col-span-10 flex min-h-0 flex-col items-center justify-center">
                <div className="relative aspect-[4/5] h-[min(100%,calc(100vh-13rem))] max-h-full w-auto max-w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white" style={{ transform: `scale(${editorZoom})`, transformOrigin: 'center center' }}>
                  <canvas
                    ref={previewCanvasRef}
                    width={1080}
                    height={1350}
                    className="w-full h-full object-contain cursor-crosshair"
                    onPointerDown={startPostDrag}
                    onPointerMove={handlePostPointerMove}
                    onPointerUp={event => { postDragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
                    onPointerCancel={() => { postDragRef.current = null; }}
                    onPointerLeave={() => setIsGridHovered(false)}
                  />
                </div>

              </div>

              {/* Coluna Direita: Controles de Customização (6 cols) */}
              {selectedElement && <div className="hidden">
                
                {/* Seção 1: Textos & Preços */}
                <div className={`${selectedElement ? '' : 'hidden'} bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4`}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <i className="bi bi-type text-blue-500" />
                    Informações do Produto
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Título no Post</label>
                      <input
                        type="text"
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Preço Normal (DE:)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Preço Promo (POR:)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={customPromoPrice}
                          onChange={(e) => setCustomPromoPrice(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <InstallmentImageGallery images={installmentImageLibrary} selected={installmentImageUrl} uploading={uploadingInstallmentImage} onSelect={setInstallmentImageUrl} onUpload={uploadInstallmentImage} />

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Medidas Técnicas</label>
                      <input
                        type="text"
                        value={measuresText}
                        onChange={(e) => setMeasuresText(e.target.value)}
                        placeholder="Ex: L 180cm · A 210cm · P 50cm"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 2: Marca & Rodapé */}
                <div className={`${selectedElement ? '' : 'hidden'} bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4`}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <i className="bi bi-shop text-amber-500" />
                    Identidade da Loja
                  </h4>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nome da Marca</label>
                        <input
                          type="text"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Slogan</label>
                        <input
                          type="text"
                          value={slogan}
                          onChange={(e) => setSlogan(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Endereço no Rodapé</label>
                      <input
                        type="text"
                        value={footerAddressText}
                        onChange={(e) => setFooterAddressText(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Imagens & Oportunidade */}
                <div className={`${selectedElement ? '' : 'hidden'} bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4`}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <i className="bi bi-sliders text-purple-500" />
                    Ajustes Visuais
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSecondaryImage}
                        onChange={(e) => setShowSecondaryImage(e.target.checked)}
                        className="rounded text-pink-600 focus:ring-0"
                      />
                      Foto Secundária
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOpportunityBadge}
                        onChange={(e) => setShowOpportunityBadge(e.target.checked)}
                        className="rounded text-pink-600 focus:ring-0"
                      />
                      Selo Oportunidade
                    </label>
                  </div>

                  {/* Escala da Imagem Principal */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span>Tamanho da Foto Principal</span>
                      <span>{mainImageScale}%</span>
                    </div>
                    <input
                      type="number"
                      min="40"
                      max="180"
                      value={mainImageScale}
                      onChange={(e) => setMainImageScale(Math.min(180, Math.max(40, Number(e.target.value) || 40)))}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>

              </div>}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between shrink-0">
              {isEditingTemplate ? <div className="flex items-center gap-2 text-xs font-bold text-emerald-600"><span>Salvamento automático</span>{isAutoSaving && <span className="h-3.5 w-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" aria-label="Salvando alterações" />}</div> : <div />}

              {!isEditingTemplate && <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={downloading || isAutoSaving}
                  onClick={isEditingTemplate ? async () => {
                    const saved = await saveTemplateDefaults();
                    if (!saved) return;
                    setIsModalOpen(false);
                    setIsEditingTemplate(false);
                    if (isTemplateRoute && window.opener) window.close();
                    else if (isTemplateRoute) window.history.back();
                  } : handleSavePost}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-pink-500/20 active:scale-95 disabled:opacity-50"
                >
                  {downloading || isAutoSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <i className="bi bi-cloud-arrow-up-fill" />
                  )}
                  <span>Salvar & Publicar Arte</span>
                </button>
              </div>}
            </div>

          </div>
        </div>
      )}

      {isHeaderFooterInfoOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Tamanhos para o Canva</h4><button type="button" onClick={() => setIsHeaderFooterInfoOpen(false)}><i className="bi bi-x-lg" /></button></div><div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300"><p><strong>Cabeçalho:</strong> 1080 × 170 px</p><p><strong>Rodapé:</strong> 1080 × 170 px</p><p className="text-xs text-slate-400">Exporte cada arte em PNG para preservar transparência e qualidade.</p></div></div></div>}
      {isHeaderFooterEditorOpen && <HeaderFooterModelEditor name={headerFooterModelName} headerImage={headerTemplateImage} footerImage={footerTemplateImage} uploading={uploadingTemplateImage} onNameChange={setHeaderFooterModelName} onImageChange={uploadTemplateImage} onRemoveImage={kind => kind === 'header' ? setHeaderTemplateImage('') : setFooterTemplateImage('')} onClose={() => setIsHeaderFooterEditorOpen(false)} />}

    </div>
  );
}
