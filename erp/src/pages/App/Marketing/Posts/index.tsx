import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';
import { uploadFile } from '@/pages/utils/storageService';
import { useLocation, useSearchParams } from 'react-router-dom';
import HeaderFooterModelEditor from './HeaderFooterModelEditor';
import AvatarLibrary from './AvatarLibrary';
import OpportunitySealLibrary from './OpportunitySealLibrary';
import type { OpportunitySeal } from './opportunitySealImage';

interface Product {
  id: string;
  name: string;
  price: number;
  promo_price: number | null;
  product_images: { image_url: string; is_main: boolean }[];
  opportunities: { name: string; badge_color: string; border_color: string } | null;
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
const CONTAINER_CHILD_KEYS = ['title', 'priceDe', 'porApenas', 'pricePor', 'measures'];

// Helper para detectar a caixa delimitadora (bounding box) da imagem
function getBoundingBox(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { x: 0, y: 0, w: img.width, h: img.height };
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
  const [brandFontSize, setBrandFontSize] = useState<number>(42);
  const [brandOffsetX, setBrandOffsetX] = useState<number>(120);
  const [brandOffsetY, setBrandOffsetY] = useState<number>(82);
  const [slogan, setSlogan] = useState("Qualidade que cabe no seu bolso");
  const [sloganFontSize, setSloganFontSize] = useState<number>(20);
  const [sloganOffsetX, setSloganOffsetX] = useState<number>(120);
  const [sloganOffsetY, setSloganOffsetY] = useState<number>(130);

  const [installmentsText, setInstallmentsText] = useState("Em até 10x sem juros no cartão");
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
  const [priceContainerOffsetX, setPriceContainerOffsetX] = useState(0);
  const [priceContainerOffsetY, setPriceContainerOffsetY] = useState(0);
  const [priceContainerWidth, setPriceContainerWidth] = useState(460);
  const [priceContainerHeight, setPriceContainerHeight] = useState(450);
  const [detachedContainerElements, setDetachedContainerElements] = useState<Record<string, boolean>>({});
  const [productTitleFontSize, setProductTitleFontSize] = useState<number>(30);
  const [productTitleOffsetX, setProductTitleOffsetX] = useState<number>(600);
  const [productTitleOffsetY, setProductTitleOffsetY] = useState<number>(720);
  const [productTitleMaxContainerWidth, setProductTitleMaxContainerWidth] = useState<number>(390);
  const [productTitleRotation, setProductTitleRotation] = useState<number>(0);
  const [productTitleScale, setProductTitleScale] = useState<number>(100);

  const [priceFontSize, setPriceFontSize] = useState<number>(48);
  const [priceDeFontSize, setPriceDeFontSize] = useState<number>(20);
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
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  const [secondaryImageIndex, setSecondaryImageIndex] = useState<number>(1);
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
  const [layerOrder, setLayerOrder] = useState<string[]>(['mainImage', 'secondaryImage', 'opportunityBadge', 'priceContainer', 'title', 'priceDe', 'porApenas', 'pricePor', 'installments', 'measures']);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [modelProductQuery, setModelProductQuery] = useState('');
  const [isModelProductPickerOpen, setIsModelProductPickerOpen] = useState(false);
  const [defaultModelProductId, setDefaultModelProductId] = useState('');
  const postLayerLabels: Record<string, string> = { mainImage: 'Imagem principal', secondaryImage: 'Imagem secundária', opportunityBadge: 'Selo oportunidade', priceContainer: 'Container de preços', title: 'Título do produto', priceDe: 'Preço de', porApenas: 'Texto por', pricePor: 'Preço por', installments: 'Parcelamento', measures: 'Descrição' };
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
  type SelectedElement = 'mainImage' | 'secondaryImage' | 'opportunityBadge' | 'priceContainer' | 'brand' | 'slogan' | 'installments' | 'avatar' | 'footerTitle' | 'footerAddress' | 'title' | 'priceDe' | 'pricePor' | 'porApenas' | 'measures' | null;
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const productPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const renderedRegionsRef = useRef<Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }>>({});
  const postDragRef = useRef<{ key: SelectedElement; x: number; y: number; mode: 'move' | 'resize' | 'rotate' | 'resize-container'; side?: 'top' | 'right' | 'bottom' | 'left'; centerX?: number; centerY?: number } | null>(null);

