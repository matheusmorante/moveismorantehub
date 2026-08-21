import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { uploadFile } from '@/pages/utils/storageService';

interface ProductData {
  id?: string;
  name?: string;
  description?: string;
  price?: number | string;
  unitPrice?: number | string;
  promoPrice?: number | string;
  promo_price?: number | string;
  sku?: string;
  code?: string;
  width?: number | string;
  height?: number | string;
  depth?: number | string;
  technical_specs?: any;
  product_images?: { image_url: string; is_main: boolean }[];
  opportunities?: { name: string; badge_color: string; border_color: string } | null;
}

interface DigitalMarketingPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductData | null;
  onPostSaved?: (url: string) => void;
}

type SelectedElementKey = 
  | 'mainImage' 
  | 'secondaryImage' 
  | 'opportunityBadge' 
  | 'brand' 
  | 'slogan' 
  | 'installments' 
  | 'avatar' 
  | 'footerTitle' 
  | 'footerAddress' 
  | 'title' 
  | 'priceDe' 
  | 'pricePor' 
  | 'porApenas' 
  | 'measures' 
  | null;

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

function drawFlameIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.translate(x, y);
  const scale = size / 24;
  ctx.scale(scale, scale);
  const p = new Path2D("M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z");
  ctx.fill(p);
  ctx.restore();
}

