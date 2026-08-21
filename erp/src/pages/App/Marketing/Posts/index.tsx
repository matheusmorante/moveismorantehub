import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';
import { uploadFile } from '@/pages/utils/storageService';

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

export default function MarketingPosts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Opções de customização do banner
  const [brandName, setBrandName] = useState("MÓVEIS MORANTE");
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
  
  const [oppRotation, setOppRotation] = useState<number>(0);
  const [oppScale, setOppScale] = useState<number>(100);
  const [oppOffsetX, setOppOffsetX] = useState<number>(50);
  const [oppOffsetY, setOppOffsetY] = useState<number>(220);

  const [avatarUrl, setAvatarUrl] = useState("/images/avatar-morante.png");
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
  const [installmentsFontSize, setInstallmentsFontSize] = useState<number>(26);
  const [installmentsOffsetX, setInstallmentsOffsetX] = useState<number>(540);
  const [installmentsOffsetY, setInstallmentsOffsetY] = useState<number>(895);

  const [productTitle, setProductTitle] = useState("");
  const [productTitleFontSize, setProductTitleFontSize] = useState<number>(30);
  const [productTitleOffsetX, setProductTitleOffsetX] = useState<number>(570);
  const [productTitleOffsetY, setProductTitleOffsetY] = useState<number>(660);
  const [productTitleMaxContainerWidth, setProductTitleMaxContainerWidth] = useState<number>(430);
  const [productTitleRotation, setProductTitleRotation] = useState<number>(0);
  const [productTitleScale, setProductTitleScale] = useState<number>(100);

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

  const [measuresText, setMeasuresText] = useState("");
  const [measuresFontSize, setMeasuresFontSize] = useState<number>(20);
  const [measuresOffsetX, setMeasuresOffsetX] = useState<number>(785);
  const [measuresOffsetY, setMeasuresOffsetY] = useState<number>(610);

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
  const [marketingDefaults, setMarketingDefaults] = useState<any>(null);
  const [selectedQuickActionsPost, setSelectedQuickActionsPost] = useState<any>(null);

  // Elemento selecionado no canvas para edição interativa
  type SelectedElement = 'mainImage' | 'secondaryImage' | 'opportunityBadge' | 'brand' | 'slogan' | 'installments' | 'avatar' | 'footerTitle' | 'footerAddress' | 'title' | 'priceDe' | 'pricePor' | 'porApenas' | 'measures' | null;
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const renderedRegionsRef = useRef<Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }>>({});

  // Histórico de alterações (Undo / Redo)
  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isApplyingHistoryRef = useRef<boolean>(false);

  const getCurrentState = useCallback(() => ({
    brandName, brandFontSize, brandOffsetX, brandOffsetY,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY,
    footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX, footerAddressTitleOffsetY,
    footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    installmentsText, installmentsFontSize, installmentsOffsetX, installmentsOffsetY,
    showSecondaryImage, showOpportunityBadge,
    oppRotation, oppScale, oppOffsetX, oppOffsetY,
    customPrice, customPromoPrice,
    mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY,
    secondaryImageOffsetX, secondaryImageOffsetY,
    mainImageIndex, secondaryImageIndex,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleMaxContainerWidth,
    productTitleRotation, productTitleScale,
    priceFontSize, priceDeFontSize, priceOffsetX, priceOffsetY,
    priceRotation, priceScale,
    priceDeOffsetX, priceDeOffsetY, priceDeRotation, priceDeScale,
    porApenasText, porApenasFontSize, porApenasColor, porApenasOffsetX, porApenasOffsetY,
    porApenasRotation, porApenasScale,
    measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY
  }), [
    brandName, brandFontSize, brandOffsetX, brandOffsetY,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY,
    footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX, footerAddressTitleOffsetY,
    footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    installmentsText, installmentsFontSize, installmentsOffsetX, installmentsOffsetY,
    showSecondaryImage, showOpportunityBadge,
    oppRotation, oppScale, oppOffsetX, oppOffsetY,
    customPrice, customPromoPrice,
    mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY,
    secondaryImageOffsetX, secondaryImageOffsetY,
    mainImageIndex, secondaryImageIndex,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleMaxContainerWidth,
    productTitleRotation, productTitleScale,
    priceFontSize, priceDeFontSize, priceOffsetX, priceOffsetY,
    priceRotation, priceScale,
    priceDeOffsetX, priceDeOffsetY, priceDeRotation, priceDeScale,
    porApenasText, porApenasFontSize, porApenasColor, porApenasOffsetX, porApenasOffsetY,
    porApenasRotation, porApenasScale,
    measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY
  ]);

  const applyState = (s: any) => {
    if (!s) return;
    isApplyingHistoryRef.current = true;
    
    if (s.brandName !== undefined) setBrandName(s.brandName);
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
    if (s.installmentsOffsetY !== undefined) setInstallmentsOffsetY(s.installmentsOffsetY);
    if (s.showSecondaryImage !== undefined) setShowSecondaryImage(s.showSecondaryImage);
    if (s.showOpportunityBadge !== undefined) setShowOpportunityBadge(s.showOpportunityBadge);
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

        if (styleData?.marketing_defaults) {
          setMarketingDefaults(styleData.marketing_defaults);
        }
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
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

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
    images: { headerBg: HTMLImageElement | null; logo: HTMLImageElement | null; mainImg: HTMLImageElement | null; secImg: HTMLImageElement | null },
    isExport = false
  ) => {
    if (!activeProduct) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const S = canvas.width / 1080;
    const reg: Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }> = {};

    // 1. Fundo Geral
    ctx.fillStyle = "#0c1523";
    ctx.fillRect(0, 0, 1080 * S, 1080 * S);

    // Fundo degrade elegante
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
      const posX = (720 + secondaryImageOffsetX) * S - targetW / 2;
      const posY = (460 + secondaryImageOffsetY) * S - targetH / 2;

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
    const pTitle = productTitle || activeProduct.name;
    const pTitleSize = productTitleFontSize || 30;
    const pTitleX = productTitleOffsetX ?? 570;
    const pTitleY = productTitleOffsetY ?? 660;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${pTitleSize * S}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(pTitle, pTitleX * S, pTitleY * S);
    reg['title'] = { key: 'title', label: 'Título Produto', x: pTitleX - 6, y: pTitleY - pTitleSize - 4, w: ctx.measureText(pTitle).width / S + 12, h: pTitleSize + 12 };

    // 6. Preço De / Por
    const effectivePrice = customPrice ? parseFloat(customPrice) : activeProduct.price;
    const effectivePromo = customPromoPrice ? parseFloat(customPromoPrice) : activeProduct.promo_price;

    if (effectivePromo && effectivePromo < effectivePrice) {
      // Preço De
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

    // Por Apenas
    const porApStr = porApenasText || "POR APENAS";
    const porApSize = porApenasFontSize || 16;
    const porApX = porApenasOffsetX ?? 570;
    const porApY = porApenasOffsetY ?? 635;
    ctx.fillStyle = porApenasColor || "#e0a96d";
    ctx.font = `bold ${porApSize * S}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(porApStr, porApX * S, porApY * S);
    reg['porApenas'] = { key: 'porApenas', label: 'Texto Por Apenas', x: porApX - 6, y: porApY - porApSize - 4, w: ctx.measureText(porApStr).width / S + 12, h: porApSize + 12 };

    // Preço Final
    const finalPriceVal = effectivePromo || effectivePrice;
    const priceStr = `R$ ${finalPriceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const prSize = priceFontSize || 48;
    const prX = priceOffsetX ?? 570;
    const prY = priceOffsetY ?? 730;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${prSize * S}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(priceStr, prX * S, prY * S);
    reg['pricePor'] = { key: 'pricePor', label: 'Preço POR', x: prX - 6, y: prY - prSize - 4, w: ctx.measureText(priceStr).width / S + 12, h: prSize + 12 };

    // Parcelas
    const instText = installmentsText || "Em até 10x sem juros no cartão";
    const instSize = installmentsFontSize || 26;
    const instX = installmentsOffsetX ?? 540;
    const instY = installmentsOffsetY ?? 895;
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `${instSize * S}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(instText, instX * S, instY * S);
    reg['installments'] = { key: 'installments', label: 'Parcelas', x: instX - 6, y: instY - instSize - 4, w: ctx.measureText(instText).width / S + 12, h: instSize + 12 };

    // Medidas
    if (measuresText) {
      const mSize = measuresFontSize || 20;
      const mX = measuresOffsetX ?? 785;
      const mY = measuresOffsetY ?? 610;
      ctx.fillStyle = "#94a3b8";
      ctx.font = `bold ${mSize * S}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillText(measuresText, mX * S, mY * S);
      reg['measures'] = { key: 'measures', label: 'Medidas', x: mX - 6, y: mY - mSize - 4, w: ctx.measureText(measuresText).width / S + 12, h: mSize + 12 };
    }

    // 7. Oportunidade
    if (showOpportunityBadge && activeProduct.opportunities) {
      const opp = activeProduct.opportunities;
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

      const scaleFactor = (oppScale / 100);
      reg['opportunityBadge'] = {
        key: 'opportunityBadge',
        label: 'Rótulo Oportunidade',
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
        ctx.strokeStyle = "rgba(255, 220, 60, 0.95)";
        ctx.lineWidth = 3 * S;
        ctx.setLineDash([10 * S, 6 * S]);
        ctx.strokeRect(region.x * S, region.y * S, region.w * S, region.h * S);
        ctx.restore();
      }
    }

    renderedRegionsRef.current = reg;
  };

  const drawBannerAsync = async (canvas: HTMLCanvasElement, isExport = false) => {
    if (!activeProduct) return;
    const images = activeProduct.product_images || [];
    const mainImageUrl = images[mainImageIndex]?.image_url || images[0]?.image_url || "";
    const secImageUrl = images[secondaryImageIndex]?.image_url || images[1]?.image_url || "";

    const [headerBg, logo, mainImg, secImg] = await Promise.all([
      loadImg("/images/banner-header-bg.png"),
      avatarUrl ? loadImg(avatarUrl) : loadImg("/images/avatar-morante.png"),
      mainImageUrl ? loadImg(mainImageUrl) : Promise.resolve(null),
      (secImageUrl && showSecondaryImage) ? loadImg(secImageUrl) : Promise.resolve(null),
    ]);

    drawBannerSync(canvas, { headerBg, logo, mainImg, secImg }, isExport);
  };

  // Re-renderiza o canvas sempre que os estados mudam
  useEffect(() => {
    if (previewCanvasRef.current && activeProduct) {
      drawBannerAsync(previewCanvasRef.current, false);
    }
  }, [
    activeProduct, brandName, brandFontSize, brandOffsetX, brandOffsetY, slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY, footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX,
    footerAddressTitleOffsetY, footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    installmentsText, installmentsFontSize, installmentsOffsetX, installmentsOffsetY, showSecondaryImage, showOpportunityBadge,
    oppRotation, oppScale, oppOffsetX, oppOffsetY, customPrice, customPromoPrice, mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY, secondaryImageOffsetX, secondaryImageOffsetY, mainImageIndex, secondaryImageIndex,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, priceFontSize, priceDeFontSize,
    priceOffsetX, priceOffsetY, priceDeOffsetX, priceDeOffsetY, porApenasText, porApenasFontSize, porApenasColor,
    porApenasOffsetX, porApenasOffsetY, measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY, selectedElement
  ]);

  // Registra no histórico
  useEffect(() => {
    if (activeProduct && !isApplyingHistoryRef.current) {
      pushToHistory(getCurrentState());
    }
  }, [getCurrentState, activeProduct]);

  // Handlers de Ações
  const handleNewPost = () => {
    setActivePostId(null);
    setIsModalOpen(true);
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
    canvas.height = 1080;
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
    canvas.height = 1080;
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

  const handleSavePost = async () => {
    if (!activeProduct) return;
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
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

  const handleSaveDefaults = async () => {
    try {
      const defaults = {
        brandName,
        slogan,
        avatarUrl,
        footerAddressText,
        installmentsText,
        brandFontSize,
        sloganFontSize,
        footerAddressTextFontSize,
        installmentsFontSize
      };
      const { error } = await supabase
        .from("store_style_settings")
        .upsert({ id: true, marketing_defaults: defaults });
      
      if (error) throw error;
      setMarketingDefaults(defaults);
      toast.success("Padrões de marketing salvos com sucesso! 📌");
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao salvar padrões de marketing.");
    }
  };

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
              Crie artes promocionais profissionais (1080x1080) automaticamente para Instagram, Facebook e WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDefaults}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            title="Salvar cabeçalho e rodapé como padrão para novos posts"
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
                  <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center border-b border-slate-100 dark:border-slate-800 overflow-hidden">
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
      {isModalOpen && activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 flex items-center justify-center">
                  <i className="bi bi-brush text-lg" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Editor de Post Promocional
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">{activeProduct.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Desfazer (Ctrl+Z)"
                >
                  <i className="bi bi-arrow-counterclockwise text-sm" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Refazer (Ctrl+Y)"
                >
                  <i className="bi bi-arrow-clockwise text-sm" />
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <i className="bi bi-x-lg text-sm" />
                </button>
              </div>
            </div>

            {/* Modal Body: 2 Colunas (Canvas Preview + Controles) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
              
              {/* Coluna Esquerda: Canvas Preview Interativo (6 cols) */}
              <div className="lg:col-span-6 flex flex-col items-center gap-4">
                <div className="relative w-full max-w-[480px] aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-950">
                  <canvas
                    ref={previewCanvasRef}
                    width={1080}
                    height={1080}
                    className="w-full h-full object-contain cursor-crosshair"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const scaleX = 1080 / rect.width;
                      const scaleY = 1080 / rect.height;
                      const cx = (e.clientX - rect.left) * scaleX;
                      const cy = (e.clientY - rect.top) * scaleY;
                      const regions = Object.values(renderedRegionsRef.current).reverse();
                      const hit = regions.find(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h);
                      setSelectedElement((hit ? hit.key : null) as any);
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-center w-full">
                  <button
                    type="button"
                    onClick={handleCopyDirect}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <i className="bi bi-copy" />
                    Copiar Imagem
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDirect}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <i className="bi bi-download" />
                    Baixar PNG
                  </button>
                </div>
              </div>

              {/* Coluna Direita: Controles de Customização (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Seção 1: Textos & Preços */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
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
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
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
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
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
                      type="range"
                      min="40"
                      max="180"
                      value={mainImageScale}
                      onChange={(e) => setMainImageScale(Number(e.target.value))}
                      className="w-full accent-pink-600"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={downloading}
                  onClick={handleSavePost}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-pink-500/20 active:scale-95 disabled:opacity-50"
                >
                  {downloading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <i className="bi bi-cloud-arrow-up-fill" />
                  )}
                  <span>Salvar & Publicar Arte</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