  // Histórico de alterações (Undo / Redo)
  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isApplyingHistoryRef = useRef<boolean>(false);
  const previousSelectedElementRef = useRef<SelectedElement>(null);
  const isTemplateStateInitializedRef = useRef(false);
  const templateSaveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const getCurrentState = useCallback(() => ({
    headerFooterModelVersion: 2,
    headerFooterModelName, headerTemplateImage, footerTemplateImage, defaultModelProductId,
    brandName, brandFontSize, brandOffsetX, brandOffsetY, textFontFamilies,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY,
    footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX, footerAddressTitleOffsetY,
    footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    installmentsText, installmentsFontSize, installmentsOffsetX, installmentsOffsetY,
    showSecondaryImage, showOpportunityBadge, selectedOpportunitySeal,
    oppRotation, oppScale, oppOffsetX, oppOffsetY,
    customPrice, customPromoPrice,
    mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY,
    secondaryImageOffsetX, secondaryImageOffsetY,
    mainImageIndex, secondaryImageIndex,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleMaxContainerWidth, priceContainerBackgroundColor, priceContainerOffsetX, priceContainerOffsetY, priceContainerWidth, priceContainerHeight, detachedContainerElements,
    productTitleRotation, productTitleScale,
    priceFontSize, priceDeFontSize, priceOffsetX, priceOffsetY,
    priceRotation, priceScale,
    priceDeOffsetX, priceDeOffsetY, priceDeRotation, priceDeScale,
    porApenasText, porApenasFontSize, porApenasColor, porApenasOffsetX, porApenasOffsetY,
    porApenasRotation, porApenasScale,
    measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY
  }), [
    headerFooterModelName, headerTemplateImage, footerTemplateImage, defaultModelProductId,
    brandName, brandFontSize, brandOffsetX, brandOffsetY, textFontFamilies,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY,
    footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX, footerAddressTitleOffsetY,
    footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    installmentsText, installmentsFontSize, installmentsOffsetX, installmentsOffsetY,
    showSecondaryImage, showOpportunityBadge, selectedOpportunitySeal,
    oppRotation, oppScale, oppOffsetX, oppOffsetY,
    customPrice, customPromoPrice,
    mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY,
    secondaryImageOffsetX, secondaryImageOffsetY,
    mainImageIndex, secondaryImageIndex,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleMaxContainerWidth, priceContainerBackgroundColor, priceContainerOffsetX, priceContainerOffsetY, priceContainerWidth, priceContainerHeight, detachedContainerElements,
    productTitleRotation, productTitleScale,
    priceFontSize, priceDeFontSize, priceOffsetX, priceOffsetY,
    priceRotation, priceScale,
    priceDeOffsetX, priceDeOffsetY, priceDeRotation, priceDeScale,
    porApenasText, porApenasFontSize, porApenasColor, porApenasOffsetX, porApenasOffsetY,
    porApenasRotation, porApenasScale,
    measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY
  ]);
  const templateStateSignature = useMemo(() => JSON.stringify(getCurrentState()), [getCurrentState]);