export const DigitalMarketingPostModal: React.FC<DigitalMarketingPostModalProps> = ({
  isOpen,
  onClose,
  product,
  onPostSaved
}) => {
  const [downloading, setDownloading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElementKey>(null);
  const [isLayersModalOpen, setIsLayersModalOpen] = useState(false);

  // Informações do Produto
  const [productTitle, setProductTitle] = useState("");
  const [productTitleFontSize, setProductTitleFontSize] = useState<number>(30);
  const [productTitleOffsetX, setProductTitleOffsetX] = useState<number>(570);
  const [productTitleOffsetY, setProductTitleOffsetY] = useState<number>(660);
  const [productTitleRotation, setProductTitleRotation] = useState<number>(0);
  const [productTitleScale, setProductTitleScale] = useState<number>(100);

  const [customPrice, setCustomPrice] = useState("");
  const [customPromoPrice, setCustomPromoPrice] = useState("");
  const [priceFontSize, setPriceFontSize] = useState<number>(48);
  const [priceDeFontSize, setPriceDeFontSize] = useState<number>(20);
  const [priceOffsetX, setPriceOffsetX] = useState<number>(570);
  const [priceOffsetY, setPriceOffsetY] = useState<number>(730);
  const [priceRotation, setPriceRotation] = useState<number>(0);
  const [priceScale, setPriceScale] = useState<number>(100);

  const [priceDeOffsetX, setPriceDeOffsetX] = useState<number>(570);
  const [priceDeOffsetY, setPriceDeOffsetY] = useState<number>(610);
  const [priceDeRotation, setPriceDeRotation] = useState<number>(0);
  const [priceDeScale, setPriceDeScale] = useState<number>(100);

  const [porApenasText, setPorApenasText] = useState("POR APENAS");
  const [porApenasFontSize, setPorApenasFontSize] = useState<number>(16);
  const [porApenasColor, setPorApenasColor] = useState("#e0a96d");
  const [porApenasOffsetX, setPorApenasOffsetX] = useState<number>(570);
  const [porApenasOffsetY, setPorApenasOffsetY] = useState<number>(635);
  const [porApenasRotation, setPorApenasRotation] = useState<number>(0);
  const [porApenasScale, setPorApenasScale] = useState<number>(100);

  const [installmentsText, setInstallmentsText] = useState("Em até 10x sem juros no cartão");
  const [installmentsFontSize, setInstallmentsFontSize] = useState<number>(26);
  const [installmentsOffsetX, setInstallmentsOffsetX] = useState<number>(540);
  const [installmentsOffsetY, setInstallmentsOffsetY] = useState<number>(895);

  const [measuresText, setMeasuresText] = useState("");
  const [measuresFontSize, setMeasuresFontSize] = useState<number>(20);
  const [measuresOffsetX, setMeasuresOffsetX] = useState<number>(785);
  const [measuresOffsetY, setMeasuresOffsetY] = useState<number>(610);

  // Identidade da Loja
  const [brandName, setBrandName] = useState("MÓVEIS MORANTE");
  const [brandFontSize, setBrandFontSize] = useState<number>(42);
  const [brandOffsetX, setBrandOffsetX] = useState<number>(120);
  const [brandOffsetY, setBrandOffsetY] = useState<number>(82);

  const [slogan, setSlogan] = useState("Qualidade que cabe no seu bolso");
  const [sloganFontSize, setSloganFontSize] = useState<number>(20);
  const [sloganOffsetX, setSloganOffsetX] = useState<number>(120);
  const [sloganOffsetY, setSloganOffsetY] = useState<number>(130);

  const [avatarUrl] = useState("/images/avatar-morante.png");
  const [avatarScale, setAvatarScale] = useState<number>(100);
  const [avatarOffsetX, setAvatarOffsetX] = useState<number>(35);
  const [avatarOffsetY, setAvatarOffsetY] = useState<number>(938);

  const [footerAddressTitle, setFooterAddressTitle] = useState("VISITE NOSSA LOJA NO ENDEREÇO");
  const [footerAddressTitleFontSize, setFooterAddressTitleFontSize] = useState<number>(24);
  const [footerAddressTitleOffsetX, setFooterAddressTitleOffsetX] = useState<number>(175);
  const [footerAddressTitleOffsetY, setFooterAddressTitleOffsetY] = useState<number>(988);

  const [footerAddressText, setFooterAddressText] = useState("RUA CASCAVEL, 306, GUARAITUBA, COLOMBO");
  const [footerAddressTextFontSize, setFooterAddressTextFontSize] = useState<number>(28);
  const [footerAddressTextOffsetX, setFooterAddressTextOffsetX] = useState<number>(175);
  const [footerAddressTextOffsetY, setFooterAddressTextOffsetY] = useState<number>(1032);

  // Ajustes Visuais
  const [showSecondaryImage, setShowSecondaryImage] = useState(true);
  const [showOpportunityBadge, setShowOpportunityBadge] = useState(true);
  const [oppRotation, setOppRotation] = useState<number>(0);
  const [oppScale, setOppScale] = useState<number>(100);
  const [oppOffsetX, setOppOffsetX] = useState<number>(50);
  const [oppOffsetY, setOppOffsetY] = useState<number>(220);

  const [mainImageScale, setMainImageScale] = useState<number>(100);
  const [secondaryImageScale, setSecondaryImageScale] = useState<number>(100);
  const [mainImageOffsetX, setMainImageOffsetX] = useState<number>(0);
  const [mainImageOffsetY, setMainImageOffsetY] = useState<number>(0);
  const [secondaryImageOffsetX, setSecondaryImageOffsetX] = useState<number>(0);
  const [secondaryImageOffsetY, setSecondaryImageOffsetY] = useState<number>(0);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const renderedRegionsRef = useRef<Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }>>({});
  
  // Drag and Drop
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Lista de Camadas
  const layersList = [
    { key: 'title', label: 'TÍTULO DO PRODUTO', icon: 'bi-fonts' },
    { key: 'pricePor', label: 'PREÇO PRINCIPAL (POR:)', icon: 'bi-tag-fill' },
    { key: 'priceDe', label: 'PREÇO ORIGINAL (DE:)', icon: 'bi-type-strikethrough' },
    { key: 'porApenas', label: 'TEXTO POR APENAS', icon: 'bi-chat-left-text-fill' },
    { key: 'installments', label: 'PARCELAMENTO', icon: 'bi-credit-card-2-front-fill' },
    { key: 'measures', label: 'MEDIDAS TÉCNICAS', icon: 'bi-aspect-ratio-fill' },
    { key: 'opportunityBadge', label: 'SELO DE OFERTA', icon: 'bi-patch-check-fill' },
    { key: 'brand', label: 'MARCA DA LOJA', icon: 'bi-shop' },
    { key: 'slogan', label: 'SLOGAN DA LOJA', icon: 'bi-chat-quote-fill' },
    { key: 'avatar', label: 'LOGO DO RODAPÉ', icon: 'bi-person-badge' },
    { key: 'footerTitle', label: 'TÍTULO DO RODAPÉ', icon: 'bi-card-heading' },
    { key: 'footerAddress', label: 'ENDEREÇO NO RODAPÉ', icon: 'bi-geo-alt-fill' },
    { key: 'mainImage', label: 'FOTO PRINCIPAL', icon: 'bi-image' },
    { key: 'secondaryImage', label: 'FOTO SECUNDÁRIA', icon: 'bi-images' },
  ];

  // Inicializa dados do produto
  useEffect(() => {
    if (!product) return;
    const name = product.name || product.description || "";
    setProductTitle(name);
    
    const pr = product.price !== undefined ? product.price : (product.unitPrice !== undefined ? product.unitPrice : "");
    const ppr = product.promoPrice !== undefined ? product.promoPrice : (product.promo_price !== undefined ? product.promo_price : "");
    setCustomPrice(pr ? String(pr).replace("R$", "").trim() : "");
    setCustomPromoPrice(ppr ? String(ppr).replace("R$", "").trim() : "");

    const w = product.width || product.technical_specs?.width || "";
    const h = product.height || product.technical_specs?.height || "";
    const d = product.depth || product.technical_specs?.depth || "";
    if (w || h || d) {
      setMeasuresText(`L ${w}cm · A ${h}cm · P ${d}cm`);
    } else {
      setMeasuresText("");
    }
  }, [product]);

  // Pré-carregamento de imagens
  const loadImg = useCallback((url: string): Promise<HTMLImageElement | null> => {
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
  }, []);

  const updateElementOffset = useCallback((el: SelectedElementKey, dx: number, dy: number) => {
    if (!el) return;
    switch (el) {
      case 'mainImage':
        setMainImageOffsetX(prev => prev + dx);
        setMainImageOffsetY(prev => prev + dy);
        break;
      case 'secondaryImage':
        setSecondaryImageOffsetX(prev => prev + dx);
        setSecondaryImageOffsetY(prev => prev + dy);
        break;
      case 'opportunityBadge':
        setOppOffsetX(prev => prev + dx);
        setOppOffsetY(prev => prev + dy);
        break;
      case 'brand':
        setBrandOffsetX(prev => prev + dx);
        setBrandOffsetY(prev => prev + dy);
        break;
      case 'slogan':
        setSloganOffsetX(prev => prev + dx);
        setSloganOffsetY(prev => prev + dy);
        break;
      case 'title':
        setProductTitleOffsetX(prev => prev + dx);
        setProductTitleOffsetY(prev => prev + dy);
        break;
      case 'pricePor':
        setPriceOffsetX(prev => prev + dx);
        setPriceOffsetY(prev => prev + dy);
        break;
      case 'priceDe':
        setPriceDeOffsetX(prev => prev + dx);
        setPriceDeOffsetY(prev => prev + dy);
        break;
      case 'porApenas':
        setPorApenasOffsetX(prev => prev + dx);
        setPorApenasOffsetY(prev => prev + dy);
        break;
      case 'installments':
        setInstallmentsOffsetX(prev => prev + dx);
        setInstallmentsOffsetY(prev => prev + dy);
        break;
      case 'measures':
        setMeasuresOffsetX(prev => prev + dx);
        setMeasuresOffsetY(prev => prev + dy);
        break;
      case 'avatar':
        setAvatarOffsetX(prev => prev + dx);
        setAvatarOffsetY(prev => prev + dy);
        break;
      case 'footerTitle':
        setFooterAddressTitleOffsetX(prev => prev + dx);
        setFooterAddressTitleOffsetY(prev => prev + dy);
        break;
      case 'footerAddress':
        setFooterAddressTextOffsetX(prev => prev + dx);
        setFooterAddressTextOffsetY(prev => prev + dy);
        break;
    }
  }, []);

  // Desenho Síncrono no Canvas 2D
  const drawBannerSync = useCallback((
    canvas: HTMLCanvasElement,
    images: { headerBg: HTMLImageElement | null; logo: HTMLImageElement | null; mainImg: HTMLImageElement | null; secImg: HTMLImageElement | null },
    isExport = false
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const S = canvas.width / 1080;
    const reg: Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }> = {};

    // 1. Fundo Geral
    ctx.fillStyle = "#0c1523";
    ctx.fillRect(0, 0, 1080 * S, 1080 * S);

    const bgGrad = ctx.createRadialGradient(540 * S, 540 * S, 100 * S, 540 * S, 540 * S, 750 * S);
    bgGrad.addColorStop(0, "#1a2a40");
    bgGrad.addColorStop(1, "#0c1523");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080 * S, 1080 * S);

    // 2. Imagens do Produto (Principal e Secundária)
    if (images.mainImg) {
      const bb = getBoundingBox(images.mainImg);
      const scale = (mainImageScale / 100) * S;
      const targetW = bb.w * scale;
      const targetH = bb.h * scale;
      const posX = (280 + mainImageOffsetX) * S - targetW / 2;
      const posY = (540 + mainImageOffsetY) * S - targetH / 2;

      ctx.drawImage(images.mainImg, bb.x, bb.y, bb.w, bb.h, posX, posY, targetW, targetH);
      reg['mainImage'] = { key: 'mainImage', label: 'Foto Principal', x: posX / S, y: posY / S, w: targetW / S, h: targetH / S };
    }

    if (showSecondaryImage && images.secImg) {
      const bb = getBoundingBox(images.secImg);
      const scale = (secondaryImageScale / 100) * 0.65 * S;
      const targetW = bb.w * scale;
      const targetH = bb.h * scale;
      const posX = (720 + secondaryImageOffsetX) * S - targetW / 2;
      const posY = (460 + secondaryImageOffsetY) * S - targetH / 2;

      ctx.drawImage(images.secImg, bb.x, bb.y, bb.w, bb.h, posX, posY, targetW, targetH);
      reg['secondaryImage'] = { key: 'secondaryImage', label: 'Foto Secundária', x: posX / S, y: posY / S, w: targetW / S, h: targetH / S };
    }

    // 3. Cabeçalho (Marca e Slogan)
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 0, 1080 * S, 200 * S);

    if (images.headerBg) {
      const tW = 1080 * 0.70 * S;
      const tH = 200 * S;
      const tX = 1080 * S - tW;
      const sc = tW / (images.headerBg.width * S);
      const srcW = images.headerBg.width;
      const srcH = tH / (sc * S);
      const srcY = Math.max(0, (images.headerBg.height - srcH) / 2);
      ctx.drawImage(images.headerBg, 0, srcY, srcW, srcH, tX, 0, tW, tH);
    }

    const headerGrad = ctx.createLinearGradient(0, 0, 1080 * S, 0);
    headerGrad.addColorStop(0, "rgba(12, 21, 35, 1)");
    headerGrad.addColorStop(0.4, "rgba(12, 21, 35, 1)");
    headerGrad.addColorStop(0.7, "rgba(12, 21, 35, 0.4)");
    headerGrad.addColorStop(1, "rgba(12, 21, 35, 0)");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, 1080 * S, 200 * S);

    const brandNameStr = brandName || "MÓVEIS MORANTE";
    const brandSize = brandFontSize || 42;
    const brandX = brandOffsetX ?? 120;
    const brandY = brandOffsetY ?? 82;

    ctx.font = `italic bold ${brandSize * S}px 'Segoe UI', Arial, sans-serif`;
    if (brandNameStr.toUpperCase().startsWith("MÓVEIS MORANTE")) {
      const p1 = "MÓVEIS ";
      const p2 = brandNameStr.substring(7);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p1, brandX * S, brandY * S);
      const p1W = ctx.measureText(p1).width;
      ctx.fillStyle = "#e0a96d";
      ctx.fillText(p2, brandX * S + p1W, brandY * S);
      const brandTotalW = (p1W + ctx.measureText(p2).width) / S;
      reg['brand'] = { key: 'brand', label: 'Marca', x: brandX - 6, y: brandY - brandSize - 4, w: brandTotalW + 12, h: brandSize + 12 };
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(brandNameStr, brandX * S, brandY * S);
      const brandTxtW = ctx.measureText(brandNameStr).width / S;
      reg['brand'] = { key: 'brand', label: 'Marca', x: brandX - 6, y: brandY - brandSize - 4, w: brandTxtW + 12, h: brandSize + 12 };
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
    ctx.font = `${sloganSize * S}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(sloganText, sloganX * S, sloganY * S);
    reg['slogan'] = { key: 'slogan', label: 'Slogan', x: sloganX - 6, y: sloganY - sloganSize - 4, w: ctx.measureText(sloganText).width / S + 12, h: sloganSize + 12 };

    // 4. Rodapé
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 930 * S, 1080 * S, 150 * S);

    if (images.logo) {
      const aspect = images.logo.width / images.logo.height;
      const targetHeight = 135 * (avatarScale / 100) * S;
      const targetWidth = targetHeight * aspect;
      const aX = (avatarOffsetX ?? 35) * S;
      const aY = (avatarOffsetY ?? 938) * S;
      ctx.drawImage(images.logo, aX, aY, targetWidth, targetHeight);
      reg['avatar'] = { key: 'avatar', label: 'Avatar', x: aX / S, y: aY / S, w: targetWidth / S, h: targetHeight / S };
    }

    ctx.fillStyle = "#e0a96d";
    ctx.font = `bold ${(footerAddressTitleFontSize || 24) * S}px 'Segoe UI', Arial, sans-serif`;
    const ftTitle = footerAddressTitle || "VISITE NOSSA LOJA NO ENDEREÇO";
    const ftTitleX = footerAddressTitleOffsetX ?? 175;
    const ftTitleY = footerAddressTitleOffsetY ?? 988;
    ctx.fillText(ftTitle, ftTitleX * S, ftTitleY * S);
    reg['footerTitle'] = { key: 'footerTitle', label: 'Título Endereço', x: ftTitleX - 6, y: ftTitleY - (footerAddressTitleFontSize || 24) - 4, w: ctx.measureText(ftTitle).width / S + 12, h: (footerAddressTitleFontSize || 24) + 12 };

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${(footerAddressTextFontSize || 28) * S}px 'Segoe UI', Arial, sans-serif`;
    const ftAddr = footerAddressText || "RUA CASCAVEL, 306, GUARAITUBA, COLOMBO";
    const ftAddrX = footerAddressTextOffsetX ?? 175;
    const ftAddrY = footerAddressTextOffsetY ?? 1032;
    ctx.fillText(ftAddr, ftAddrX * S, ftAddrY * S);
    reg['footerAddress'] = { key: 'footerAddress', label: 'Endereço', x: ftAddrX - 6, y: ftAddrY - (footerAddressTextFontSize || 28) - 4, w: ctx.measureText(ftAddr).width / S + 12, h: (footerAddressTextFontSize || 28) + 12 };

    // 5. Título do Produto
    const pTitle = productTitle || (product?.name || product?.description || "PRODUTO SEM TÍTULO");
    const pTitleSize = productTitleFontSize || 30;
    const pTitleX = productTitleOffsetX ?? 570;
    const pTitleY = productTitleOffsetY ?? 660;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${pTitleSize * S}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(pTitle, pTitleX * S, pTitleY * S);
    reg['title'] = { key: 'title', label: 'Título Produto', x: pTitleX - 6, y: pTitleY - pTitleSize - 4, w: ctx.measureText(pTitle).width / S + 12, h: pTitleSize + 12 };

    // 6. Preço De / Por
    const cleanNum = (v: any) => {
      if (!v) return 0;
      const s = String(v).replace(/[^\d.,]/g, '').replace(',', '.');
      return parseFloat(s) || 0;
    };

    const effectivePrice = cleanNum(customPrice);
    const effectivePromo = cleanNum(customPromoPrice);

    if (effectivePromo > 0 && effectivePromo < effectivePrice) {
      const deStr = `DE: R$ ${effectivePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const deSize = priceDeFontSize || 20;
      const deX = priceDeOffsetX ?? 570;
      const deY = priceDeOffsetY ?? 610;
      ctx.fillStyle = "rgba(203, 213, 225, 0.7)";
      ctx.font = `bold ${deSize * S}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillText(deStr, deX * S, deY * S);
      const deW = ctx.measureText(deStr).width;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      ctx.moveTo(deX * S, (deY - deSize * 0.3) * S);
      ctx.lineTo((deX * S) + deW, (deY - deSize * 0.3) * S);
      ctx.stroke();
      reg['priceDe'] = { key: 'priceDe', label: 'Preço DE', x: deX - 6, y: deY - deSize - 4, w: deW / S + 12, h: deSize + 12 };
    }

    const porApStr = porApenasText || "POR APENAS";
    const porApSize = porApenasFontSize || 16;
    const porApX = porApenasOffsetX ?? 570;
    const porApY = porApenasOffsetY ?? 635;
    ctx.fillStyle = porApenasColor || "#e0a96d";
    ctx.font = `bold ${porApSize * S}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(porApStr, porApX * S, porApY * S);
    reg['porApenas'] = { key: 'porApenas', label: 'Texto Por Apenas', x: porApX - 6, y: porApY - porApSize - 4, w: ctx.measureText(porApStr).width / S + 12, h: porApSize + 12 };

    const finalPriceVal = effectivePromo > 0 ? effectivePromo : (effectivePrice > 0 ? effectivePrice : 599);
    const priceStr = `R$ ${finalPriceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const prSize = priceFontSize || 48;
    const prX = priceOffsetX ?? 570;
    const prY = priceOffsetY ?? 730;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${prSize * S}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(priceStr, prX * S, prY * S);
    reg['pricePor'] = { key: 'pricePor', label: 'Preço POR', x: prX - 6, y: prY - prSize - 4, w: ctx.measureText(priceStr).width / S + 12, h: prSize + 12 };

    const instText = installmentsText || "Em até 10x sem juros no cartão";
    const instSize = installmentsFontSize || 26;
    const instX = installmentsOffsetX ?? 540;
    const instY = installmentsOffsetY ?? 895;
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `${instSize * S}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(instText, instX * S, instY * S);
    reg['installments'] = { key: 'installments', label: 'Parcelamento', x: instX - 6, y: instY - instSize - 4, w: ctx.measureText(instText).width / S + 12, h: instSize + 12 };

    if (measuresText) {
      const mSize = measuresFontSize || 20;
      const mX = measuresOffsetX ?? 785;
      const mY = measuresOffsetY ?? 610;
      ctx.fillStyle = "#94a3b8";
      ctx.font = `bold ${mSize * S}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillText(measuresText, mX * S, mY * S);
      reg['measures'] = { key: 'measures', label: 'Medidas', x: mX - 6, y: mY - mSize - 4, w: ctx.measureText(measuresText).width / S + 12, h: mSize + 12 };
    }

    // 7. Selo de Oportunidade
    if (showOpportunityBadge && product?.opportunities) {
      const opp = product.opportunities;
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

      ctx.fillStyle = isSalvados ? "#f97316" : resolveBadgeColor(opp.badge_color);
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
        drawFlameIcon(ctx, rx + 15, ry + 12, 20);
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 16px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, isSalvados ? iconSpace / 2 : 0, 0);
      ctx.restore();

      reg['opportunityBadge'] = { key: 'opportunityBadge', label: 'Rótulo Oferta', x: oppOffsetX - badgeW / 2 - 6, y: oppOffsetY - badgeH / 2 - 6, w: badgeW + 12, h: badgeH + 12 };
    }

    // 8. DESTAQUE VISUAL DO ELEMENTO SELECIONADO NO CANVAS (com caixa amarela tracejada e etiqueta)
    if (selectedElement && !isExport) {
      const region = reg[selectedElement];
      if (region) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 220, 60, 0.95)";
        ctx.lineWidth = 3 * S;
        ctx.setLineDash([10 * S, 6 * S]);
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 8;

        const isText = !["mainImage", "secondaryImage", "avatar"].includes(region.key);
        const rectX = isText ? region.x * S : region.x * S - 6 * S;
        const rectY = isText ? region.y * S : region.y * S - 6 * S;
        const rectW = isText ? region.w * S : region.w * S + 12 * S;
        const rectH = isText ? region.h * S : region.h * S + 12 * S;

        ctx.strokeRect(rectX, rectY, rectW, rectH);
        
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 220, 60, 0.95)";
        ctx.font = `bold ${13 * S}px 'Segoe UI', Arial, sans-serif`;
        ctx.textBaseline = "bottom";
        const labelW = ctx.measureText(region.label).width + 12;
        const labelX = Math.min(rectX, canvas.width - labelW);
        const labelY = rectY;
        ctx.fillRect(labelX, labelY - 20 * S, labelW, 20 * S);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillText(region.label, labelX + 6, labelY);
        ctx.textBaseline = "alphabetic";
        ctx.restore();
      }
    }

    renderedRegionsRef.current = reg;
  }, [
    product, productTitle, customPrice, customPromoPrice, installmentsText, measuresText,
    brandName, slogan, footerAddressText, showSecondaryImage, showOpportunityBadge, mainImageScale,
    brandFontSize, brandOffsetX, brandOffsetY, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarScale, avatarOffsetX, avatarOffsetY, footerAddressTitle, footerAddressTitleFontSize,
    footerAddressTitleOffsetX, footerAddressTitleOffsetY, footerAddressTextFontSize,
    footerAddressTextOffsetX, footerAddressTextOffsetY, installmentsFontSize, installmentsOffsetX,
    installmentsOffsetY, productTitleFontSize, productTitleOffsetX, productTitleOffsetY,
    priceFontSize, priceDeFontSize, priceOffsetX, priceOffsetY, priceDeOffsetX, priceDeOffsetY,
    porApenasText, porApenasFontSize, porApenasColor, porApenasOffsetX, porApenasOffsetY,
    measuresFontSize, measuresOffsetX, measuresOffsetY, oppRotation, oppScale, oppOffsetX, oppOffsetY,
    secondaryImageScale, mainImageOffsetX, mainImageOffsetY, secondaryImageOffsetX, secondaryImageOffsetY,
    selectedElement
  ]);

  // Atualização em Tempo Real do Canvas
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const updatePreview = async () => {
      if (!previewCanvasRef.current) return;

      const mainImgUrl = product?.product_images?.find(i => i.is_main)?.image_url || product?.product_images?.[0]?.image_url || '';
      const secImgUrl = product?.product_images?.find(i => !i.is_main)?.image_url || product?.product_images?.[1]?.image_url || '';

      const [headerBg, logo, mainImg, secImg] = await Promise.all([
        loadImg("/images/banner-header-bg.png"),
        loadImg(avatarUrl),
        loadImg(mainImgUrl),
        loadImg(secImgUrl)
      ]);

      if (isMounted && previewCanvasRef.current) {
        drawBannerSync(previewCanvasRef.current, { headerBg, logo, mainImg, secImg });
      }
    };

    updatePreview();
    return () => { isMounted = false; };
  }, [isOpen, product, avatarUrl, drawBannerSync, loadImg]);

  if (!isOpen) return null;

  // Interação de Clique no Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1080 / rect.width;
    const scaleY = 1080 / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const regions = Object.values(renderedRegionsRef.current).reverse();
    const hit = regions.find(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h);
    setSelectedElement((hit ? hit.key : null) as any);
  };

  // Interação de Arrasto (Drag & Drop)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1080 / rect.width;
    const scaleY = 1080 / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const regions = Object.values(renderedRegionsRef.current).reverse();
    const hit = regions.find(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h);
    if (hit) {
      setSelectedElement(hit.key as any);
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: cx, y: cy };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !selectedElement) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1080 / rect.width;
    const scaleY = 1080 / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const dx = cx - lastMousePosRef.current.x;
    const dy = cy - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: cx, y: cy };

    updateElementOffset(selectedElement, dx, dy);
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCopyDirect = async () => {
    if (!previewCanvasRef.current) return;
    try {
      previewCanvasRef.current.toBlob(async (blob) => {
        if (blob && navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([new (window as any).ClipboardItem({ 'image/png': blob })]);
          toast.success("Post copiado para a área de transferência!");
        } else {
          toast.info("Copiar direto não suportado. Use Baixar PNG.");
        }
      });
    } catch (e) {
      toast.error("Erro ao copiar imagem.");
    }
  };

  const handleDownloadDirect = () => {
    if (!previewCanvasRef.current) return;
    const url = previewCanvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `post_${(productTitle || 'promocional').replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.png`;
    a.click();
    toast.success("Download do Post PNG concluído!");
  };

  const handleSavePost = async () => {
    if (!previewCanvasRef.current) return;
    try {
      setDownloading(true);
      previewCanvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          setDownloading(false);
          return;
        }

        const fileName = `post-${product?.id || Date.now()}-${Date.now()}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        const fileUrl = await uploadFile(file, `marketing-posts/${fileName}`);

        if (fileUrl) {
          toast.success("Post promocional salvo e publicado com sucesso!");
          if (onPostSaved) onPostSaved(fileUrl);
          onClose();
        } else {
          toast.success("Arte gerada e pronta para download!");
          onClose();
        }
        setDownloading(false);
      }, "image/png");
    } catch (e) {
      toast.error("Erro ao salvar post.");
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden max-h-[95vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black">
              <i className="bi bi-palette-fill text-lg" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-1">
                EDITOR DE POST PROMOCIONAL
              </h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                {productTitle || product?.name || product?.description || "Produto Selecionado"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast.info("Ação desfeita")}
              className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              title="Desfazer"
            >
              <i className="bi bi-arrow-counterclockwise text-sm" />
            </button>
            <button
              type="button"
              onClick={() => toast.info("Ação refeita")}
              className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              title="Refazer"
            >
              <i className="bi bi-arrow-clockwise text-sm" />
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
            >
              <i className="bi bi-x-lg text-sm" />
            </button>
          </div>
        </div>

        {/* Photoshop-style Toolbar com Camadas e Limpar Seleção */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 px-8 py-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsLayersModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-sm cursor-pointer"
          >
            <i className="bi bi-layers-fill text-blue-600" />
            <span>Camadas</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => setSelectedElement(null)}
            disabled={!selectedElement}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              selectedElement
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <i className="bi bi-cursor-fill" />
            <span>Limpar Seleção</span>
          </button>

          <span className="text-[10px] font-bold text-slate-400 ml-auto hidden sm:inline uppercase tracking-widest">
            {selectedElement ? `Selecionado: ${layersList.find(l => l.key === selectedElement)?.label}` : 'Nenhum elemento selecionado'}
          </span>
        </div>

        {/* Modal Body: 2 Colunas (Canvas Preview + Controles) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Coluna Esquerda: Canvas Preview Interativo */}
            <div className="lg:col-span-5 flex flex-col items-center gap-5 sticky top-0">
              <div className="w-full flex flex-col items-center bg-slate-950 p-3 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden aspect-square max-w-[480px]">
                <canvas
                  ref={previewCanvasRef}
                  width={1080}
                  height={1080}
                  onClick={handleCanvasClick}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="w-full h-full object-contain rounded-2xl cursor-crosshair"
                />
              </div>

              {/* Botões de Ação Direta */}
              <div className="flex items-center gap-3 w-full max-w-[480px]">
                <button
                  type="button"
                  onClick={handleCopyDirect}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <i className="bi bi-copy text-sm text-slate-400" />
                  <span>COPIAR IMAGEM</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDirect}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <i className="bi bi-download text-sm text-slate-400" />
                  <span>BAIXAR PNG</span>
                </button>
              </div>
            </div>

            {/* Coluna Direita: Controles de Customização (Cards 1, 2 e 3 ou Elemento Selecionado) */}
            <div className="lg:col-span-7 space-y-6">
              
              {selectedElement ? (
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedElement(null)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-500 cursor-pointer"
                  >
                    <i className="bi bi-chevron-left text-sm" />
                  </button>
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex-1">
                    {layersList.find(l => l.key === selectedElement)?.label}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-black bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                    Elemento Selecionado
                  </span>
                </div>
              ) : null}

              {/* Card 1: INFORMAÇÕES DO PRODUTO */}
              <div className={`p-6 bg-slate-50/70 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 ${selectedElement && !['title', 'pricePor', 'priceDe', 'porApenas', 'installments', 'measures'].includes(selectedElement) ? 'hidden' : ''}`}>
                <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
                  <span className="text-xs font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-md">Aa</span>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    INFORMAÇÕES DO PRODUTO
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                      TÍTULO NO POST
                    </label>
                    <input
                      type="text"
                      value={productTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                        PREÇO NORMAL (DE:)
                      </label>
                      <input
                        type="text"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="599"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                        PREÇO PROMO (POR:)
                      </label>
                      <input
                        type="text"
                        value={customPromoPrice}
                        onChange={(e) => setCustomPromoPrice(e.target.value)}
                        placeholder="499"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all text-blue-600 dark:text-blue-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                      PARCELAMENTO
                    </label>
                    <input
                      type="text"
                      value={installmentsText}
                      onChange={(e) => setInstallmentsText(e.target.value)}
                      placeholder="Em até 10x sem juros no cartão"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                      MEDIDAS TÉCNICAS
                    </label>
                    <input
                      type="text"
                      value={measuresText}
                      onChange={(e) => setMeasuresText(e.target.value)}
                      placeholder="L 61cm · A 210cm · P 50cm"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all text-slate-600 dark:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: IDENTIDADE DA LOJA */}
              <div className={`p-6 bg-slate-50/70 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 ${selectedElement && !['brand', 'slogan', 'avatar', 'footerTitle', 'footerAddress'].includes(selectedElement) ? 'hidden' : ''}`}>
                <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                  <i className="bi bi-shop text-sm" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    IDENTIDADE DA LOJA
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                        NOME DA MARCA
                      </label>
                      <input
                        type="text"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="MÓVEIS MORANTE"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                        SLOGAN
                      </label>
                      <input
                        type="text"
                        value={slogan}
                        onChange={(e) => setSlogan(e.target.value)}
                        placeholder="Qualidade que cabe no seu bolso"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                      ENDEREÇO NO RODAPÉ
                    </label>
                    <input
                      type="text"
                      value={footerAddressText}
                      onChange={(e) => setFooterAddressText(e.target.value)}
                      placeholder="RUA CASCAVEL, 306, GUARAITUBA, COLOMBO"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:border-blue-500 transition-all text-slate-600 dark:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: AJUSTES VISUAIS */}
              <div className={`p-6 bg-slate-50/70 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 ${selectedElement && !['mainImage', 'secondaryImage', 'opportunityBadge'].includes(selectedElement) ? 'hidden' : ''}`}>
                <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400">
                  <i className="bi bi-sliders text-sm" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    AJUSTES VISUAIS
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showSecondaryImage}
                      onChange={(e) => setShowSecondaryImage(e.target.checked)}
                      className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">Foto Secundária</span>
                  </label>

                  <label className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showOpportunityBadge}
                      onChange={(e) => setShowOpportunityBadge(e.target.checked)}
                      className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">Selo Oportunidade</span>
                  </label>
                </div>

                {/* Slider para Tamanho da Foto Principal */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                    <span>TAMANHO DA FOTO PRINCIPAL</span>
                    <span className="text-pink-600 font-extrabold">{mainImageScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="180"
                    value={mainImageScale}
                    onChange={(e) => setMainImageScale(Number(e.target.value))}
                    className="w-full accent-pink-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal de Camadas (Layers Modal) */}
        {isLayersModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <i className="bi bi-layers-fill text-blue-600 text-lg" />
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Camadas do Post
                  </h3>
                </div>
                <button type="button" onClick={() => setIsLayersModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <i className="bi bi-x-lg text-sm" />
                </button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {layersList.map(layer => (
                  <button
                    key={layer.key}
                    type="button"
                    onClick={() => {
                      setSelectedElement(layer.key as any);
                      setIsLayersModalOpen(false);
                    }}
                    className={`w-full p-3 rounded-2xl text-left text-xs font-black uppercase flex items-center justify-between border transition-all cursor-pointer ${
                      selectedElement === layer.key
                        ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i className={`bi ${layer.icon} text-base text-blue-500`} />
                      <span>{layer.label}</span>
                    </div>
                    {selectedElement === layer.key && (
                      <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black">Ativa</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-black uppercase text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={handleSavePost}
            className="px-8 py-3 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-pink-500/25 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <i className="bi bi-cloud-arrow-up-fill text-sm" />
            )}
            <span>SALVAR & PUBLICAR ARTE</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default DigitalMarketingPostModal;