  const applyState = (s: any) => {
    if (s.headerFooterModelName !== undefined) setHeaderFooterModelName(s.headerFooterModelName);
    if (s.headerTemplateImage !== undefined) setHeaderTemplateImage(s.headerTemplateImage);
    if (s.footerTemplateImage !== undefined) setFooterTemplateImage(s.footerTemplateImage);
    if (s.defaultModelProductId !== undefined) setDefaultModelProductId(s.defaultModelProductId);
    if (!s) return;
    isApplyingHistoryRef.current = true;
    
    if (s.brandName !== undefined) setBrandName(s.brandName);
    if (s.textFontFamilies !== undefined) setTextFontFamilies(s.textFontFamilies);
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
    if (s.installmentsText !== undefined) setInstallmentsText(s.installmentsText);
    if (s.installmentsFontSize !== undefined) setInstallmentsFontSize(s.installmentsFontSize);
    if (s.installmentsOffsetX !== undefined) setInstallmentsOffsetX(s.installmentsOffsetX);
    if (s.installmentsOffsetY !== undefined) setInstallmentsOffsetY(s.installmentsOffsetY <= 1100 ? 1140 : s.installmentsOffsetY);
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
    if (s.mainImageIndex !== undefined) setMainImageIndex(s.mainImageIndex);
    if (s.secondaryImageIndex !== undefined) setSecondaryImageIndex(s.secondaryImageIndex);
    
    if (s.productTitle !== undefined) setProductTitle(s.productTitle);
    if (s.priceContainerBackgroundColor !== undefined) setPriceContainerBackgroundColor(s.priceContainerBackgroundColor);
    if (s.priceContainerOffsetX !== undefined) setPriceContainerOffsetX(s.priceContainerOffsetX);
    if (s.priceContainerOffsetY !== undefined) setPriceContainerOffsetY(s.priceContainerOffsetY);
    if (s.priceContainerWidth !== undefined) setPriceContainerWidth(s.priceContainerWidth);
    if (s.priceContainerHeight !== undefined) setPriceContainerHeight(s.priceContainerHeight);
    if (s.detachedContainerElements !== undefined) setDetachedContainerElements(s.detachedContainerElements);
    if (s.productTitleFontSize !== undefined) setProductTitleFontSize(s.productTitleFontSize);
    if (s.productTitleOffsetX !== undefined) setProductTitleOffsetX(s.productTitleOffsetX);
    if (s.productTitleOffsetY !== undefined) setProductTitleOffsetY(s.productTitleOffsetY);
    if (s.productTitleMaxContainerWidth !== undefined) setProductTitleMaxContainerWidth(s.productTitleMaxContainerWidth);
    if (s.productTitleRotation !== undefined) setProductTitleRotation(s.productTitleRotation);
    if (s.productTitleScale !== undefined) setProductTitleScale(s.productTitleScale);
    if (s.priceFontSize !== undefined) setPriceFontSize(s.priceFontSize);
    if (s.priceDeFontSize !== undefined) setPriceDeFontSize(s.priceDeFontSize);
    if (s.priceOffsetX !== undefined) setPriceOffsetX(s.priceOffsetX);
    if (s.priceOffsetY !== undefined) setPriceOffsetY(s.priceOffsetY);
    if (s.priceRotation !== undefined) setPriceRotation(s.priceRotation);
    if (s.priceScale !== undefined) setPriceScale(s.priceScale);
    if (s.priceDeOffsetX !== undefined) setPriceDeOffsetX(s.priceDeOffsetX);
    if (s.priceDeOffsetY !== undefined) setPriceDeOffsetY(s.priceDeOffsetY);
    if (s.priceDeRotation !== undefined) setPriceDeRotation(s.priceDeRotation);
    if (s.priceDeScale !== undefined) setPriceDeScale(s.priceDeScale);
    if (s.porApenasText !== undefined) setPorApenasText(s.porApenasText);
    if (s.porApenasFontSize !== undefined) setPorApenasFontSize(s.porApenasFontSize);
    if (s.porApenasColor !== undefined) setPorApenasColor(s.porApenasColor);
    if (s.porApenasOffsetX !== undefined) setPorApenasOffsetX(s.porApenasOffsetX);
    if (s.porApenasOffsetY !== undefined) setPorApenasOffsetY(s.porApenasOffsetY);
    if (s.porApenasRotation !== undefined) setPorApenasRotation(s.porApenasRotation);
    if (s.porApenasScale !== undefined) setPorApenasScale(s.porApenasScale);
    if (s.measuresText !== undefined) setMeasuresText(s.measuresText);
    if (s.measuresFontSize !== undefined) setMeasuresFontSize(s.measuresFontSize);
    if (s.measuresOffsetX !== undefined) setMeasuresOffsetX(s.measuresOffsetX);
    if (s.measuresOffsetY !== undefined) setMeasuresOffsetY(s.measuresOffsetY);
    
    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 50);
  };

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
        .update({ marketing_defaults: defaults })
        .eq('id', true)
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

  const saveInstallmentsText = (value: string) => {
    setInstallmentsText(value);
    void saveTemplateDefaults(false, { installmentsText: value });
  };

  // Atalhos globais de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
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

        const loadedProducts = (prodData as any) || [];
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
      if (def.installmentsText) setInstallmentsText(def.installmentsText);
    }
  }, [activeProduct, marketingDefaults]);

  // Pré-carregamento e cache de imagem
  const loadImg = (url: string): Promise<HTMLImageElement | null> => {
    if (!url) return Promise.resolve(null);
    if (imageCacheRef.current[url]) {
      return Promise.resolve(imageCacheRef.current[url]);
    }
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        imageCacheRef.current[url] = img;
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
    });
  };

  // Motor de Desenho Síncrono no Canvas 2D
  const drawBannerSync = (
    canvas: HTMLCanvasElement,
    images: { headerBg: HTMLImageElement | null; footerBg: HTMLImageElement | null; logo: HTMLImageElement | null; mainImg: HTMLImageElement | null; secImg: HTMLImageElement | null },
    isExport = false
  ) => {
    if (!activeProduct && !isEditingTemplate) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const S = canvas.width / 1080;
    const reg: Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }> = {};

    // 1. Área principal clara, conforme o template institucional padrão.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1080 * S, 1350 * S);

    // 2. Imagens do Produto (Principal e Secundária)
    if (images.mainImg) {
      const bb = getBoundingBox(images.mainImg);
      const scale = (mainImageScale / 100) * S;
      const targetW = bb.w * scale;
      const targetH = bb.h * scale;
      const posX = (280 + mainImageOffsetX) * S - targetW / 2;
      const posY = (660 + mainImageOffsetY) * S - targetH / 2;

      ctx.drawImage(
        images.mainImg,
        bb.x, bb.y, bb.w, bb.h,
        posX, posY, targetW, targetH
      );

      reg['mainImage'] = {
        key: 'mainImage',
        label: 'Foto Principal',
        x: posX / S,
        y: posY / S,
        w: targetW / S,
        h: targetH / S
      };
    }

    if (showSecondaryImage && images.secImg) {
      const bb = getBoundingBox(images.secImg);
      const scale = (secondaryImageScale / 100) * 0.65 * S;
      const targetW = bb.w * scale;
      const targetH = bb.h * scale;
      const posX = (780 + secondaryImageOffsetX) * S - targetW / 2;
      const posY = (430 + secondaryImageOffsetY) * S - targetH / 2;

      ctx.drawImage(
        images.secImg,
        bb.x, bb.y, bb.w, bb.h,
        posX, posY, targetW, targetH
      );

      reg['secondaryImage'] = {
        key: 'secondaryImage',
        label: 'Foto Secundária',
        x: posX / S,
        y: posY / S,
        w: targetW / S,
        h: targetH / S
      };
    }

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
    if (brandNameStr.toUpperCase().startsWith("MÓVEIS MORANTE")) {
      const p1 = "MÓVEIS ";
      const p2 = brandNameStr.substring(7);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p1, brandX * S, brandY * S);
      const p1W = ctx.measureText(p1).width;
      ctx.fillStyle = "#e0a96d";
      ctx.fillText(p2, brandX * S + p1W, brandY * S);
    } else {
      ctx.fillStyle = "#ffffff";
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

    ctx.fillStyle = "rgba(243, 244, 246, 0.85)";
    ctx.font = `${sloganSize * S}px ${textFontFamilies.slogan || DEFAULT_FONT_FAMILY}`;
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
      ctx.fillStyle = "#e0a96d";
      ctx.font = `bold ${(footerAddressTextFontSize || 28) * S}px ${textFontFamilies.footerAddress || DEFAULT_FONT_FAMILY}`;
      const ftAddr = footerAddressText || "RUA CASCAVEL, 306, GUARAITUBA, COLOMBO";
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
    const contentLimit = Math.max(120, priceContainerWidth - 40);
    const pTitleSize = productTitleFontSize || 30;
    const pTitleLimit = Math.min(productTitleMaxContainerWidth || contentLimit, contentLimit);
    ctx.font = `bold ${pTitleSize * S}px ${textFontFamilies.title || DEFAULT_FONT_FAMILY}`;
    const titleWords = (productTitle || renderProduct.name).split(/\s+/);
    const titleLines: string[] = [];
    let titleLine = '';
    for (const word of titleWords) {
      const nextLine = titleLine ? `${titleLine} ${word}` : word;
      if (titleLine && ctx.measureText(nextLine).width / S > pTitleLimit) { titleLines.push(titleLine); titleLine = word; } else titleLine = nextLine;
    }
    if (titleLine) titleLines.push(titleLine);
    const requiredContentHeight = 32 + titleLines.length * (pTitleSize + 6) + 16 + (effectivePromo && effectivePromo < effectivePrice ? (priceDeFontSize || 20) + 16 : 0) + (porApenasFontSize || 16) + 14 + prSize + 52 + (measuresText ? (measuresFontSize || 20) + 20 : 0) + 24;
    const expandedContainerHeight = Math.max(priceContainerHeight, requiredContentHeight);
    const expandedTop = 650 - (expandedContainerHeight - priceContainerHeight);

    ctx.save();
    ctx.translate(priceContainerX * S, priceContainerY * S);
    ctx.beginPath();
    ctx.roundRect(560 * S, expandedTop * S, priceContainerWidth * S, expandedContainerHeight * S, 26 * S);
    ctx.fillStyle = priceContainerBackgroundColor;
    ctx.fill();
    reg['priceContainer'] = { key: 'priceContainer', label: 'Container de preços', x: 560 + priceContainerX, y: expandedTop + priceContainerY, w: priceContainerWidth, h: expandedContainerHeight };

    const contentLeft = 580;
    let contentCursorY = expandedTop + 32;
    const pTitleX = contentLeft + ((productTitleOffsetX ?? 600) - 600);
    ctx.font = `bold ${pTitleSize * S}px ${textFontFamilies.title || DEFAULT_FONT_FAMILY}`;
    const pTitleY = contentCursorY + pTitleSize + ((productTitleOffsetY ?? 720) - 720);
    ctx.fillStyle = "#111827";
    ctx.save();
    if (detachedContainerElements.title) ctx.translate(-priceContainerX * S, -priceContainerY * S);
    ctx.translate(pTitleX * S, pTitleY * S);
    ctx.rotate((productTitleRotation * Math.PI) / 180);
    titleLines.forEach((line, index) => ctx.fillText(line, 0, index * (pTitleSize + 6) * S));
    ctx.restore();
    const titleHeight = titleLines.length * (pTitleSize + 6);
    reg['title'] = { key: 'title', label: 'Título Produto', x: pTitleX - 6, y: pTitleY - pTitleSize - 4, w: pTitleLimit + 12, h: titleHeight + 8 };
    contentCursorY = pTitleY + titleHeight + 16;

    if (effectivePromo && effectivePromo < effectivePrice) {
      const deStr = `DE: R$ ${effectivePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const deSize = priceDeFontSize || 20;
      const deX = contentLeft + ((priceDeOffsetX ?? 600) - 600);
      const deY = contentCursorY + deSize + ((priceDeOffsetY ?? 780) - 780);
      ctx.fillStyle = "#dc2626";
      ctx.font = `bold ${deSize * S}px ${textFontFamilies.priceDe || DEFAULT_FONT_FAMILY}`;
      ctx.save();
      if (detachedContainerElements.priceDe) ctx.translate(-priceContainerX * S, -priceContainerY * S);
      ctx.translate(deX * S, deY * S);
      ctx.rotate((priceDeRotation * Math.PI) / 180);
      ctx.fillText(deStr, 0, 0);
      const deW = ctx.measureText(deStr).width;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      ctx.moveTo(0, -deSize * 0.3 * S);
      ctx.lineTo(deW, -deSize * 0.3 * S);
      ctx.stroke();
      ctx.restore();
      reg['priceDe'] = { key: 'priceDe', label: 'Preço DE', x: deX - 6, y: deY - deSize - 4, w: deW / S + 12, h: deSize + 12 };
      contentCursorY = deY + 16;
    }

    const porApStr = porApenasText || "POR APENAS";
    const porApSize = porApenasFontSize || 16;
    const porApX = contentLeft + ((porApenasOffsetX ?? 600) - 600);
    const porApY = contentCursorY + porApSize + ((porApenasOffsetY ?? 825) - 825);
    ctx.fillStyle = porApenasColor || "#e0a96d";
    ctx.font = `bold ${porApSize * S}px ${textFontFamilies.porApenas || DEFAULT_FONT_FAMILY}`;
    ctx.save();
    if (detachedContainerElements.porApenas) ctx.translate(-priceContainerX * S, -priceContainerY * S);
    ctx.translate(porApX * S, porApY * S);
    ctx.rotate((porApenasRotation * Math.PI) / 180);
    ctx.fillText(porApStr, 0, 0);
    ctx.restore();
    reg['porApenas'] = { key: 'porApenas', label: 'Texto Por Apenas', x: porApX - 6, y: porApY - porApSize - 4, w: ctx.measureText(porApStr).width / S + 12, h: porApSize + 12 };
    contentCursorY = porApY + 14;

    ctx.font = `bold ${prSize * S}px ${textFontFamilies.pricePor || DEFAULT_FONT_FAMILY}`;
    const priceBgW = Math.min(ctx.measureText(priceStr).width + 36 * S, contentLimit * S);
    const priceBgH = (prSize + 34) * S;
    ctx.save();
    if (detachedContainerElements.pricePor) ctx.translate(-priceContainerX * S, -priceContainerY * S);
    const flowPriceX = contentLeft + ((priceOffsetX ?? 600) - 600);
    const flowPriceY = contentCursorY + prSize + 18 + ((priceOffsetY ?? 920) - 920);
    ctx.translate(flowPriceX * S, flowPriceY * S);
    ctx.rotate((priceRotation * Math.PI) / 180);
    ctx.beginPath();
    ctx.roundRect(-18 * S, (-prSize - 18) * S, priceBgW, priceBgH, 20 * S);
    ctx.fillStyle = "#ffe600";
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.fillText(priceStr, 0, 0);
    ctx.restore();
    reg['pricePor'] = { key: 'pricePor', label: 'Preço POR', x: flowPriceX - 6, y: flowPriceY - prSize - 4, w: Math.min(ctx.measureText(priceStr).width / S + 12, contentLimit + 12), h: prSize + 12 };
    contentCursorY = flowPriceY + 34;

    // Medidas
    if (measuresText) {
      const mSize = measuresFontSize || 20;
      const mX = contentLeft + ((measuresOffsetX ?? 785) - 785);
      const mY = contentCursorY + mSize + ((measuresOffsetY ?? 1035) - 1035);
      ctx.fillStyle = "#94a3b8";
      ctx.font = `bold ${mSize * S}px ${textFontFamilies.measures || DEFAULT_FONT_FAMILY}`;
      ctx.save();
      if (detachedContainerElements.measures) ctx.translate(-priceContainerX * S, -priceContainerY * S);
      ctx.fillText(measuresText, mX * S, mY * S);
      ctx.restore();
      reg['measures'] = { key: 'measures', label: 'Medidas', x: mX - 6, y: mY - mSize - 4, w: ctx.measureText(measuresText).width / S + 12, h: mSize + 12 };
    }
    ctx.restore();
    for (const key of CONTAINER_CHILD_KEYS) {
      if (reg[key] && !detachedContainerElements[key]) {
        reg[key].x += priceContainerX;
        reg[key].y += priceContainerY;
      }
    }

    // Parcelamento é um elemento independente do Container de preços.
    const instText = installmentsText || "Em até 10x sem juros no cartão";
    const instSize = installmentsFontSize || 26;
    const instX = installmentsOffsetX ?? 540;
    const instY = installmentsOffsetY ?? 1140;
    ctx.fillStyle = "#111827";
    ctx.font = `${instSize * S}px ${textFontFamilies.installments || DEFAULT_FONT_FAMILY}`;
    ctx.fillText(instText, instX * S, instY * S);
    reg['installments'] = { key: 'installments', label: 'Parcelas', x: instX - 6, y: instY - instSize - 4, w: ctx.measureText(instText).width / S + 12, h: instSize + 12 };

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
          ctx.moveTo((region.x - 20) * S, (region.y + region.h / 2 - 35) * S); ctx.lineTo((region.x - 20) * S, (region.y + region.h / 2 + 35) * S);
          ctx.moveTo((region.x + region.w + 20) * S, (region.y + region.h / 2 - 35) * S); ctx.lineTo((region.x + region.w + 20) * S, (region.y + region.h / 2 + 35) * S);
          ctx.moveTo((region.x + region.w / 2 - 50) * S, (region.y - 20) * S); ctx.lineTo((region.x + region.w / 2 + 50) * S, (region.y - 20) * S);
          ctx.moveTo((region.x + region.w / 2 - 50) * S, (region.y + region.h + 20) * S); ctx.lineTo((region.x + region.w / 2 + 50) * S, (region.y + region.h + 20) * S);
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 3 * S;
          ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
        } else {
          ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
        }
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
        ctx.restore();
      }
    }

    renderedRegionsRef.current = reg;
  };

  const drawBannerAsync = async (canvas: HTMLCanvasElement, isExport = false) => {
    const images = renderProduct.product_images || [];
    const mainImageUrl = images.find(image => image.is_main)?.image_url || images[mainImageIndex]?.image_url || images[0]?.image_url || "";
    const secImageUrl = images[secondaryImageIndex]?.image_url || images.find(image => !image.is_main)?.image_url || images[1]?.image_url || "";

    const [headerBg, footerBg, logo, mainImg, secImg] = await Promise.all([
      loadImg(headerTemplateImage || "/images/banner-header-bg.png"),
      footerTemplateImage ? loadImg(footerTemplateImage) : Promise.resolve(null),
      avatarUrl ? loadImg(avatarUrl) : loadImg("/images/avatar-morante.png"),
      mainImageUrl ? loadImg(mainImageUrl) : Promise.resolve(null),
      (secImageUrl && showSecondaryImage) ? loadImg(secImageUrl) : Promise.resolve(null),
    ]);

    drawBannerSync(canvas, { headerBg, footerBg, logo, mainImg, secImg }, isExport);
  };

  // Re-renderiza o canvas sempre que os estados mudam
  useEffect(() => {
    if (!loading && isModalOpen && previewCanvasRef.current && (activeProduct || isEditingTemplate)) {
      drawBannerAsync(previewCanvasRef.current, false);
    }
    if (productPreviewCanvasRef.current && activeProduct) {
      drawBannerAsync(productPreviewCanvasRef.current, true);
    }
  }, [
    loading, isModalOpen, activeProduct, isEditingTemplate, headerTemplateImage, footerTemplateImage, brandName, brandFontSize, brandOffsetX, brandOffsetY, slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY, footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX,
    footerAddressTitleOffsetY, footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    installmentsText, installmentsFontSize, installmentsOffsetX, installmentsOffsetY, showSecondaryImage, showOpportunityBadge,
    oppRotation, oppScale, oppOffsetX, oppOffsetY, customPrice, customPromoPrice, mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY, secondaryImageOffsetX, secondaryImageOffsetY, mainImageIndex, secondaryImageIndex,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleRotation, priceContainerBackgroundColor, priceContainerOffsetX, priceContainerOffsetY, priceContainerWidth, priceContainerHeight, priceFontSize, priceDeFontSize,
    priceOffsetX, priceOffsetY, priceRotation, priceDeOffsetX, priceDeOffsetY, priceDeRotation, porApenasText, porApenasFontSize, porApenasColor,
    porApenasOffsetX, porApenasOffsetY, porApenasRotation, measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY, textFontFamilies, selectedOpportunitySeal, detachedContainerElements, selectedElement
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
    if (isEditingTemplate && isModalOpen && previousElement !== null && previousElement !== selectedElement) {
      void saveTemplateDefaults();
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
    const saveTimer = window.setTimeout(() => void saveTemplateDefaults(), 450);
    return () => window.clearTimeout(saveTimer);
  }, [templateStateSignature, isEditingTemplate, isModalOpen]);

  useEffect(() => {
    if (isEditingTemplate && defaultModelProductId && products.some(product => product.id === defaultModelProductId)) {
      setSelectedProductId(defaultModelProductId);
    }
  }, [isEditingTemplate, defaultModelProductId, products]);

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
    else if (key === 'priceContainer') move(setPriceContainerOffsetX, setPriceContainerOffsetY);
    else if (key === 'priceDe') move(setPriceDeOffsetX, setPriceDeOffsetY);
    else if (key === 'pricePor') move(setPriceOffsetX, setPriceOffsetY);
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

  const resizeSelectedElement = (key: SelectedElement, amount: number) => {
    const resizeFont = (setSize: React.Dispatch<React.SetStateAction<number>>) => setSize(value => Math.max(8, Math.min(180, value + amount)));
    if (key === 'title') resizeFont(setProductTitleFontSize);
    else if (key === 'priceDe') resizeFont(setPriceDeFontSize);
    else if (key === 'pricePor') resizeFont(setPriceFontSize);
    else if (key === 'porApenas') resizeFont(setPorApenasFontSize);
    else if (key === 'installments') resizeFont(setInstallmentsFontSize);
    else if (key === 'measures') resizeFont(setMeasuresFontSize);
    else if (key === 'brand') resizeFont(setBrandFontSize);
    else if (key === 'slogan') resizeFont(setSloganFontSize);
    else if (key === 'footerTitle') resizeFont(setFooterAddressTitleFontSize);
    else if (key === 'footerAddress') resizeFont(setFooterAddressTextFontSize);
    else if (key === 'mainImage') setMainImageScale(value => Math.max(40, Math.min(180, value + amount)));
    else if (key === 'secondaryImage') setSecondaryImageScale(value => Math.max(40, Math.min(180, value + amount)));
    else if (key === 'opportunityBadge') setOppScale(value => Math.max(40, Math.min(180, value + amount)));
  };

  const rotateSelectedElement = (key: SelectedElement, angle: number) => {
    if (key === 'title') setProductTitleRotation(angle);
    else if (key === 'priceDe') setPriceDeRotation(angle);
    else if (key === 'pricePor') setPriceRotation(angle);
    else if (key === 'porApenas') setPorApenasRotation(angle);
    else if (key === 'opportunityBadge') setOppRotation(angle);
  };

  const startPostDrag = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1080 / rect.width);
    const y = (e.clientY - rect.top) * (1350 / rect.height);
    const activeRegion = selectedElement ? renderedRegionsRef.current[selectedElement] : null;
    if (activeRegion) {
      if (selectedElement === 'priceContainer') {
        const inRect = (left: number, top: number, width: number, height: number) => x >= left && x <= left + width && y >= top && y <= top + height;
        if (Math.hypot(x - (activeRegion.x + activeRegion.w), y - (activeRegion.y + activeRegion.h)) <= 18) { postDragRef.current = { key: selectedElement, x, y, mode: 'resize' }; return; }
        const side = inRect(activeRegion.x - 25, activeRegion.y + activeRegion.h / 2 - 40, 10, 80) ? 'left' : inRect(activeRegion.x + activeRegion.w + 15, activeRegion.y + activeRegion.h / 2 - 40, 10, 80) ? 'right' : inRect(activeRegion.x + activeRegion.w / 2 - 55, activeRegion.y - 25, 110, 10) ? 'top' : inRect(activeRegion.x + activeRegion.w / 2 - 55, activeRegion.y + activeRegion.h + 15, 110, 10) ? 'bottom' : null;
        if (side) { postDragRef.current = { key: selectedElement, x, y, mode: 'resize-container', side }; return; }
        const rotateX = activeRegion.x + activeRegion.w + 42;
        const rotateY = activeRegion.y + activeRegion.h + 42;
        if (Math.hypot(x - rotateX, y - rotateY) <= 22) { postDragRef.current = { key: selectedElement, x, y, mode: 'rotate' }; return; }
        const childRegion = CONTAINER_CHILD_KEYS
          .map(key => renderedRegionsRef.current[key])
          .filter(Boolean)
          .reverse()
          .find(region => x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h);
        if (childRegion) {
          setSelectedElement(childRegion.key as SelectedElement);
          postDragRef.current = { key: childRegion.key as SelectedElement, x, y, mode: 'move' };
          return;
        }
        if (x >= activeRegion.x && x <= activeRegion.x + activeRegion.w && y >= activeRegion.y && y <= activeRegion.y + activeRegion.h) {
          postDragRef.current = { key: selectedElement, x, y, mode: 'move' };
          return;
        }
      }
      const handleX = activeRegion.x + activeRegion.w;
      const handleY = activeRegion.y + activeRegion.h;
      const rotateX = activeRegion.x + activeRegion.w + 42;
      const rotateY = activeRegion.y + activeRegion.h + 42;
      if (Math.hypot(x - handleX, y - handleY) <= 22) {
        postDragRef.current = { key: selectedElement, x, y, mode: 'resize' };
        return;
      }
      if (Math.hypot(x - rotateX, y - rotateY) <= 22) {
        postDragRef.current = { key: selectedElement, x, y, mode: 'rotate', centerX: activeRegion.x + activeRegion.w / 2, centerY: activeRegion.y + activeRegion.h / 2 };
        return;
      }
    }
    const hit = Object.values(renderedRegionsRef.current).reverse().find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    setSelectedElement((hit?.key || null) as SelectedElement);
    postDragRef.current = hit ? { key: hit.key as SelectedElement, x, y, mode: 'move' } : null;
  };

  const dragPostElement = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = postDragRef.current;
    if (!drag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1080 / rect.width);
    const y = (e.clientY - rect.top) * (1350 / rect.height);
    const dx = Math.round(x - drag.x), dy = Math.round(y - drag.y);
    if (drag.mode === 'resize') {
      const amount = Math.round((dx + dy) / 8);
      if (amount) {
        if (drag.key === 'priceContainer') {
          setPriceContainerWidth(value => Math.max(180, value + amount));
          setPriceContainerHeight(value => Math.max(160, value + amount));
        } else resizeSelectedElement(drag.key, amount);
        postDragRef.current = { ...drag, x, y };
      }
    } else if (drag.mode === 'resize-container' && drag.side) {
      if (drag.side === 'right') setPriceContainerWidth(value => Math.max(180, value + dx));
      else if (drag.side === 'bottom') setPriceContainerHeight(value => Math.max(160, value + dy));
      else if (drag.side === 'left') { setPriceContainerWidth(value => Math.max(180, value - dx)); setPriceContainerOffsetX(value => value + dx); }
      else { setPriceContainerHeight(value => Math.max(160, value - dy)); setPriceContainerOffsetY(value => value + dy); }
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

  const handleOpenTemplate = () => {
    setActivePostId(null);
    if (marketingDefaults) applyState(marketingDefaults);
    setIsEditingTemplate(true);
    setIsModalOpen(true);
  };

  const handleChooseModelProduct = (product: Product) => {
    setSelectedProductId(product.id);
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
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
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

      {/* Modal Principal do Editor Visual de Post */}
      {isModalOpen && (activeProduct || isEditingTemplate) && (
        <div className={`fixed inset-0 z-50 flex p-0 overflow-hidden ${isTemplateRoute ? 'bg-white dark:bg-slate-900' : 'bg-slate-950/80 backdrop-blur-md'}`}>
          <div className="bg-white dark:bg-slate-900 w-full h-full flex flex-col shadow-2xl overflow-hidden" onBlurCapture={() => { if (isEditingTemplate) void saveTemplateDefaults(); }}>
            
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
                  }}
                  className="px-3 py-2 text-xs font-black text-slate-500 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <i className="bi bi-arrow-left mr-1" />Voltar ao ERP
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
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
                        <button key={key} type="button" draggable onDragStart={event => event.dataTransfer.setData('text/plain', key)} onDragOver={event => event.preventDefault()} onDrop={event => { const dragged = event.dataTransfer.getData('text/plain'); if (dragged && dragged !== key) setLayerOrder(items => { const next = items.filter(item => item !== dragged); next.splice(next.indexOf(key), 0, dragged); return next; }); }} onClick={() => { setSelectedElement(key as SelectedElement); setIsLayersPanelOpen(false); }} className={`mb-1 flex w-full cursor-grab items-center gap-2 rounded-lg px-2 py-2 text-left text-[10px] font-bold active:cursor-grabbing ${selectedElement === key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                          <i className="bi bi-grip-vertical text-slate-400" />{postLayerLabels[key]}
                        </button>
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

            <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
              {!selectedElement && <span className="text-xs font-medium text-slate-400">Selecione um elemento no preview.</span>}
              {selectedElement && <>
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-600">{selectedElement === 'mainImage' ? 'Foto principal' : selectedElement === 'secondaryImage' ? 'Foto secundária' : selectedElement === 'opportunityBadge' ? 'Selo de oportunidade' : selectedElement === 'priceContainer' ? 'Container de preços' : selectedElement === 'title' ? 'Título do produto' : selectedElement === 'priceDe' ? 'Preço de' : selectedElement === 'pricePor' ? 'Preço por' : selectedElement === 'porApenas' ? 'Texto por' : selectedElement === 'installments' ? 'Parcelamento' : selectedElement === 'measures' ? 'Descrição' : selectedElement === 'brand' ? 'Marca' : selectedElement === 'slogan' ? 'Slogan' : selectedElement === 'footerAddress' ? 'Endereço' : 'Título do rodapé'}</span>
                {selectedElement === 'priceContainer' && <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">Cor do fundo <input type="color" value={priceContainerBackgroundColor} onChange={event => setPriceContainerBackgroundColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" /><output className="w-20 font-mono text-[10px] uppercase text-slate-400">{priceContainerBackgroundColor}</output></label>}
                {selectedElement === 'title' && <input value={productTitle} onChange={event => setProductTitle(event.target.value)} placeholder="Título do produto" className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'priceDe' && <input type="number" step="0.01" value={customPrice} onChange={event => setCustomPrice(event.target.value)} placeholder="Preço antigo" className="w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'pricePor' && <input type="number" step="0.01" value={customPromoPrice} onChange={event => setCustomPromoPrice(event.target.value)} placeholder="Preço final" className="w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'porApenas' && <input value={porApenasText} onChange={event => setPorApenasText(event.target.value)} className="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'installments' && <input value={installmentsText} onChange={event => setInstallmentsText(event.target.value)} onBlur={event => saveInstallmentsText(event.currentTarget.value)} className="w-72 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'measures' && <input value={measuresText} onChange={event => setMeasuresText(event.target.value)} placeholder="Descrição e medidas" className="w-72 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'brand' && <input value={brandName} onChange={event => setBrandName(event.target.value)} className="w-56 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'slogan' && <input value={slogan} onChange={event => setSlogan(event.target.value)} className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'footerAddress' && <input value={footerAddressText} onChange={event => setFooterAddressText(event.target.value)} className="w-80 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {selectedElement === 'footerTitle' && <input value={footerAddressTitle} onChange={event => setFooterAddressTitle(event.target.value)} className="w-72 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />}
                {(['title', 'priceDe', 'pricePor', 'porApenas', 'installments', 'measures', 'brand', 'slogan', 'footerTitle', 'footerAddress'] as SelectedElement[]).includes(selectedElement) && (
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">Tamanho
                    <input type="number" min="1" value={selectedElement === 'title' ? productTitleFontSize : selectedElement === 'priceDe' ? priceDeFontSize : selectedElement === 'pricePor' ? priceFontSize : selectedElement === 'porApenas' ? porApenasFontSize : selectedElement === 'installments' ? installmentsFontSize : selectedElement === 'measures' ? measuresFontSize : selectedElement === 'brand' ? brandFontSize : selectedElement === 'slogan' ? sloganFontSize : selectedElement === 'footerTitle' ? footerAddressTitleFontSize : footerAddressTextFontSize} onChange={event => { const value = Math.max(1, Number(event.target.value) || 1); if (selectedElement === 'title') setProductTitleFontSize(value); else if (selectedElement === 'priceDe') setPriceDeFontSize(value); else if (selectedElement === 'pricePor') setPriceFontSize(value); else if (selectedElement === 'porApenas') setPorApenasFontSize(value); else if (selectedElement === 'installments') setInstallmentsFontSize(value); else if (selectedElement === 'measures') setMeasuresFontSize(value); else if (selectedElement === 'brand') setBrandFontSize(value); else if (selectedElement === 'slogan') setSloganFontSize(value); else if (selectedElement === 'footerTitle') setFooterAddressTitleFontSize(value); else setFooterAddressTextFontSize(value); }} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" /> px
                  </label>
                )}
                {(['title', 'priceDe', 'pricePor', 'porApenas', 'installments', 'measures', 'brand', 'slogan', 'footerTitle', 'footerAddress'] as SelectedElement[]).includes(selectedElement) && (
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">Fonte
                    <select value={textFontFamilies[selectedElement as string] || DEFAULT_FONT_FAMILY} onChange={event => setTextFontFamilies(current => ({ ...current, [selectedElement as string]: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" style={{ fontFamily: textFontFamilies[selectedElement as string] || DEFAULT_FONT_FAMILY }}>
                      {FONT_OPTIONS.map(font => <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.label}</option>)}
                    </select>
                  </label>
                )}
                {(['mainImage', 'secondaryImage', 'opportunityBadge'] as SelectedElement[]).includes(selectedElement) && <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">Escala <input type="number" min="40" max="180" value={selectedElement === 'mainImage' ? mainImageScale : selectedElement === 'secondaryImage' ? secondaryImageScale : oppScale} onChange={event => { const value = Math.min(180, Math.max(40, Number(event.target.value) || 40)); if (selectedElement === 'mainImage') setMainImageScale(value); else if (selectedElement === 'secondaryImage') setSecondaryImageScale(value); else setOppScale(value); }} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" /> %</label>}
              </>}
            </div>

            {/* Modal Body: 2 Colunas (Canvas Preview + Controles) */}
            <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <aside className="lg:col-span-2 min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 custom-scrollbar dark:border-slate-800 dark:bg-slate-950">
                  <div className="space-y-2">
                    <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Biblioteca de elementos</p>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
                      <div className="flex items-center">
                        <button type="button" onClick={() => setIsHeaderFooterLibraryOpen(value => !value)} className="flex flex-1 items-center gap-2 p-3 text-left text-[10px] font-black text-amber-800 dark:text-amber-300"><i className="bi bi-collection-fill" /> Cabeçalhos e rodapés <i className={`bi bi-chevron-${isHeaderFooterLibraryOpen ? 'up' : 'down'} ml-auto`} /></button>
                        <button type="button" onClick={() => setIsHeaderFooterInfoOpen(true)} className="mr-1 flex h-6 w-6 items-center justify-center rounded-md text-amber-900 hover:bg-amber-200" title="Informações de tamanho"><i className="bi bi-info-circle" /></button>
                        <button type="button" onClick={() => setIsHeaderFooterEditorOpen(true)} className="mr-2 flex h-6 w-6 items-center justify-center rounded-md bg-amber-200 text-amber-900 hover:bg-amber-300" title="Adicionar cabeçalhos e rodapés"><i className="bi bi-plus-lg" /></button>
                      </div>
                      {isHeaderFooterLibraryOpen && <button type="button" onClick={() => setIsHeaderFooterEditorOpen(true)} className="mx-2 mb-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg bg-white/80 px-2 py-2 text-left text-[10px] font-bold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200"><i className="bi bi-layout-text-window" /> {headerFooterModelName || 'Padrão'}</button>}
                    </div>
                    <OpportunitySealLibrary open={isOpportunityLibraryOpen} onToggle={() => setIsOpportunityLibraryOpen(value => !value)} onSelect={opportunity => { setSelectedOpportunitySeal(opportunity); setShowOpportunityBadge(true); setSelectedElement('opportunityBadge'); }} />
                    <AvatarLibrary avatars={avatarLibrary} open={isAvatarLibraryOpen} onToggle={() => setIsAvatarLibraryOpen(value => !value)} onSelect={avatar => setAvatarUrl(avatar.url)} onDelete={avatar => { setAvatarLibrary(items => items.filter(item => item.id !== avatar.id)); if (avatarUrl === avatar.url) setAvatarUrl(''); }} />
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
                    onMouseDown={startPostDrag}
                    onMouseMove={dragPostElement}
                    onMouseUp={() => { postDragRef.current = null; }}
                    onMouseLeave={() => { postDragRef.current = null; }}
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

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Parcelamento</label>
                      <input
                        type="text"
                        value={installmentsText}
                        onChange={(e) => setInstallmentsText(e.target.value)}
                        onBlur={(e) => saveInstallmentsText(e.currentTarget.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                    </div>

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
