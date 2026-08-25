"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Download, Save, Image as ImageIcon, Sparkles, Pencil, Trash2, Plus, Eye, X, Search, CheckCircle, Settings, ChevronDown, ChevronUp, Pin, Info, Undo, Redo, ChevronLeft, MousePointer2, RotateCcw, MoreVertical, Share2, Copy, Layers } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { uploadToR2 } from "@/lib/utils/upload-r2"
import Link from "next/link"

interface Product {
  id: string
  name: string
  price: number
  promo_price: number | null
  product_images: { image_url: string; is_main: boolean }[]
  opportunities: { name: string; badge_color: string; border_color: string } | null
  technical_specs?: any | null
  width?: number | null
  depth?: number | null
  height?: number | null
}

// Helper para detectar a caixa delimitadora (bounding box) da imagem
function getBoundingBox(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return { x: 0, y: 0, w: img.width, h: img.height }
  
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  let minX = canvas.width
  let minY = canvas.height
  let maxX = 0
  let maxY = 0
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4
      const r = data[index]
      const g = data[index + 1]
      const b = data[index + 2]
      const a = data[index + 3]
      
      const isWhite = r > 248 && g > 248 && b > 248
      const isTransparent = a < 15
      
      if (!isWhite && !isTransparent) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  
  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, w: img.width, h: img.height }
  }
  
  const padding = 15
  const x = Math.max(0, minX - padding)
  const y = Math.max(0, minY - padding)
  const w = Math.min(canvas.width - x, (maxX - minX) + padding * 2)
  const h = Math.min(canvas.height - y, (maxY - minY) + padding * 2)
  
  return { x, y, w, h }
}

function resolveBadgeColor(badgeColorClass: string) {
  if (!badgeColorClass) return "#ef4444"
  if (badgeColorClass.includes("red-600")) return "#dc2626"
  if (badgeColorClass.includes("orange-500")) return "#f97316"
  if (badgeColorClass.includes("orange-600")) return "#ea580c"
  if (badgeColorClass.includes("amber-600")) return "#d97706"
  if (badgeColorClass.includes("purple-600")) return "#7c3aed"
  if (badgeColorClass.includes("blue-600")) return "#2563eb"
  if (badgeColorClass.includes("green-600")) return "#16a34a"
  if (badgeColorClass.includes("pink-600")) return "#db2777"
  if (badgeColorClass.includes("teal-600")) return "#0d9488"
  if (badgeColorClass.startsWith("#")) return badgeColorClass
  return "#ef4444"
}

function drawFlameIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  ctx.fillStyle = "#ffffff"
  ctx.translate(x, y)
  const scale = size / 24
  ctx.scale(scale, scale)
  const p = new Path2D("M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z")
  ctx.fill(p)
  ctx.restore()
}

export default function MarketingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Opções de customização do banner
  const [brandName, setBrandName] = useState("MÓVEIS MORANTE")
  const [brandFontSize, setBrandFontSize] = useState<number>(42)
  const [brandOffsetX, setBrandOffsetX] = useState<number>(120)
  const [brandOffsetY, setBrandOffsetY] = useState<number>(82)
  const [slogan, setSlogan] = useState("Qualidade que cabe no seu bolso")
  const [sloganFontSize, setSloganFontSize] = useState<number>(20)
  const [sloganOffsetX, setSloganOffsetX] = useState<number>(120)
  const [sloganOffsetY, setSloganOffsetY] = useState<number>(130)

  const [installmentsText, setInstallmentsText] = useState("Em até 10x sem juros nas principais bandeiras de cartão")
  const [showSecondaryImage, setShowSecondaryImage] = useState(true)
  const [showOpportunityBadge, setShowOpportunityBadge] = useState(true)
  
  const [oppRotation, setOppRotation] = useState<number>(0)
  const [oppScale, setOppScale] = useState<number>(100)
  const [oppOffsetX, setOppOffsetX] = useState<number>(50)
  const [oppOffsetY, setOppOffsetY] = useState<number>(220)

  const [avatarUrl, setAvatarUrl] = useState("/images/avatar-morante.png")
  const [avatarScale, setAvatarScale] = useState<number>(100)
  const [avatarOffsetX, setAvatarOffsetX] = useState<number>(35)
  const [avatarOffsetY, setAvatarOffsetY] = useState<number>(938)
  const [footerAddressTitle, setFooterAddressTitle] = useState("VISITE NOSSA LOJA NO ENDEREÇO")
  const [footerAddressTitleFontSize, setFooterAddressTitleFontSize] = useState<number>(24)
  const [footerAddressTitleOffsetX, setFooterAddressTitleOffsetX] = useState<number>(175)
  const [footerAddressTitleOffsetY, setFooterAddressTitleOffsetY] = useState<number>(988)
  const [footerAddressText, setFooterAddressText] = useState("RUA CASCAVEL, 306, GUARAITUBA, COLOMBO")
  const [footerAddressTextFontSize, setFooterAddressTextFontSize] = useState<number>(28)
  const [footerAddressTextOffsetX, setFooterAddressTextOffsetX] = useState<number>(175)
  const [footerAddressTextOffsetY, setFooterAddressTextOffsetY] = useState<number>(1032)
  const [installmentsFontSize, setInstallmentsFontSize] = useState<number>(26)
  const [installmentsOffsetX, setInstallmentsOffsetX] = useState<number>(540)
  const [installmentsOffsetY, setInstallmentsOffsetY] = useState<number>(895)

  const [productTitle, setProductTitle] = useState("")
  const [productTitleFontSize, setProductTitleFontSize] = useState<number>(30)
  const [productTitleOffsetX, setProductTitleOffsetX] = useState<number>(570)
  const [productTitleOffsetY, setProductTitleOffsetY] = useState<number>(660)
  const [productTitleMaxContainerWidth, setProductTitleMaxContainerWidth] = useState<number>(430)
  const [productTitleRotation, setProductTitleRotation] = useState<number>(0)
  const [productTitleScale, setProductTitleScale] = useState<number>(100)

  const [priceFontSize, setPriceFontSize] = useState<number>(48)
  const [priceDeFontSize, setPriceDeFontSize] = useState<number>(20)
  const [priceOffsetX, setPriceOffsetX] = useState<number>(570)
  const [priceOffsetY, setPriceOffsetY] = useState<number>(730)
  const [priceRotation, setPriceRotation] = useState<number>(0)
  const [priceScale, setPriceScale] = useState<number>(100)

  const [priceDeOffsetX, setPriceDeOffsetX] = useState<number>(570)
  const [priceDeOffsetY, setPriceDeOffsetY] = useState<number>(610)
  const [priceDeRotation, setPriceDeRotation] = useState<number>(0)
  const [priceDeScale, setPriceDeScale] = useState<number>(100)

  const [porApenasText, setPorApenasText] = useState("POR APENAS")
  const [porApenasFontSize, setPorApenasFontSize] = useState<number>(16)
  const [porApenasColor, setPorApenasColor] = useState("#e0a96d")
  const [porApenasOffsetX, setPorApenasOffsetX] = useState<number>(570)
  const [porApenasOffsetY, setPorApenasOffsetY] = useState<number>(635)
  const [porApenasRotation, setPorApenasRotation] = useState<number>(0)
  const [porApenasScale, setPorApenasScale] = useState<number>(100)

  const [measuresText, setMeasuresText] = useState("")
  const [measuresFontSize, setMeasuresFontSize] = useState<number>(20)
  const [measuresOffsetX, setMeasuresOffsetX] = useState<number>(785)
  const [measuresOffsetY, setMeasuresOffsetY] = useState<number>(610)

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const [customPrice, setCustomPrice] = useState("")
  const [customPromoPrice, setCustomPromoPrice] = useState("")
  const [mainImageScale, setMainImageScale] = useState<number>(100)
  const [secondaryImageScale, setSecondaryImageScale] = useState<number>(100)
  const [mainImageOffsetX, setMainImageOffsetX] = useState<number>(0)
  const [mainImageOffsetY, setMainImageOffsetY] = useState<number>(0)
  const [secondaryImageOffsetX, setSecondaryImageOffsetX] = useState<number>(0)
  const [secondaryImageOffsetY, setSecondaryImageOffsetY] = useState<number>(0)
  const [mainImageIndex, setMainImageIndex] = useState<number>(0)
  const [secondaryImageIndex, setSecondaryImageIndex] = useState<number>(1)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [marketingDefaults, setMarketingDefaults] = useState<any>(null)
  const [selectedQuickActionsPost, setSelectedQuickActionsPost] = useState<any>(null)
  const [isLayersModalOpen, setIsLayersModalOpen] = useState(false)

  // Elemento selecionado no canvas para edição interativa
  type SelectedElement = 'mainImage' | 'secondaryImage' | 'opportunityBadge' | 'brand' | 'slogan' | 'installments' | 'avatar' | 'footerTitle' | 'footerAddress' | 'title' | 'priceDe' | 'pricePor' | 'porApenas' | 'measures' | null
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({})
  const renderedRegionsRef = useRef<Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }>>({})
  
  // Controle de arrasto (drag and drop) e teclado
  const isDraggingRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })

  // Histórico de alterações (Undo / Redo)
  const historyRef = useRef<any[]>([])
  const historyIndexRef = useRef<number>(-1)
  const isApplyingHistoryRef = useRef<boolean>(false)

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
  ])

  const applyState = (s: any) => {
    if (!s) return
    isApplyingHistoryRef.current = true
    
    if (s.brandName !== undefined) setBrandName(s.brandName)
    if (s.brandFontSize !== undefined) setBrandFontSize(s.brandFontSize)
    if (s.brandOffsetX !== undefined) setBrandOffsetX(s.brandOffsetX)
    if (s.brandOffsetY !== undefined) setBrandOffsetY(s.brandOffsetY)
    if (s.slogan !== undefined) setSlogan(s.slogan)
    if (s.sloganFontSize !== undefined) setSloganFontSize(s.sloganFontSize)
    if (s.sloganOffsetX !== undefined) setSloganOffsetX(s.sloganOffsetX)
    if (s.sloganOffsetY !== undefined) setSloganOffsetY(s.sloganOffsetY)
    if (s.avatarUrl !== undefined) setAvatarUrl(s.avatarUrl)
    if (s.avatarScale !== undefined) setAvatarScale(s.avatarScale)
    if (s.avatarOffsetX !== undefined) setAvatarOffsetX(s.avatarOffsetX)
    if (s.avatarOffsetY !== undefined) setAvatarOffsetY(s.avatarOffsetY)
    if (s.footerAddressTitle !== undefined) setFooterAddressTitle(s.footerAddressTitle)
    if (s.footerAddressTitleFontSize !== undefined) setFooterAddressTitleFontSize(s.footerAddressTitleFontSize)
    if (s.footerAddressTitleOffsetX !== undefined) setFooterAddressTitleOffsetX(s.footerAddressTitleOffsetX)
    if (s.footerAddressTitleOffsetY !== undefined) setFooterAddressTitleOffsetY(s.footerAddressTitleOffsetY)
    if (s.footerAddressText !== undefined) setFooterAddressText(s.footerAddressText)
    if (s.footerAddressTextFontSize !== undefined) setFooterAddressTextFontSize(s.footerAddressTextFontSize)
    if (s.footerAddressTextOffsetX !== undefined) setFooterAddressTextOffsetX(s.footerAddressTextOffsetX)
    if (s.footerAddressTextOffsetY !== undefined) setFooterAddressTextOffsetY(s.footerAddressTextOffsetY)
    if (s.installmentsText !== undefined) setInstallmentsText(s.installmentsText)
    if (s.installmentsFontSize !== undefined) setInstallmentsFontSize(s.installmentsFontSize)
    if (s.installmentsOffsetX !== undefined) setInstallmentsOffsetX(s.installmentsOffsetX)
    if (s.installmentsOffsetY !== undefined) setInstallmentsOffsetY(s.installmentsOffsetY)
    if (s.showSecondaryImage !== undefined) setShowSecondaryImage(s.showSecondaryImage)
    if (s.showOpportunityBadge !== undefined) setShowOpportunityBadge(s.showOpportunityBadge)
    if (s.oppRotation !== undefined) setOppRotation(s.oppRotation)
    if (s.oppScale !== undefined) setOppScale(s.oppScale)
    if (s.oppOffsetX !== undefined) setOppOffsetX(s.oppOffsetX)
    if (s.oppOffsetY !== undefined) setOppOffsetY(s.oppOffsetY)
    if (s.customPrice !== undefined) setCustomPrice(s.customPrice)
    if (s.customPromoPrice !== undefined) setCustomPromoPrice(s.customPromoPrice)
    if (s.mainImageScale !== undefined) setMainImageScale(s.mainImageScale)
    if (s.secondaryImageScale !== undefined) setSecondaryImageScale(s.secondaryImageScale)
    if (s.mainImageOffsetX !== undefined) setMainImageOffsetX(s.mainImageOffsetX)
    if (s.mainImageOffsetY !== undefined) setMainImageOffsetY(s.mainImageOffsetY)
    if (s.secondaryImageOffsetX !== undefined) setSecondaryImageOffsetX(s.secondaryImageOffsetX)
    if (s.secondaryImageOffsetY !== undefined) setSecondaryImageOffsetY(s.secondaryImageOffsetY)
    if (s.mainImageIndex !== undefined) setMainImageIndex(s.mainImageIndex)
    if (s.secondaryImageIndex !== undefined) setSecondaryImageIndex(s.secondaryImageIndex)
    
    if (s.productTitle !== undefined) setProductTitle(s.productTitle)
    if (s.productTitleFontSize !== undefined) setProductTitleFontSize(s.productTitleFontSize)
    if (s.productTitleOffsetX !== undefined) setProductTitleOffsetX(s.productTitleOffsetX)
    if (s.productTitleOffsetY !== undefined) setProductTitleOffsetY(s.productTitleOffsetY)
    if (s.productTitleMaxContainerWidth !== undefined) setProductTitleMaxContainerWidth(s.productTitleMaxContainerWidth)
    if (s.productTitleRotation !== undefined) setProductTitleRotation(s.productTitleRotation)
    if (s.productTitleScale !== undefined) setProductTitleScale(s.productTitleScale)
    if (s.priceFontSize !== undefined) setPriceFontSize(s.priceFontSize)
    if (s.priceDeFontSize !== undefined) setPriceDeFontSize(s.priceDeFontSize)
    if (s.priceOffsetX !== undefined) setPriceOffsetX(s.priceOffsetX)
    if (s.priceOffsetY !== undefined) setPriceOffsetY(s.priceOffsetY)
    if (s.priceRotation !== undefined) setPriceRotation(s.priceRotation)
    if (s.priceScale !== undefined) setPriceScale(s.priceScale)
    if (s.priceDeOffsetX !== undefined) setPriceDeOffsetX(s.priceDeOffsetX)
    if (s.priceDeOffsetY !== undefined) setPriceDeOffsetY(s.priceDeOffsetY)
    if (s.priceDeRotation !== undefined) setPriceDeRotation(s.priceDeRotation)
    if (s.priceDeScale !== undefined) setPriceDeScale(s.priceDeScale)
    if (s.porApenasText !== undefined) setPorApenasText(s.porApenasText)
    if (s.porApenasFontSize !== undefined) setPorApenasFontSize(s.porApenasFontSize)
    if (s.porApenasColor !== undefined) setPorApenasColor(s.porApenasColor)
    if (s.porApenasOffsetX !== undefined) setPorApenasOffsetX(s.porApenasOffsetX)
    if (s.porApenasOffsetY !== undefined) setPorApenasOffsetY(s.porApenasOffsetY)
    if (s.porApenasRotation !== undefined) setPorApenasRotation(s.porApenasRotation)
    if (s.porApenasScale !== undefined) setPorApenasScale(s.porApenasScale)
    if (s.measuresText !== undefined) setMeasuresText(s.measuresText)
    if (s.measuresFontSize !== undefined) setMeasuresFontSize(s.measuresFontSize)
    if (s.measuresOffsetX !== undefined) setMeasuresOffsetX(s.measuresOffsetX)
    if (s.measuresOffsetY !== undefined) setMeasuresOffsetY(s.measuresOffsetY)
    
    setTimeout(() => {
      isApplyingHistoryRef.current = false
    }, 50)
  }

  const pushToHistory = (s: any) => {
    if (isApplyingHistoryRef.current) return
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    if (nextHistory.length > 0 && JSON.stringify(nextHistory[nextHistory.length - 1]) === JSON.stringify(s)) {
      return
    }
    nextHistory.push(s)
    if (nextHistory.length > 100) nextHistory.shift()
    historyRef.current = nextHistory
    historyIndexRef.current = nextHistory.length - 1
  }

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1
      const prevState = historyRef.current[historyIndexRef.current]
      applyState(prevState)
      toast.success("Desfeito (Ctrl+Z)", { id: "history-toast" })
    } else {
      toast.info("Nada a desfazer", { id: "history-toast" })
    }
  }, [])

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1
      const nextState = historyRef.current[historyIndexRef.current]
      applyState(nextState)
      toast.success("Refeito (Ctrl+Y)", { id: "history-toast" })
    } else {
      toast.info("Nada a refazer", { id: "history-toast" })
    }
  }, [])

  const resetFieldToDefault = (fieldKey: string, defaultValue: any) => {
    // Mapeia chaves de campos para as respectivas funções setter de estado
    const setters: Record<string, (val: any) => void> = {
      brandName: setBrandName,
      brandFontSize: setBrandFontSize,
      brandOffsetX: setBrandOffsetX,
      brandOffsetY: setBrandOffsetY,
      slogan: setSlogan,
      sloganFontSize: setSloganFontSize,
      sloganOffsetX: setSloganOffsetX,
      sloganOffsetY: setSloganOffsetY,
      avatarUrl: setAvatarUrl,
      avatarScale: setAvatarScale,
      avatarOffsetX: setAvatarOffsetX,
      avatarOffsetY: setAvatarOffsetY,
      footerAddressTitle: setFooterAddressTitle,
      footerAddressTitleFontSize: setFooterAddressTitleFontSize,
      footerAddressTitleOffsetX: setFooterAddressTitleOffsetX,
      footerAddressTitleOffsetY: setFooterAddressTitleOffsetY,
      footerAddressText: setFooterAddressText,
      footerAddressTextFontSize: setFooterAddressTextFontSize,
      footerAddressTextOffsetX: setFooterAddressTextOffsetX,
      footerAddressTextOffsetY: setFooterAddressTextOffsetY,
      installmentsText: setInstallmentsText,
      installmentsFontSize: setInstallmentsFontSize,
      installmentsOffsetX: setInstallmentsOffsetX,
      installmentsOffsetY: setInstallmentsOffsetY,
      showSecondaryImage: setShowSecondaryImage,
      showOpportunityBadge: setShowOpportunityBadge,
      oppRotation: setOppRotation,
      oppScale: setOppScale,
      oppOffsetX: setOppOffsetX,
      oppOffsetY: setOppOffsetY,
      customPrice: setCustomPrice,
      customPromoPrice: setCustomPromoPrice,
      mainImageScale: setMainImageScale,
      secondaryImageScale: setSecondaryImageScale,
      mainImageOffsetX: setMainImageOffsetX,
      mainImageOffsetY: setMainImageOffsetY,
      secondaryImageOffsetX: setSecondaryImageOffsetX,
      secondaryImageOffsetY: setSecondaryImageOffsetY,
      mainImageIndex: setMainImageIndex,
      secondaryImageIndex: setSecondaryImageIndex,
      productTitle: setProductTitle,
      productTitleFontSize: setProductTitleFontSize,
      productTitleOffsetX: setProductTitleOffsetX,
      productTitleOffsetY: setProductTitleOffsetY,
      productTitleMaxContainerWidth: setProductTitleMaxContainerWidth,
      productTitleRotation: setProductTitleRotation,
      productTitleScale: setProductTitleScale,
      priceFontSize: setPriceFontSize,
      priceDeFontSize: setPriceDeFontSize,
      priceOffsetX: setPriceOffsetX,
      priceOffsetY: setPriceOffsetY,
      priceRotation: setPriceRotation,
      priceScale: setPriceScale,
      priceDeOffsetX: setPriceDeOffsetX,
      priceDeOffsetY: setPriceDeOffsetY,
      priceDeRotation: setPriceDeRotation,
      priceDeScale: setPriceDeScale,
      porApenasText: setPorApenasText,
      porApenasFontSize: setPorApenasFontSize,
      porApenasColor: setPorApenasColor,
      porApenasOffsetX: setPorApenasOffsetX,
      porApenasOffsetY: setPorApenasOffsetY,
      porApenasRotation: setPorApenasRotation,
      porApenasScale: setPorApenasScale,
      measuresText: setMeasuresText,
      measuresFontSize: setMeasuresFontSize,
      measuresOffsetX: setMeasuresOffsetX,
      measuresOffsetY: setMeasuresOffsetY,
    }

    const setter = setters[fieldKey]
    if (setter) {
      setter(defaultValue)
      toast.success("Valor resetado para o padrão!")
    }
  }

  const renderDefaultPin = (fieldKey: string, currentValue: any, defaultValue: any) => {
    const hasDefaultSet = marketingDefaults && marketingDefaults[fieldKey] !== undefined
    const isDefault = hasDefaultSet && currentValue === marketingDefaults[fieldKey]
    const activeDefaultValue = hasDefaultSet ? marketingDefaults[fieldKey] : defaultValue
    const isAtActiveDefault = currentValue === activeDefaultValue

    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={async () => {
            const newDefaults = { ...marketingDefaults, [fieldKey]: currentValue }
            setMarketingDefaults(newDefaults)
            toast.success("Definido como padrão global!")
            
            // Gravação direta na nuvem imediata para evitar lag e perda de sincronia em novos posts
            try {
              const { data: fbSettings } = await supabase
                .from("facebook_catalog_settings")
                .select("column_mappings")
                .eq("id", true)
                .maybeSingle()
              
              const currentMappings = fbSettings?.column_mappings && typeof fbSettings.column_mappings === "object"
                ? fbSettings.column_mappings
                : {}

              const newMappings = {
                ...currentMappings,
                marketing_defaults: newDefaults
              }

              const { error } = await supabase
                .from("facebook_catalog_settings")
                .upsert({ id: true, column_mappings: newMappings })
              if (error) throw error
            } catch (err: any) {
              console.error("Erro ao salvar padrão global na nuvem:", err)
              toast.error("Falha ao salvar padrão na nuvem.")
            }
          }}
          disabled={isDefault}
          title={isDefault ? "Já é o valor padrão global" : "Definir como padrão global"}
          className={cn(
            "p-1 rounded transition inline-flex items-center justify-center",
            isDefault 
              ? "text-emerald-500 bg-emerald-50 cursor-default" 
              : "text-gray-300 hover:text-emerald-600 hover:bg-gray-100"
          )}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => resetFieldToDefault(fieldKey, activeDefaultValue)}
          disabled={isAtActiveDefault}
          title={isAtActiveDefault ? "Já está no valor padrão" : "Restaurar valor padrão"}
          className={cn(
            "p-1 rounded transition inline-flex items-center justify-center",
            isAtActiveDefault 
              ? "text-gray-200 cursor-default" 
              : "text-gray-300 hover:text-rose-600 hover:bg-gray-100"
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const getComponentFieldsMap = (elementKey: SelectedElement): Record<string, any> => {
    switch (elementKey) {
      case "opportunityBadge":
        return {
          oppScale,
          oppRotation,
          oppOffsetX,
          oppOffsetY,
          showOpportunityBadge
        }
      case "brand":
      case "slogan":
        return {
          brandName,
          brandFontSize,
          brandOffsetX,
          brandOffsetY,
          slogan,
          sloganFontSize,
          sloganOffsetX,
          sloganOffsetY
        }
      case "avatar":
        return {
          avatarUrl,
          avatarScale,
          avatarOffsetX,
          avatarOffsetY
        }
      case "footerTitle":
        return {
          footerAddressTitle,
          footerAddressTitleFontSize,
          footerAddressTitleOffsetX,
          footerAddressTitleOffsetY
        }
      case "footerAddress":
        return {
          footerAddressText,
          footerAddressTextFontSize,
          footerAddressTextOffsetX,
          footerAddressTextOffsetY
        }
      case "title":
        return {
          productTitleFontSize,
          productTitleOffsetX,
          productTitleOffsetY,
          productTitleMaxContainerWidth,
          productTitleRotation,
          productTitleScale
        }
      case "priceDe":
        return {
          priceDeFontSize,
          priceDeOffsetX,
          priceDeOffsetY,
          priceDeRotation,
          priceDeScale
        }
      case "porApenas":
        return {
          porApenasText,
          porApenasFontSize,
          porApenasColor,
          porApenasOffsetX,
          porApenasOffsetY,
          porApenasRotation,
          porApenasScale
        }
      case "pricePor":
        return {
          priceFontSize,
          priceOffsetX,
          priceOffsetY,
          priceRotation,
          priceScale
        }
      case "installments":
        return {
          installmentsText,
          installmentsFontSize,
          installmentsOffsetX,
          installmentsOffsetY
        }
      case "measures":
        return {
          measuresText,
          measuresFontSize,
          measuresOffsetX,
          measuresOffsetY
        }
      case "mainImage":
      case "secondaryImage":
        return {
          mainImageScale,
          secondaryImageScale,
          mainImageOffsetX,
          mainImageOffsetY,
          secondaryImageOffsetX,
          secondaryImageOffsetY,
          mainImageIndex,
          secondaryImageIndex,
          showSecondaryImage
        }
      default:
        return {}
    }
  }

  const isComponentAllDefault = (elementKey: SelectedElement): boolean => {
    if (!elementKey || !marketingDefaults) return false
    const fields = getComponentFieldsMap(elementKey)
    return Object.keys(fields).every(key => fields[key] === marketingDefaults[key])
  }

  const fixComponentFieldsAsDefault = async (elementKey: SelectedElement) => {
    if (!elementKey) return
    const fieldsToSave = getComponentFieldsMap(elementKey)
    if (Object.keys(fieldsToSave).length === 0) return

    const newDefaults = { ...marketingDefaults, ...fieldsToSave }
    setMarketingDefaults(newDefaults)
    
    const toastId = toast.loading("Salvando padrões do componente...")
    try {
      const { data: fbSettings } = await supabase
        .from("facebook_catalog_settings")
        .select("column_mappings")
        .eq("id", true)
        .maybeSingle()
      
      const currentMappings = fbSettings?.column_mappings && typeof fbSettings.column_mappings === "object"
        ? fbSettings.column_mappings
        : {}

      const newMappings = {
        ...currentMappings,
        marketing_defaults: newDefaults
      }

      const { error } = await supabase
        .from("facebook_catalog_settings")
        .upsert({ id: true, column_mappings: newMappings })
      if (error) throw error
      toast.success("Todos os campos do componente foram fixados como padrão!", { id: toastId })
    } catch (err: any) {
      console.error("Erro ao salvar padrões do componente na nuvem:", err)
      toast.error("Falha ao salvar padrões na nuvem.", { id: toastId })
    }
  }

  const renderDualInput = (
    fieldKey: string,
    value: number,
    setValue: (val: number) => void,
    min: number,
    max: number,
    label: string,
    defaultValue: number
  ) => {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <Label className="text-xs font-bold text-gray-700">{label}</Label>
          {renderDefaultPin(fieldKey, value, defaultValue)}
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="range" 
            min={min} 
            max={max} 
            value={value} 
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <Input 
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
            className="w-16 h-8 text-[11px] font-bold text-center shrink-0"
          />
        </div>
      </div>
    )
  }

  // Carrega produtos do Supabase
  useEffect(() => {
    async function fetchProducts() {
      try {
        // Carrega defaults do marketing das configurações de facebook_catalog_settings
        const { data: settingsData } = await supabase
          .from("facebook_catalog_settings")
          .select("column_mappings")
          .eq("id", true)
          .maybeSingle()
        if (settingsData?.column_mappings && typeof settingsData.column_mappings === "object") {
          const mappings = settingsData.column_mappings as any
          const defaults = mappings.marketing_defaults || {}
          
          // Auto-recuperação: remove a chave de texto estático do título (productTitle) se existir no padrão global
          if (defaults.productTitle !== undefined) {
            delete defaults.productTitle
            const newMappings = {
              ...mappings,
              marketing_defaults: defaults
            }
            await supabase
              .from("facebook_catalog_settings")
              .upsert({ id: true, column_mappings: newMappings })
          }
          
          setMarketingDefaults(defaults)
        } else {
          setMarketingDefaults({})
        }

        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            price,
            promo_price,
            product_images(image_url, is_main),
            opportunities(name, badge_color, border_color),
            technical_specs,
            width,
            depth,
            height
          `)
          .is("deleted_at", null)
          .eq("status", "published")
          .order("name")

        if (error) throw error
        
        const formatted = (data || []).map((p: any) => ({
          ...p,
          product_images: p.product_images || [],
          opportunities: p.opportunities || null
        }))

        setProducts(formatted)
        
        let initialProductId = ""
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search)
          const queryId = params.get("productId")
          if (queryId && formatted.some((p: any) => p.id === queryId)) {
            initialProductId = queryId
          }
        }

        if (initialProductId) {
          setSelectedProductId(initialProductId)
        }
        // Nenhum produto selecionado por padrão — usuário deve buscar e selecionar
      } catch (err: any) {
        console.error(err)
        toast.error("Erro ao carregar produtos do banco de dados: " + err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  // Os padrões de marketing agora são salvos imediatamente no clique do botão verde de Pin (evitando loops e lags de debounce)

  const activeProduct = products.find(p => p.id === selectedProductId)

  // Reseta os estados de imagem ao mudar de produto selecionado
  useEffect(() => {
    if (activeProduct) {
      const imagesCount = activeProduct.product_images?.length || 0
      const d = marketingDefaults
      
      const defaultMain = d?.mainImageIndex !== undefined && d.mainImageIndex < imagesCount ? d.mainImageIndex : 0
      const defaultSec = d?.secondaryImageIndex !== undefined && d.secondaryImageIndex < imagesCount ? d.secondaryImageIndex : (imagesCount > 1 ? 1 : 0)
      
      setMainImageIndex(defaultMain)
      setSecondaryImageIndex(defaultSec)
    } else {
      setMainImageIndex(0)
      setSecondaryImageIndex(1)
    }
    setActivePostId(null)
    setIsModalOpen(false)
  }, [selectedProductId])

  // Debouncer para capturar snapshots de histórico de alterações
  useEffect(() => {
    if (!isModalOpen || !activeProduct) {
      historyRef.current = []
      historyIndexRef.current = -1
      return
    }
    const timer = setTimeout(() => {
      pushToHistory(getCurrentState())
    }, 350)
    return () => clearTimeout(timer)
  }, [
    isModalOpen, activeProduct, brandName, brandFontSize, brandOffsetX, brandOffsetY,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, footerAddressTitle, footerAddressText,
    installmentsText, showSecondaryImage, showOpportunityBadge,
    oppRotation, oppScale, oppOffsetX, oppOffsetY,
    customPrice, customPromoPrice,
    mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY,
    secondaryImageOffsetX, secondaryImageOffsetY,
    mainImageIndex, secondaryImageIndex,
    getCurrentState
  ])

  // Escuta atalhos de teclado Ctrl+Z e Ctrl+Y
  useEffect(() => {
    if (!isModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === 'z'
      const isY = e.key.toLowerCase() === 'y'
      
      if ((e.ctrlKey || e.metaKey) && isZ) {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if ((e.ctrlKey || e.metaKey) && isY) {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, handleUndo, handleRedo])

  // Autosave do Post ativo
  useEffect(() => {
    if (!isModalOpen || !activeProduct) return
    
    setSaveStatus("idle")
    
    const delayDebounce = setTimeout(async () => {
      setSaveStatus("saving")
      try {
        const canvas = canvasRef.current
        if (!canvas) throw new Error("Canvas não inicializado")
        await drawBannerAsync(canvas, true)
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setSaveStatus("error")
            return
          }
          
          const postUniqueId = activePostId || Date.now().toString()
          const fileName = `post-${activeProduct.id}-${postUniqueId}.png`
          try {
            const file = new File([blob], fileName, { type: "image/png" })
            const fileUrl = await uploadToR2(file, `marketing-posts/${fileName}`)
            
            const currentSpecs = activeProduct.technical_specs || {}
            const currentPosts = Array.isArray((currentSpecs as any).posts) ? (currentSpecs as any).posts : []
            const nowISO = new Date().toISOString()
            
            const newPostData = {
              id: postUniqueId,
              imageUrl: fileUrl,
              createdAt: activePostId ? (currentPosts.find((p: any) => p.id === activePostId)?.createdAt || nowISO) : nowISO,
              updatedAt: nowISO,
              settings: {
                brandName, brandFontSize, brandOffsetX, brandOffsetY,
                slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
                avatarUrl, footerAddressTitle, footerAddressText,
                installmentsText, showSecondaryImage, showOpportunityBadge,
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
              }
            }
            
            const updatedPosts = activePostId
              ? currentPosts.map((p: any) => p.id === activePostId ? newPostData : p)
              : [newPostData, ...currentPosts]
              
            const updatedSpecs = {
              ...(typeof currentSpecs === 'object' ? currentSpecs : {}),
              posts: updatedPosts,
              marketing_banner_url: fileUrl
            }
            
            const { error } = await supabase
              .from("products")
              .update({ technical_specs: updatedSpecs })
              .eq("id", activeProduct.id)
              
            if (error) throw error
            
            setProducts(prev => prev.map(p => p.id === activeProduct.id ? { ...p, technical_specs: updatedSpecs } : p))
            
            if (!activePostId) {
              setActivePostId(postUniqueId)
            }
            
            setSaveStatus("saved")
          } catch (err) {
            console.error("Erro no autosave:", err)
            setSaveStatus("error")
          }
        }, "image/png")
      } catch (err) {
        console.error(err)
        setSaveStatus("error")
      }
    }, 1500)
    
    return () => clearTimeout(delayDebounce)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isModalOpen, brandName, brandFontSize, brandOffsetX, brandOffsetY,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    avatarUrl, footerAddressTitle, footerAddressText,
    installmentsText, showSecondaryImage, showOpportunityBadge,
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
  ])

  // Filtra produtos pela pesquisa
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const postsList = useMemo(() => {
    if (!activeProduct || !activeProduct.technical_specs) return []
    const specs = activeProduct.technical_specs
    return Array.isArray(specs.posts) ? specs.posts : []
  }, [activeProduct])

  const handleEditPost = (post: any) => {
    setActivePostId(post.id)
    const s = post.settings || {}
    setBrandName(s.brandName || marketingDefaults?.brandName || "MÓVEIS MORANTE")
    setBrandFontSize(s.brandFontSize ?? marketingDefaults?.brandFontSize ?? 42)
    setBrandOffsetX(s.brandOffsetX ?? marketingDefaults?.brandOffsetX ?? 120)
    setBrandOffsetY(s.brandOffsetY ?? marketingDefaults?.brandOffsetY ?? 82)
    setSlogan(s.slogan || marketingDefaults?.slogan || "Qualidade que cabe no seu bolso")
    setSloganFontSize(s.sloganFontSize ?? marketingDefaults?.sloganFontSize ?? 20)
    setSloganOffsetX(s.sloganOffsetX ?? marketingDefaults?.sloganOffsetX ?? 120)
    setSloganOffsetY(s.sloganOffsetY ?? marketingDefaults?.sloganOffsetY ?? 130)
    setAvatarUrl(s.avatarUrl || marketingDefaults?.avatarUrl || "/images/avatar-morante.png")
    setAvatarScale(s.avatarScale ?? marketingDefaults?.avatarScale ?? 100)
    setAvatarOffsetX(s.avatarOffsetX ?? marketingDefaults?.avatarOffsetX ?? 35)
    setAvatarOffsetY(s.avatarOffsetY ?? marketingDefaults?.avatarOffsetY ?? 938)
    setFooterAddressTitle(s.footerAddressTitle || marketingDefaults?.footerAddressTitle || "VISITE NOSSA LOJA NO ENDEREÇO")
    setFooterAddressTitleFontSize(s.footerAddressTitleFontSize ?? marketingDefaults?.footerAddressTitleFontSize ?? 24)
    setFooterAddressTitleOffsetX(s.footerAddressTitleOffsetX ?? marketingDefaults?.footerAddressTitleOffsetX ?? 175)
    setFooterAddressTitleOffsetY(s.footerAddressTitleOffsetY ?? marketingDefaults?.footerAddressTitleOffsetY ?? 988)
    setFooterAddressText(s.footerAddressText || marketingDefaults?.footerAddressText || "RUA CASCAVEL, 306, GUARAITUBA, COLOMBO")
    setFooterAddressTextFontSize(s.footerAddressTextFontSize ?? marketingDefaults?.footerAddressTextFontSize ?? 28)
    setFooterAddressTextOffsetX(s.footerAddressTextOffsetX ?? marketingDefaults?.footerAddressTextOffsetX ?? 175)
    setFooterAddressTextOffsetY(s.footerAddressTextOffsetY ?? marketingDefaults?.footerAddressTextOffsetY ?? 1032)
    setInstallmentsText(s.installmentsText || "Em até 10x sem juros nas principais bandeiras de cartão")
    setInstallmentsFontSize(s.installmentsFontSize ?? marketingDefaults?.installmentsFontSize ?? 26)
    setInstallmentsOffsetX(s.installmentsOffsetX ?? marketingDefaults?.installmentsOffsetX ?? 540)
    setInstallmentsOffsetY(s.installmentsOffsetY ?? marketingDefaults?.installmentsOffsetY ?? 895)
    setShowSecondaryImage(s.showSecondaryImage ?? marketingDefaults?.showSecondaryImage ?? true)
    setShowOpportunityBadge(s.showOpportunityBadge ?? marketingDefaults?.showOpportunityBadge ?? true)
    setOppRotation(s.oppRotation ?? marketingDefaults?.oppRotation ?? 0)
    setOppScale(s.oppScale ?? marketingDefaults?.oppScale ?? 100)
    setOppOffsetX(s.oppOffsetX ?? marketingDefaults?.oppOffsetX ?? 50)
    setOppOffsetY(s.oppOffsetY ?? marketingDefaults?.oppOffsetY ?? 220)
    setCustomPrice(s.customPrice || "")
    setCustomPromoPrice(s.customPromoPrice || "")
    setMainImageScale(s.mainImageScale ?? marketingDefaults?.mainImageScale ?? 100)
    setSecondaryImageScale(s.secondaryImageScale ?? marketingDefaults?.secondaryImageScale ?? 100)
    setMainImageOffsetX(s.mainImageOffsetX ?? marketingDefaults?.mainImageOffsetX ?? 0)
    setMainImageOffsetY(s.mainImageOffsetY ?? marketingDefaults?.mainImageOffsetY ?? 0)
    setSecondaryImageOffsetX(s.secondaryImageOffsetX ?? marketingDefaults?.secondaryImageOffsetX ?? 0)
    setSecondaryImageOffsetY(s.secondaryImageOffsetY ?? marketingDefaults?.secondaryImageOffsetY ?? 0)
    setMainImageIndex(s.mainImageIndex ?? marketingDefaults?.mainImageIndex ?? 0)
    setSecondaryImageIndex(s.secondaryImageIndex ?? marketingDefaults?.secondaryImageIndex ?? 1)

    setProductTitle(s.productTitle || activeProduct?.name || "")
    setProductTitleFontSize(s.productTitleFontSize ?? marketingDefaults?.productTitleFontSize ?? 30)
    setProductTitleOffsetX(s.productTitleOffsetX ?? marketingDefaults?.productTitleOffsetX ?? 570)
    setProductTitleOffsetY(s.productTitleOffsetY ?? marketingDefaults?.productTitleOffsetY ?? 660)
    setProductTitleMaxContainerWidth(s.productTitleMaxContainerWidth ?? marketingDefaults?.productTitleMaxContainerWidth ?? 430)
    setProductTitleRotation(s.productTitleRotation ?? marketingDefaults?.productTitleRotation ?? 0)
    setProductTitleScale(s.productTitleScale ?? marketingDefaults?.productTitleScale ?? 100)

    setPriceFontSize(s.priceFontSize ?? marketingDefaults?.priceFontSize ?? 48)
    setPriceDeFontSize(s.priceDeFontSize ?? marketingDefaults?.priceDeFontSize ?? 20)
    setPriceOffsetX(s.priceOffsetX ?? marketingDefaults?.priceOffsetX ?? 570)
    setPriceOffsetY(s.priceOffsetY ?? marketingDefaults?.priceOffsetY ?? 730)
    setPriceRotation(s.priceRotation ?? marketingDefaults?.priceRotation ?? 0)
    setPriceScale(s.priceScale ?? marketingDefaults?.priceScale ?? 100)

    setPriceDeOffsetX(s.priceDeOffsetX ?? marketingDefaults?.priceDeOffsetX ?? 570)
    setPriceDeOffsetY(s.priceDeOffsetY ?? marketingDefaults?.priceDeOffsetY ?? 610)
    setPriceDeRotation(s.priceDeRotation ?? marketingDefaults?.priceDeRotation ?? 0)
    setPriceDeScale(s.priceDeScale ?? marketingDefaults?.priceDeScale ?? 100)

    setPorApenasText(s.porApenasText || marketingDefaults?.porApenasText || "POR APENAS")
    setPorApenasFontSize(s.porApenasFontSize ?? marketingDefaults?.porApenasFontSize ?? 16)
    setPorApenasColor(s.porApenasColor || marketingDefaults?.porApenasColor || "#e0a96d")
    setPorApenasOffsetX(s.porApenasOffsetX ?? marketingDefaults?.porApenasOffsetX ?? 570)
    setPorApenasOffsetY(s.porApenasOffsetY ?? marketingDefaults?.porApenasOffsetY ?? 635)
    setPorApenasRotation(s.porApenasRotation ?? marketingDefaults?.porApenasRotation ?? 0)
    setPorApenasScale(s.porApenasScale ?? marketingDefaults?.porApenasScale ?? 100)

    setMeasuresText(s.measuresText || "")
    setMeasuresFontSize(s.measuresFontSize ?? marketingDefaults?.measuresFontSize ?? 20)
    setMeasuresOffsetX(s.measuresOffsetX ?? marketingDefaults?.measuresOffsetX ?? 785)
    setMeasuresOffsetY(s.measuresOffsetY ?? marketingDefaults?.measuresOffsetY ?? 610)

    // Atualiza também a imagem de capa de marketing principal do produto com o post selecionado
    if (activeProduct) {
      const currentSpecs = activeProduct.technical_specs || {}
      const updatedSpecs = {
        ...(typeof currentSpecs === 'object' ? currentSpecs : {}),
        marketing_banner_url: post.imageUrl
      }

      supabase
        .from("products")
        .update({ technical_specs: updatedSpecs })
        .eq("id", activeProduct.id)
        .then(({ error }) => {
          if (!error) {
            setProducts(prev => prev.map(p => p.id === activeProduct.id ? { ...p, technical_specs: updatedSpecs } : p))
          }
        })
    }

    setIsModalOpen(true)
    toast.info("Configurações do post carregadas no editor!")
  }
  const handleNewPost = () => {
    const d = marketingDefaults
    setActivePostId(null)
    setBrandName(d?.brandName || "MÓVEIS MORANTE")
    setBrandFontSize(d?.brandFontSize ?? 42)
    setBrandOffsetX(d?.brandOffsetX ?? 120)
    setBrandOffsetY(d?.brandOffsetY ?? 82)
    setSlogan(d?.slogan || "Qualidade que cabe no seu bolso")
    setSloganFontSize(d?.sloganFontSize ?? 20)
    setSloganOffsetX(d?.sloganOffsetX ?? 120)
    setSloganOffsetY(d?.sloganOffsetY ?? 130)
    setAvatarUrl(d?.avatarUrl || "/images/avatar-morante.png")
    setAvatarScale(d?.avatarScale ?? 100)
    setAvatarOffsetX(d?.avatarOffsetX ?? 35)
    setAvatarOffsetY(d?.avatarOffsetY ?? 938)
    setFooterAddressTitle(d?.footerAddressTitle || "VISITE NOSSA LOJA NO ENDEREÇO")
    setFooterAddressTitleFontSize(d?.footerAddressTitleFontSize ?? 24)
    setFooterAddressTitleOffsetX(d?.footerAddressTitleOffsetX ?? 175)
    setFooterAddressTitleOffsetY(d?.footerAddressTitleOffsetY ?? 988)
    setFooterAddressText(d?.footerAddressText || "RUA CASCAVEL, 306, GUARAITUBA, COLOMBO")
    setFooterAddressTextFontSize(d?.footerAddressTextFontSize ?? 28)
    setFooterAddressTextOffsetX(d?.footerAddressTextOffsetX ?? 175)
    setFooterAddressTextOffsetY(d?.footerAddressTextOffsetY ?? 1032)
    setInstallmentsText(d?.installmentsText || "Em até 10x sem juros nas principais bandeiras de cartão")
    setInstallmentsFontSize(d?.installmentsFontSize ?? 26)
    setInstallmentsOffsetX(d?.installmentsOffsetX ?? 540)
    setInstallmentsOffsetY(d?.installmentsOffsetY ?? 895)
    setShowSecondaryImage(d?.showSecondaryImage !== false)
    setShowOpportunityBadge(d?.showOpportunityBadge !== false)
    setOppRotation(d?.oppRotation ?? 0)
    setOppScale(d?.oppScale ?? 100)
    setOppOffsetX(d?.oppOffsetX ?? 50)
    setOppOffsetY(d?.oppOffsetY ?? 220)
    setCustomPrice("")
    setCustomPromoPrice("")
    setMainImageScale(d?.mainImageScale ?? 100)
    setSecondaryImageScale(d?.secondaryImageScale ?? 100)
    setMainImageOffsetX(d?.mainImageOffsetX ?? 0)
    setMainImageOffsetY(d?.mainImageOffsetY ?? 0)
    setSecondaryImageOffsetX(d?.secondaryImageOffsetX ?? 0)
    setSecondaryImageOffsetY(d?.secondaryImageOffsetY ?? 0)
    setMainImageIndex(d?.mainImageIndex ?? 0)
    setSecondaryImageIndex(d?.secondaryImageIndex ?? 1)

    setProductTitle(d?.productTitle || activeProduct?.name || "")
    setProductTitleFontSize(d?.productTitleFontSize ?? 30)
    setProductTitleOffsetX(d?.productTitleOffsetX ?? 570)
    setProductTitleOffsetY(d?.productTitleOffsetY ?? 660)
    setProductTitleMaxContainerWidth(d?.productTitleMaxContainerWidth ?? 430)
    setProductTitleRotation(d?.productTitleRotation ?? 0)
    setProductTitleScale(d?.productTitleScale ?? 100)

    setPriceFontSize(d?.priceFontSize ?? 48)
    setPriceDeFontSize(d?.priceDeFontSize ?? 20)
    setPriceOffsetX(d?.priceOffsetX ?? 570)
    setPriceOffsetY(d?.priceOffsetY ?? 730)
    setPriceRotation(d?.priceRotation ?? 0)
    setPriceScale(d?.priceScale ?? 100)

    setPriceDeOffsetX(d?.priceDeOffsetX ?? 570)
    setPriceDeOffsetY(d?.priceDeOffsetY ?? 610)
    setPriceDeRotation(d?.priceDeRotation ?? 0)
    setPriceDeScale(d?.priceDeScale ?? 100)

    setPorApenasText(d?.porApenasText || "POR APENAS")
    setPorApenasFontSize(d?.porApenasFontSize ?? 16)
    setPorApenasColor(d?.porApenasColor || "#e0a96d")
    setPorApenasOffsetX(d?.porApenasOffsetX ?? 570)
    setPorApenasOffsetY(d?.porApenasOffsetY ?? 635)
    setPorApenasRotation(d?.porApenasRotation ?? 0)
    setPorApenasScale(d?.porApenasScale ?? 100)

    setMeasuresText(d?.measuresText || "")
    setMeasuresFontSize(d?.measuresFontSize ?? 20)
    setMeasuresOffsetX(d?.measuresOffsetX ?? 785)
    setMeasuresOffsetY(d?.measuresOffsetY ?? 610)

    setIsModalOpen(true)
    toast.success("Editor aberto com as configurações padrão!")
  }

  const handleDeletePost = async (postId: string) => {
    if (!activeProduct) return
    const toastId = toast.loading("Excluindo post...")
    try {
      const currentSpecs = activeProduct.technical_specs || {}
      const currentPosts = Array.isArray((currentSpecs as any).posts) ? (currentSpecs as any).posts : []
      const updatedPosts = currentPosts.filter((p: any) => p.id !== postId)
      
      const updatedSpecs = {
        ...(typeof currentSpecs === 'object' ? currentSpecs : {}),
        posts: updatedPosts
      }

      const { error } = await supabase
        .from("products")
        .update({ technical_specs: updatedSpecs })
        .eq("id", activeProduct.id)

      if (error) throw error

      setProducts(prev => prev.map(p => {
        if (p.id === activeProduct.id) {
          return { ...p, technical_specs: updatedSpecs }
        }
        return p
      }))

      if (activePostId === postId) {
        handleNewPost()
      }

      toast.success("Post excluído com sucesso!", { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao excluir post: " + err.message, { id: toastId })
    }
  }

  // Formata os preços a exibir
  const displayPrice = activeProduct 
    ? (customPromoPrice ? parseFloat(customPromoPrice) : (customPrice ? parseFloat(customPrice) : (activeProduct.promo_price || activeProduct.price))) 
    : 0

  const originalPrice = activeProduct 
    ? (customPrice ? parseFloat(customPrice) : activeProduct.price) 
    : 0

  const isPromo = activeProduct 
    ? (customPromoPrice ? true : (customPrice ? false : !!activeProduct.promo_price)) 
    : false

  // Desenha um retângulo com bordas arredondadas (sem depender de ctx.roundRect que não existe em todos os browsers)
  const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }

  // Função de desenho compartilhada entre preview e download
  // Desenho 100% síncrono do banner, sem NENHUM await ou promise, para rodar na mesma thread e eliminar lag
  const drawBannerSync = (
    canvas: HTMLCanvasElement,
    loadedImages: {
      headerBg: HTMLImageElement | null
      logo: HTMLImageElement | null
      mainImg: HTMLImageElement | null
      secImg: HTMLImageElement | null
    },
    isExport = false
  ) => {
    try {
      if (!activeProduct) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const S = canvas.width / 1080 // fator de escala (1 para 1080px, 420/1080 para preview)

      // Reseta as regiões renderizadas para recalcular as hitboxes neste frame
      renderedRegionsRef.current = {}
      const reg = renderedRegionsRef.current

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const { headerBg, logo, mainImg, secImg } = loadedImages

      // Criar listas de desenho assíncronas para desenhar na ordem z-index correta:
      // 1. Imagens e corpos (z-index baixo)
      // 2. Cabeçalho e Rodapé (devem sobrepor as fotos se elas vazarem/tiverem zoom)

      // Imagem principal (lado esquerdo - ocupa toda a altura do corpo, de y=220 a y=880)
      if (mainImg) {
        const box = getBoundingBox(mainImg)
        const zoomFactor = mainImageScale === 100 ? 1.05 : (mainImageScale / 100)
        // Altura livre do corpo = 880 - 220 = 660px
        const dw_max = 440 * S
        const dh_max = 660 * S
        const sc = Math.min(dw_max / box.w, dh_max / box.h) * zoomFactor
        const dw = box.w * sc, dh = box.h * sc
        const dx = (50 + (440 - dw / S) / 2) * S + mainImageOffsetX * S
        const dy = (220 + (660 - dh / S) / 2) * S + mainImageOffsetY * S
        ctx.drawImage(mainImg, box.x, box.y, box.w, box.h, dx, dy, dw, dh)
        // Registra hitbox exata da imagem principal (em unidades 1080px)
        reg['mainImage'] = { key: 'mainImage', label: 'Foto Principal', x: dx / S, y: dy / S, w: dw / S, h: dh / S }
      } else {
        reg['mainImage'] = { key: 'mainImage', label: 'Foto Principal', x: 50, y: 220, w: 440, h: 660 }
      }

      // Imagem secundária (lado direito - no topo, de y=220 a y=580)
      if (secImg && showSecondaryImage) {
        const box = getBoundingBox(secImg)
        const zoomFactor = secondaryImageScale === 100 ? 0.95 : (secondaryImageScale / 100)
        const dw_max = 430 * S
        const dh_max = 360 * S
        const sc = Math.min(dw_max / box.w, dh_max / box.h) * zoomFactor
        const dw = box.w * sc, dh = box.h * sc
        const dx = (570 + (430 - dw / S) / 2) * S + secondaryImageOffsetX * S
        const dy = (220 + (360 - dh / S) / 2) * S + secondaryImageOffsetY * S
        ctx.drawImage(secImg, box.x, box.y, box.w, box.h, dx, dy, dw, dh)
        // Registra hitbox exata da imagem secundária
        reg['secondaryImage'] = { key: 'secondaryImage', label: 'Foto Secundária', x: dx / S, y: dy / S, w: dw / S, h: dh / S }
      }

      // Medidas sob a segunda imagem (alinhadas com a coluna direita agora centralizada em x=785)
      const hasMeasures = activeProduct.width || activeProduct.depth || activeProduct.height || measuresText
      if (showSecondaryImage && secImg && hasMeasures) {
        const finalMeasuresText = measuresText || `${activeProduct.width || "?"}x${activeProduct.depth || "?"}x${activeProduct.height || "?"} ( larg x prof x alt )`
        const mFS = measuresFontSize || 20
        const mX = measuresOffsetX ?? 785
        const mY = measuresOffsetY ?? 610
        ctx.fillStyle = "#4b5563"
        ctx.font = `bold ${mFS * S}px 'Segoe UI', Arial, sans-serif`
        ctx.textAlign = "center"
        ctx.fillText(finalMeasuresText, mX * S, mY * S)
        ctx.textAlign = "left"
        // Registra hitbox exata das medidas (texto centralizado)
        const measTxtW = ctx.measureText(finalMeasuresText).width / S
        reg['measures'] = { key: 'measures', label: 'Medidas', x: mX - measTxtW / 2, y: mY - mFS, w: measTxtW, h: mFS + 8 }
      }

      // 1. TÍTULO DO PRODUTO (Elemento Separado)
      const tX = productTitleOffsetX ?? 570
      const tY = productTitleOffsetY ?? 660
      const tFS = productTitleFontSize ?? 30
      const finalTitle = productTitle || activeProduct.name
      const maxContainerWidth = (productTitleMaxContainerWidth || 430) * S
      
      ctx.save()
      ctx.translate(tX * S, tY * S)
      ctx.rotate((productTitleRotation * Math.PI) / 180)
      const titleScaleFactor = (productTitleScale / 100)
      ctx.scale(titleScaleFactor, titleScaleFactor)
      
      ctx.fillStyle = "#111827"
      ctx.font = `bold ${tFS * S}px 'Segoe UI', Arial, sans-serif`
      
      const words = finalTitle.split(" ")
      let line = ""
      let currentY = 0
      let titleMaxW = 0
      const titleLines: string[] = []
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " "
        if (ctx.measureText(testLine).width > maxContainerWidth && n > 0) {
          const lineW = ctx.measureText(line).width
          if (lineW > titleMaxW) titleMaxW = lineW
          titleLines.push(line)
          line = words[n] + " "
        } else {
          line = testLine
        }
      }
      const lastLineW = ctx.measureText(line).width
      if (lastLineW > titleMaxW) titleMaxW = lastLineW
      titleLines.push(line)

      titleLines.forEach((textLine, idx) => {
        ctx.fillText(textLine, 0, currentY)
        if (idx < titleLines.length - 1) {
          currentY += (tFS + 6) * S
        }
      })
      ctx.restore()

      // Registrar hitbox do título
      const titleHeightWorld = (currentY / S + tFS) * titleScaleFactor
      const titleWidthWorld = (titleMaxW / S) * titleScaleFactor
      reg['title'] = { 
        key: 'title', 
        label: 'Título do Produto', 
        x: tX - 6, 
        y: tY - tFS - 4, 
        w: titleWidthWorld + 12, 
        h: titleHeightWorld + 12 
      }

      // 2. PREÇO ANTIGO "DE" (Elemento Separado)
      if (isPromo) {
        const deText = `De: ${(originalPrice || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
        const deFS = priceDeFontSize || 20
        const deX = priceDeOffsetX ?? 570
        const deY = priceDeOffsetY ?? 610
        
        ctx.save()
        ctx.translate(deX * S, deY * S)
        ctx.rotate((priceDeRotation * Math.PI) / 180)
        const deScaleFactor = (priceDeScale / 100)
        ctx.scale(deScaleFactor, deScaleFactor)
        
        ctx.font = `bold ${deFS * S}px 'Segoe UI', Arial, sans-serif`
        ctx.fillStyle = "#ef4444"
        ctx.fillText(deText, 0, 0)
        
        // Riscado no preço antigo
        const deTextW = ctx.measureText(deText).width
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 2 * S
        ctx.beginPath()
        ctx.moveTo(0, -deFS * S * 0.3)
        ctx.lineTo(deTextW, -deFS * S * 0.3)
        ctx.stroke()
        
        ctx.restore()

        const deWidthWorld = (deTextW / S) * deScaleFactor
        const deHeightWorld = deFS * deScaleFactor
        reg['priceDe'] = {
          key: 'priceDe',
          label: 'Preço Original (De)',
          x: deX - 6,
          y: deY - deFS - 4,
          w: deWidthWorld + 12,
          h: deHeightWorld + 12
        }
      }

      // 3. RÓTULO "POR APENAS" (Elemento Separado)
      if (isPromo) {
        const paText = porApenasText || "POR APENAS"
        const paFS = porApenasFontSize || 16
        const paColor = porApenasColor || "#e0a96d"
        const paX = porApenasOffsetX ?? 570
        const paY = porApenasOffsetY ?? 635
        
        ctx.save()
        ctx.translate(paX * S, paY * S)
        ctx.rotate((porApenasRotation * Math.PI) / 180)
        const paScaleFactor = (porApenasScale / 100)
        ctx.scale(paScaleFactor, paScaleFactor)
        
        ctx.fillStyle = paColor
        ctx.font = `900 ${paFS * S}px 'Segoe UI', Arial, sans-serif`
        ctx.fillText(paText, 0, 0)
        
        const paTextW = ctx.measureText(paText).width
        ctx.restore()

        const paWidthWorld = (paTextW / S) * paScaleFactor
        const paHeightWorld = paFS * paScaleFactor
        reg['porApenas'] = {
          key: 'porApenas',
          label: 'Rótulo "Por Apenas"',
          x: paX - 6,
          y: paY - paFS - 4,
          w: paWidthWorld + 12,
          h: paHeightWorld + 12
        }
      }

      // 4. PREÇO PROMOCIONAL "POR" / NOVO (Elemento Separado)
      const pFS = priceFontSize || 48
      const pX = priceOffsetX ?? 570
      const pY = priceOffsetY ?? 730
      const priceStr = (displayPrice || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

      ctx.save()
      ctx.translate(pX * S, pY * S)
      ctx.rotate((priceRotation * Math.PI) / 180)
      const pScaleFactor = (priceScale / 100)
      ctx.scale(pScaleFactor, pScaleFactor)

      ctx.fillStyle = "#000000"
      ctx.font = `900 ${pFS * S}px 'Segoe UI', Arial, sans-serif`
      ctx.fillText(priceStr, 0, 0)
      
      const priceStrW = ctx.measureText(priceStr).width
      ctx.restore()

      const pWidthWorld = (priceStrW / S) * pScaleFactor
      const pHeightWorld = pFS * pScaleFactor
      reg['pricePor'] = {
        key: 'pricePor',
        label: 'Preço Promocional (Por)',
        x: pX - 6,
        y: pY - pFS - 4,
        w: pWidthWorld + 12,
        h: pHeightWorld + 12
      }

      // Parcelamento
      const instFontSz = installmentsFontSize || 26
      const instX = installmentsOffsetX ?? 540
      const instY = installmentsOffsetY ?? 895
      ctx.fillStyle = "#1f2937"
      ctx.font = `bold ${instFontSz * S}px 'Segoe UI', Arial, sans-serif`
      ctx.textAlign = instX === 540 ? "center" : "left"
      const instStr = installmentsText || ""
      ctx.fillText(instStr, instX * S, instY * S)
      // Registra hitbox exata do parcelamento
      const instTxtW = ctx.measureText(instStr).width / S
      const instStartX = instX === 540 ? instX - instTxtW / 2 : instX
      reg['installments'] = { key: 'installments', label: 'Parcelamento', x: instStartX - 6, y: instY - instFontSz - 4, w: instTxtW + 12, h: instFontSz + 12 }

      // Cabeçalho (Desenhar por cima do corpo/imagens para sobrepor)
      // 1. Preenchimento base azul escuro para garantir que a lateral esquerda seja sempre preenchida
      ctx.fillStyle = "#0c1523"
      ctx.fillRect(0, 0, 1080 * S, 200 * S)

      if (headerBg) {
        // A imagem do casal de fundo do cabeçalho deve ocupar exatamente 70% da largura do banner
        const tW = 1080 * 0.70 * S
        const tH = 200 * S
        const tX = 1080 * S - tW
        
        // Desenha a imagem preservando a proporção de aspecto, fazendo-a preencher toda a largura do container
        // O container tem largura tW e altura tH. Vamos fazer a imagem preencher tW de largura.
        // O aspecto de escala é definido por tW / headerBg.width.
        const sc = tW / (headerBg.width * S)
        const srcW = headerBg.width
        const srcH = tH / (sc * S) // Altura correspondente no frame de origem
        
        // Se a altura extrapolada for menor que a altura da imagem, centralizamos verticalmente
        const srcY = Math.max(0, (headerBg.height - srcH) / 2)
        
        ctx.drawImage(headerBg, 0, srcY, srcW, srcH, tX, 0, tW, tH)
      }
        
      // Criar um degradê cobrindo do meio para a esquerda, garantindo a transição suave
      // Isso deve ficar fora do 'if (headerBg)' para ser desenhado sempre
      const headerGrad = ctx.createLinearGradient(0, 0, 1080 * S, 0)
      headerGrad.addColorStop(0, "rgba(12, 21, 35, 1)")
      headerGrad.addColorStop(0.35, "rgba(12, 21, 35, 1)")
      headerGrad.addColorStop(0.65, "rgba(12, 21, 35, 0.4)")
      headerGrad.addColorStop(1, "rgba(12, 21, 35, 0)")
      ctx.fillStyle = headerGrad
      ctx.fillRect(0, 0, 1080 * S, 200 * S)

      // Textos do cabeçalho da marca (dinâmico e ajustável)
      const brandNameStr = brandName || "MÓVEIS MORANTE"
      const brandSize = brandFontSize || 42
      const brandX = brandOffsetX ?? 120
      const brandY = brandOffsetY ?? 82
 
      ctx.font = `italic bold ${brandSize * S}px 'Segoe UI', Arial, sans-serif`
      ctx.fillStyle = "#ffffff"
 
      // Se a marca começa com MÓVEIS MORANTE, vamos pintar o "MÓVEIS" de branco e "MORANTE" de dourado.
      if (brandNameStr.toUpperCase().startsWith("MÓVEIS MORANTE")) {
        const p1 = "MÓVEIS "
        const p2 = brandNameStr.substring(7)
        ctx.fillText(p1, brandX * S, brandY * S)
        const p1W = ctx.measureText(p1).width
        ctx.fillStyle = "#e0a96d"
        ctx.fillText(p2, brandX * S + p1W, brandY * S)
        // Hitbox da marca completa
        const brandTotalW = (p1W + ctx.measureText(p2).width) / S
        reg['brand'] = { key: 'brand', label: 'Marca', x: brandX - 6, y: brandY - brandSize - 4, w: brandTotalW + 12, h: brandSize + 12 }
      } else {
        ctx.fillText(brandNameStr, brandX * S, brandY * S)
        const brandTxtW = ctx.measureText(brandNameStr).width / S
        reg['brand'] = { key: 'brand', label: 'Marca', x: brandX - 6, y: brandY - brandSize - 4, w: brandTxtW + 12, h: brandSize + 12 }
      }
 
      // Linha separadora dourada (posicionada em relação ao Y da marca)
      ctx.strokeStyle = "#e0a96d"
      ctx.lineWidth = 3 * S
      ctx.beginPath()
      ctx.moveTo(brandX * S, (brandY + 11) * S)
      ctx.lineTo((brandX + 320) * S, (brandY + 11) * S)
      ctx.stroke()
 
      // Subtítulo slogan dinâmico e ajustável
      const sloganText = slogan || "Qualidade que cabe no seu bolso"
      const sloganSize = sloganFontSize || 20
      const sloganX = sloganOffsetX ?? 120
      const sloganY = sloganOffsetY ?? 130

      ctx.fillStyle = "rgba(243, 244, 246, 0.85)"
      ctx.font = `${sloganSize * S}px 'Segoe UI', Arial, sans-serif`
      ctx.fillText(sloganText, sloganX * S, sloganY * S)
      // Hitbox do slogan
      const sloganTxtW = ctx.measureText(sloganText).width / S
      reg['slogan'] = { key: 'slogan', label: 'Slogan', x: sloganX - 6, y: sloganY - sloganSize - 4, w: sloganTxtW + 12, h: sloganSize + 12 }

      // Rodapé (Desenhar por cima do corpo/imagens para sobrepor)
      ctx.fillStyle = "#0d1b2a"
      ctx.fillRect(0, 930 * S, 1080 * S, 150 * S)
      
      // Avatar (logo) do rodapé com escala e proporção de aspecto original preservada
      if (logo) {
        const aspect = logo.width / logo.height
        const targetHeight = 135 * (avatarScale / 100) * S
        const targetWidth = targetHeight * aspect
        const aX = (avatarOffsetX ?? 35) * S
        const aY = (avatarOffsetY ?? 938) * S
        ctx.drawImage(logo, aX, aY, targetWidth, targetHeight)
        reg['avatar'] = { key: 'avatar', label: 'Avatar', x: aX / S, y: aY / S, w: targetWidth / S, h: targetHeight / S }
      }
      
      ctx.textAlign = "left"
      ctx.fillStyle = "#e0a96d"
      ctx.font = `bold ${(footerAddressTitleFontSize || 24) * S}px 'Segoe UI', Arial, sans-serif`
      const ftTitle = footerAddressTitle || "VISITE NOSSA LOJA NO ENDEREÇO"
      const ftTitleX = footerAddressTitleOffsetX ?? 175
      const ftTitleY = footerAddressTitleOffsetY ?? 988
      ctx.fillText(ftTitle, ftTitleX * S, ftTitleY * S)
      reg['footerTitle'] = { key: 'footerTitle', label: 'Título Endereço', x: ftTitleX - 6, y: ftTitleY - (footerAddressTitleFontSize || 24) - 4, w: ctx.measureText(ftTitle).width / S + 12, h: (footerAddressTitleFontSize || 24) + 12 }

      ctx.fillStyle = "#ffffff"
      ctx.font = `bold ${(footerAddressTextFontSize || 28) * S}px 'Segoe UI', Arial, sans-serif`
      const ftAddr = footerAddressText || "RUA CASCAVEL, 306, GUARAITUBA, COLOMBO"
      const ftAddrX = footerAddressTextOffsetX ?? 175
      const ftAddrY = footerAddressTextOffsetY ?? 1032
      ctx.fillText(ftAddr, ftAddrX * S, ftAddrY * S)
      reg['footerAddress'] = { key: 'footerAddress', label: 'Endereço', x: ftAddrX - 6, y: ftAddrY - (footerAddressTextFontSize || 28) - 4, w: ctx.measureText(ftAddr).width / S + 12, h: (footerAddressTextFontSize || 28) + 12 }

      // Desenha o rótulo de Oportunidade se showOpportunityBadge for true
      if (showOpportunityBadge && activeProduct.opportunities) {
        const opp = activeProduct.opportunities
        const isSalvados = (opp as any).slug === "salvado" || opp.name?.toLowerCase()?.includes("salvado")
        const labelText = opp.name.toUpperCase()
        
        ctx.save()
        
        // Aplica translação, rotação e escala
        const bx = oppOffsetX * S
        const by = oppOffsetY * S
        ctx.translate(bx, by)
        ctx.rotate((oppRotation * Math.PI) / 180)
        
        const currentScale = (oppScale / 100) * S
        ctx.scale(currentScale, currentScale)

        ctx.font = `bold 20px 'Segoe UI', Arial, sans-serif`
        const textW = ctx.measureText(labelText).width
        
        // Se for salvados, reserve espaço para o ícone
        const iconSpace = isSalvados ? 28 : 0
        const badgeW = textW + 30 + iconSpace
        const badgeH = 44

        // Cor de fundo
        ctx.fillStyle = isSalvados ? "#f97316" : resolveBadgeColor(opp.badge_color)
        
        // Desenha retângulo arredondado (centralizado em relação à rotação/escala para rotacionar no próprio eixo)
        const rx = -badgeW / 2
        const ry = -badgeH / 2
        const radius = 8
        
        ctx.beginPath()
        ctx.moveTo(rx + radius, ry)
        ctx.lineTo(rx + badgeW - radius, ry)
        ctx.quadraticCurveTo(rx + badgeW, ry, rx + badgeW, ry + radius)
        ctx.lineTo(rx + badgeW, ry + badgeH - radius)
        ctx.quadraticCurveTo(rx + badgeW, ry + badgeH, rx + badgeW - radius, ry + badgeH)
        ctx.lineTo(rx + radius, ry + badgeH)
        ctx.quadraticCurveTo(rx, ry + badgeH, rx, ry + badgeH - radius)
        ctx.lineTo(rx, ry + radius)
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry)
        ctx.closePath()
        ctx.fill()

        // Borda se houver
        if (opp.border_color) {
          ctx.strokeStyle = opp.border_color
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Desenha ícone de chama (Flame) se for salvados
        if (isSalvados) {
          const iconSize = 20
          const iconX = rx + 15
          const iconY = ry + (badgeH - iconSize) / 2
          drawFlameIcon(ctx, iconX, iconY, iconSize)
        }

        // Texto do badge (centralizado vertical e horizontalmente)
        ctx.fillStyle = "#ffffff"
        ctx.font = `bold 16px 'Segoe UI', Arial, sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        // Se houver ícone, desloca o texto levemente para a direita
        const textOffsetX = isSalvados ? iconSpace / 2 : 0
        ctx.fillText(labelText, textOffsetX, 0)
        
        ctx.textBaseline = "alphabetic" // Restaura o baseline padrão
        ctx.restore()

        // Registra hitbox do badge usando aproximação da escala (sem transformação aplicada)
        const scaleFactor = (oppScale / 100)
        const badgeWWorld = (badgeW * scaleFactor)
        const badgeHWorld = (badgeH * scaleFactor)
        reg['opportunityBadge'] = { key: 'opportunityBadge', label: 'Rótulo', x: oppOffsetX - badgeWWorld / 2 - 6, y: oppOffsetY - badgeHWorld / 2 - 6, w: badgeWWorld + 12, h: badgeHWorld + 12 }
      }

      // Destaque visual do elemento selecionado (apenas no preview da tela, ocultado na exportação final)
      if (selectedElement && !isExport) {
        const S = canvas.width / 1080
        const regions = getHitRegions()
        const region = regions.find(r => r.key === selectedElement)
        if (region) {
          ctx.save()
          ctx.strokeStyle = "rgba(255, 220, 60, 0.95)"
          ctx.lineWidth = 3 * S
          ctx.setLineDash([10 * S, 6 * S])
          ctx.shadowColor = "rgba(0,0,0,0.6)"
          ctx.shadowBlur = 8

          // Se for imagem ou avatar, aplica a folga de 6px escalada na renderização.
          // Se for texto/medidas, a hitbox já possui a folga apropriada embutida.
          const isText = !["mainImage", "secondaryImage", "avatar"].includes(region.key)
          const rectX = isText ? region.x * S : region.x * S - 6 * S
          const rectY = isText ? region.y * S : region.y * S - 6 * S
          const rectW = isText ? region.w * S : region.w * S + 12 * S
          const rectH = isText ? region.h * S : region.h * S + 12 * S

          ctx.strokeRect(rectX, rectY, rectW, rectH)
          
          // Label do elemento
          ctx.setLineDash([])
          ctx.shadowBlur = 0
          ctx.fillStyle = "rgba(255, 220, 60, 0.95)"
          ctx.font = `bold ${13 * S}px 'Segoe UI', Arial, sans-serif`
          ctx.textBaseline = "bottom"
          const labelW = ctx.measureText(region.label).width + 12
          const labelX = Math.min(rectX, canvas.width - labelW)
          const labelY = rectY
          ctx.fillRect(labelX, labelY - 20 * S, labelW, 20 * S)
          ctx.fillStyle = "#1a1a1a"
          ctx.fillText(region.label, labelX + 6, labelY)
          ctx.textBaseline = "alphabetic"
          ctx.restore()
        }
      }

      ctx.textAlign = "left"
    } catch (error) {
      console.error("Erro ao desenhar banner no canvas de forma síncrona:", error)
    }
  }

  // Função de desenho compartilhada entre preview e download (Assíncrona para pré-carregamento)
  const drawBannerAsync = async (canvas: HTMLCanvasElement, isExport = false) => {
    try {
      if (!activeProduct) return
      
      const images = activeProduct.product_images || []
      const effectiveMainIdx = mainImageIndex >= 0 && mainImageIndex < images.length ? mainImageIndex : 0
      const effectiveSecIdx = secondaryImageIndex >= 0 && secondaryImageIndex < images.length ? secondaryImageIndex : (images.length > 1 ? 1 : 0)
      
      const mainImageUrl = images[effectiveMainIdx]?.image_url || ""
      const secImageUrl = images[effectiveSecIdx]?.image_url || ""

      const [headerBg, logo, mainImg, secImg] = await Promise.all([
        loadImg("/images/banner-header-bg.png"),
        avatarUrl ? loadImg(avatarUrl) : loadImg("/images/avatar-morante.png"),
        mainImageUrl ? loadImg(mainImageUrl) : Promise.resolve(null as any),
        (secImageUrl && showSecondaryImage) ? loadImg(secImageUrl) : Promise.resolve(null as any),
      ])

      drawBannerSync(canvas, { headerBg, logo, mainImg, secImg }, isExport)
    } catch (error) {
      console.error("Erro no carregamento assíncrono do banner:", error)
    }
  }

  // Retorna as regiões de clique de cada elemento no canvas (coordenadas 0-1080)
  // Após o primeiro draw, usa as regiões calculadas em tempo real pelo drawBannerAsync
  const getHitRegions = () => {
    return Object.values(renderedRegionsRef.current)
  }

  // Handler de clique no canvas de preview
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = 1080 / rect.width
    const scaleY = 1080 / rect.height
    const cx = (e.clientX - rect.left) * scaleX
    const cy = (e.clientY - rect.top) * scaleY
    // Testa do último para o primeiro (elementos desenhados por cima têm prioridade)
    const regions = getHitRegions().filter(r =>
      (r.key !== 'secondaryImage' || showSecondaryImage) &&
      (r.key !== 'opportunityBadge' || showOpportunityBadge)
    ).reverse()
    const hit = regions.find(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h)
    setSelectedElement((hit ? hit.key : null) as any)
  }

  const updateElementOffset = useCallback((el: SelectedElement, dx: number, dy: number) => {
    if (!el) return
    switch (el) {
      case 'mainImage':
        setMainImageOffsetX(prev => prev + dx)
        setMainImageOffsetY(prev => prev + dy)
        break
      case 'secondaryImage':
        setSecondaryImageOffsetX(prev => prev + dx)
        setSecondaryImageOffsetY(prev => prev + dy)
        break
      case 'opportunityBadge':
        setOppOffsetX(prev => prev + dx)
        setOppOffsetY(prev => prev + dy)
        break
      case 'brand':
        setBrandOffsetX(prev => prev + dx)
        setBrandOffsetY(prev => prev + dy)
        break
      case 'slogan':
        setSloganOffsetX(prev => prev + dx)
        setSloganOffsetY(prev => prev + dy)
        break
      case 'installments':
        setInstallmentsOffsetX(prev => prev + dx)
        setInstallmentsOffsetY(prev => prev + dy)
        break
      case 'avatar':
        setAvatarOffsetX(prev => prev + dx)
        setAvatarOffsetY(prev => prev + dy)
        break
      case 'footerTitle':
        setFooterAddressTitleOffsetX(prev => prev + dx)
        setFooterAddressTitleOffsetY(prev => prev + dy)
        break
      case 'footerAddress':
        setFooterAddressTextOffsetX(prev => prev + dx)
        setFooterAddressTextOffsetY(prev => prev + dy)
        break
      case 'title':
        setProductTitleOffsetX(prev => prev + dx)
        setProductTitleOffsetY(prev => prev + dy)
        break
      case 'priceDe':
        setPriceDeOffsetX(prev => prev + dx)
        setPriceDeOffsetY(prev => prev + dy)
        break
      case 'pricePor':
        setPriceOffsetX(prev => prev + dx)
        setPriceOffsetY(prev => prev + dy)
        break
      case 'porApenas':
        setPorApenasOffsetX(prev => prev + dx)
        setPorApenasOffsetY(prev => prev + dy)
        break
      case 'measures':
        setMeasuresOffsetX(prev => prev + dx)
        setMeasuresOffsetY(prev => prev + dy)
        break
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = 1080 / rect.width
    const scaleY = 1080 / rect.height
    const cx = (e.clientX - rect.left) * scaleX
    const cy = (e.clientY - rect.top) * scaleY

    const regions = getHitRegions().filter(r =>
      (r.key !== 'secondaryImage' || showSecondaryImage) &&
      (r.key !== 'opportunityBadge' || showOpportunityBadge)
    ).reverse()
    const hit = regions.find(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h)

    if (hit) {
      setSelectedElement(hit.key as any)
      isDraggingRef.current = true
      lastMousePosRef.current = { x: cx, y: cy }
      e.currentTarget.focus()
    } else {
      setSelectedElement(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !selectedElement) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = 1080 / rect.width
    const scaleY = 1080 / rect.height
    const cx = (e.clientX - rect.left) * scaleX
    const cy = (e.clientY - rect.top) * scaleY

    const dx = Math.round(cx - lastMousePosRef.current.x)
    const dy = Math.round(cy - lastMousePosRef.current.y)

    if (dx !== 0 || dy !== 0) {
      updateElementOffset(selectedElement, dx, dy)
      lastMousePosRef.current = { x: cx, y: cy }
    }
  }

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!selectedElement) return
    const step = e.shiftKey ? 5 : 1
    let dx = 0
    let dy = 0

    if (e.key === "ArrowUp") {
      dy = -step
    } else if (e.key === "ArrowDown") {
      dy = step
    } else if (e.key === "ArrowLeft") {
      dx = -step
    } else if (e.key === "ArrowRight") {
      dx = step
    } else {
      return
    }

    e.preventDefault()
    updateElementOffset(selectedElement, dx, dy)
  }

  // Redesenha o preview sempre que qualquer configuração mudar
  useEffect(() => {
    if (!isModalOpen || !activeProduct || !previewCanvasRef.current) return
    
    // Tenta renderizar síncronamente do cache imediato se possível para eliminar delay (60fps fluidos no arraste)
    const canvas = previewCanvasRef.current
    const mainImageUrl = activeProduct.product_images?.[mainImageIndex]?.image_url || ""
    const secImageUrl = activeProduct.product_images?.[secondaryImageIndex]?.image_url || ""
    const logoUrl = avatarUrl || "/images/avatar-morante.png"
    const headerBgUrl = "/images/banner-header-bg.png"

    const headerBg = imageCacheRef.current[headerBgUrl]
    const logo = imageCacheRef.current[logoUrl]
    const mainImg = mainImageUrl ? imageCacheRef.current[mainImageUrl] : null
    const secImg = (secImageUrl && showSecondaryImage) ? imageCacheRef.current[secImageUrl] : null

    const hasHeader = !headerBgUrl || headerBg
    const hasLogo = !logoUrl || logo
    const hasMain = !mainImageUrl || mainImg
    const hasSec = !(secImageUrl && showSecondaryImage) || !secImageUrl || secImg

    if (hasHeader && hasLogo && hasMain && hasSec) {
      drawBannerSync(canvas, { headerBg, logo, mainImg, secImg }, false)
    } else {
      // Fallback assíncrono (carrega no cache e depois desenha)
      drawBannerAsync(canvas, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isModalOpen, activeProduct, selectedElement,
    mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY,
    secondaryImageOffsetX, secondaryImageOffsetY,
    mainImageIndex, secondaryImageIndex,
    showSecondaryImage, showOpportunityBadge,
    installmentsText, installmentsFontSize, installmentsOffsetX, installmentsOffsetY,
    customPrice, customPromoPrice,
    displayPrice, isPromo, marketingDefaults,
    brandName, brandFontSize, brandOffsetX, brandOffsetY,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    oppRotation, oppScale, oppOffsetX, oppOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY,
    footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX, footerAddressTitleOffsetY,
    footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleMaxContainerWidth,
    priceFontSize, priceDeFontSize, priceOffsetX, priceOffsetY,
    porApenasText, porApenasFontSize, porApenasColor, porApenasOffsetX, porApenasOffsetY,
    measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY
  ])

  // Desenha e baixa a imagem localmente (Somente baixar - isExport = true)
  const handleDownloadOnly = async () => {
    if (!activeProduct) return
    const toastId = toast.loading("Gerando arquivo de exportação...")
    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error("Canvas não inicializado")
      await drawBannerAsync(canvas, true)

      const link = document.createElement("a")
      link.download = `post-${activeProduct.name.toLowerCase().replace(/\s+/g, "-")}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      toast.success("Arte exportada com sucesso!", { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error("Falha ao exportar arte: " + err.message, { id: toastId })
    }
  }

  // Compartilha a imagem diretamente via Web Share API (sem upload) — compatível com WhatsApp mobile
  const handleShareWhatsApp = async () => {
    if (!activeProduct) return
    const toastId = toast.loading("Gerando imagem para compartilhar...")
    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error("Canvas não inicializado")
      await drawBannerAsync(canvas, true) // exportação limpa, sem destaque de seleção

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Falha ao gerar imagem.", { id: toastId })
          return
        }

        const fileName = `post-${activeProduct.name.toLowerCase().replace(/\s+/g, "-")}.png`
        const file = new File([blob], fileName, { type: "image/png" })

        // Web Share API com suporte a arquivos (funciona no Chrome/Android/Safari/iOS)
        if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: activeProduct.name,
            })
            toast.success("Imagem compartilhada com sucesso!", { id: toastId })
          } catch (shareErr: any) {
            // Usuário cancelou o compartilhamento — não exibe erro
            if (shareErr?.name !== "AbortError") {
              toast.error("Falha ao compartilhar: " + shareErr.message, { id: toastId })
            } else {
              toast.dismiss(toastId)
            }
          }
        } else {
          // Fallback: baixa o arquivo localmente para o usuário enviar manualmente
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = fileName
          link.click()
          URL.revokeObjectURL(url)
          toast.success("Imagem baixada! Envie manualmente pelo WhatsApp.", { id: toastId })
        }
      }, "image/png")
    } catch (err: any) {
      console.error(err)
      toast.error("Falha ao gerar imagem: " + err.message, { id: toastId })
    }
  }

  // Apenas envia para o Cloudflare R2 e salva/atualiza as configurações no banco de dados (Somente salvar - isExport = true)
  const handleSavePost = async () => {
    if (!activeProduct) return
    setDownloading(true)
    const toastId = toast.loading("Publicando arte...")
    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error("Canvas não inicializado")
      await drawBannerAsync(canvas, true)

      canvas.toBlob(async (blob) => {
        if (!blob) return
        const postUniqueId = activePostId || Date.now().toString()
        const fileName = `post-${activeProduct.id}-${postUniqueId}.png`
        try {
          const file = new File([blob], fileName, { type: "image/png" })
          const fileUrl = await uploadToR2(file, `marketing-posts/${fileName}`)
          const currentSpecs = activeProduct.technical_specs || {}
          const currentPosts = Array.isArray((currentSpecs as any).posts) ? (currentSpecs as any).posts : []
          const nowISO = new Date().toISOString()
          const newPostData = {
            id: postUniqueId, 
            imageUrl: fileUrl, 
            createdAt: activePostId ? (currentPosts.find((p: any) => p.id === activePostId)?.createdAt || nowISO) : nowISO,
            updatedAt: nowISO,
            settings: getCurrentState()
          }
          const updatedPosts = activePostId
            ? currentPosts.map((p: any) => p.id === activePostId ? newPostData : p)
            : [newPostData, ...currentPosts]
          const updatedSpecs = { ...(typeof currentSpecs === 'object' ? currentSpecs : {}), posts: updatedPosts, marketing_banner_url: fileUrl }
          const { error } = await supabase.from("products").update({ technical_specs: updatedSpecs }).eq("id", activeProduct.id)
          if (error) throw error
          setProducts(prev => prev.map(p => p.id === activeProduct.id ? { ...p, technical_specs: updatedSpecs } : p))
          setActivePostId(postUniqueId)
          setIsModalOpen(false)
          toast.success("Arte publicada com sucesso!", { id: toastId })
        } catch (err: any) {
          console.error("Erro ao salvar post:", err)
          toast.error("Falha ao publicar arte no sistema.", { id: toastId })
        }
      }, "image/png")
    } catch (err: any) {
      console.error(err)
      toast.error("Falha ao processar imagem para salvar: " + err.message, { id: toastId })
    } finally {
      setDownloading(false)
    }
  }

  // Função antiga mantida apenas por retrocompatibilidade se necessária
  const handleDownload = handleSavePost

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="font-bold text-gray-500 text-sm">Carregando gerador de marketing...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-80">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Gerador de Posts Promocionais</h1>
            <p className="text-gray-500 text-sm">Crie imagens quadradas de divulgação de forma 100% automatizada para redes sociais.</p>
            <Button
              type="button"
              onClick={handleNewPost}
              disabled={!activeProduct}
              className="mt-3 h-9 rounded-full gap-2 px-4 text-xs font-bold shadow-md shadow-primary/10"
              title={activeProduct ? "Abrir o editor com o template atual" : "Selecione um produto para usar o template"}
            >
              <Layers className="h-4 w-4" />
              Template para os Posts
            </Button>
            {!activeProduct && (
              <p className="mt-1 text-xs text-gray-400">Selecione um produto para abrir o template.</p>
            )}
          </div>
        </div>
      </div>


      {/* Caixa de Seleção do Produto */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm max-w-xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-gray-800">Selecione um Produto</h2>
          <p className="text-xs text-gray-400">Busque pelo nome para ver ou criar posts promocionais</p>
        </div>

        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              id="search"
              placeholder="Digite o nome do produto..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (selectedProductId) setSelectedProductId("")
              }}
              className="pl-9"
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(""); setSelectedProductId("") }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Dropdown de sugestões */}
          {searchTerm && !selectedProductId && filteredProducts.length > 0 && (
            <ul className="absolute z-[100] top-full mt-1 w-full bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden max-h-96 overflow-y-auto">
              {filteredProducts.slice(0, 10).map(p => {
                const mainImg = p.product_images?.find((img: any) => img.is_main)?.image_url
                  || p.product_images?.[0]?.image_url
                  || null
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.id)
                        setSearchTerm(p.name)
                      }}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-primary/5 hover:text-primary transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                        {mainImg ? (
                          <Image src={mainImg} alt={p.name} fill className="object-contain p-0.5" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Nenhum resultado */}
          {searchTerm && !selectedProductId && filteredProducts.length === 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-4 text-center text-sm text-gray-400">
              Nenhum produto encontrado
            </div>
          )}
        </div>

        {/* Produto selecionado — badge */}
        {activeProduct && (() => {
          const mainImg = activeProduct.product_images?.find((img: any) => img.is_main)?.image_url
            || activeProduct.product_images?.[0]?.image_url
            || null
          return (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-3 py-2">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white border border-primary/10 shrink-0">
                {mainImg ? (
                  <Image src={mainImg} alt={activeProduct.name} fill className="object-contain p-0.5" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-primary truncate">{activeProduct.name}</span>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedProductId(""); setSearchTerm("") }}
                className="text-primary/50 hover:text-primary shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })()}
      </div>

      {/* Seção de Posts do Produto na tela principal */}
      {activeProduct && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between md:items-center border-b pb-4 gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{activeProduct.name}</h2>
              <p className="text-sm text-gray-500">Visualize, edite ou crie novos posts promocionais para este produto.</p>
            </div>
            <Button 
              type="button" 
              onClick={handleNewPost}
              className="rounded-full gap-2 font-bold shadow-md shadow-primary/10 self-start md:self-auto"
            >
              <Plus className="h-4 w-4" />
              Criar Post com Template
            </Button>
          </div>

          {postsList.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center max-w-xl mx-auto bg-gray-50/50 space-y-4">
              <ImageIcon className="h-16 w-16 mx-auto text-gray-300 animate-pulse" />
              <div className="space-y-1">
                <h3 className="font-bold text-gray-700">Nenhum post criado ainda</h3>
                <p className="text-xs text-gray-400">Use o template para montar a imagem de propaganda deste produto.</p>
              </div>
              <Button type="button" onClick={handleNewPost} variant="outline" className="font-bold">
                Criar Primeiro Post com Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {postsList.map((post: any) => {
                const postDate = new Date(post.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
                return (
                  <div key={post.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col">
                    <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center border-b overflow-hidden">
                      <Image src={`${post.imageUrl}?t=${new Date(post.updatedAt || post.createdAt).getTime()}`} alt="Post" fill className="object-contain p-2" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 px-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleEditPost(post)}
                          className="p-2 bg-white text-gray-900 rounded-full hover:scale-105 transition shadow-lg font-bold text-[11px] flex items-center gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5 text-blue-600" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(`${post.imageUrl}?t=${new Date(post.updatedAt || post.createdAt).getTime()}`, "_blank")}
                          className="p-2 bg-white text-gray-900 rounded-full hover:scale-105 transition shadow-lg font-bold text-[11px] flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5 text-green-600" />
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Deseja realmente excluir este post?")) {
                              handleDeletePost(post.id)
                            }
                          }}
                          className="p-2 bg-white text-gray-900 rounded-full hover:scale-105 transition shadow-lg font-bold text-[11px] flex items-center gap-1 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          Excluir
                        </button>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">
                          Criado: {new Date(post.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "2-digit" })}
                        </span>
                        <span className="text-[10px] text-primary font-bold block uppercase tracking-wider">
                          Atualizado: {post.updatedAt ? new Date(post.updatedAt).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Sem info"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-3">
                        <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">
                          Ações do Post
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedQuickActionsPost(post)}
                          className="h-8 w-8 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 shrink-0"
                          title="Opções do Post"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Modal de Ações do Post (3 Pontos) */}
          {selectedQuickActionsPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-gray-100 max-w-sm w-full p-6 shadow-2xl relative space-y-6">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h4 className="text-base font-black text-gray-900 uppercase tracking-tight">Opções do Post</h4>
                  <button 
                    onClick={() => setSelectedQuickActionsPost(null)}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Preview pequeno da imagem */}
                <div className="relative aspect-square w-32 h-32 mx-auto rounded-2xl overflow-hidden border bg-gray-50 flex items-center justify-center">
                  <img 
                    src={`${selectedQuickActionsPost.imageUrl}?t=${new Date(selectedQuickActionsPost.updatedAt || selectedQuickActionsPost.createdAt).getTime()}`} 
                    alt="Post Preview" 
                    className="object-contain p-1 w-full h-full" 
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      handleEditPost(selectedQuickActionsPost)
                      setSelectedQuickActionsPost(null)
                    }}
                    className="w-full justify-start gap-2 h-10 font-semibold text-xs rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar no Editor
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      window.open(`${selectedQuickActionsPost.imageUrl}?t=${new Date(selectedQuickActionsPost.updatedAt || selectedQuickActionsPost.createdAt).getTime()}`, "_blank")
                    }}
                    className="w-full justify-start gap-2 h-10 font-semibold text-xs rounded-xl bg-green-50 text-green-600 hover:bg-green-100"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar Imagem (Ver)
                  </Button>

                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch(selectedQuickActionsPost.imageUrl)
                        const blob = await response.blob()
                        const fileUrl = window.URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = fileUrl
                        a.download = `post-${activeProduct.name.replace(/[^a-zA-Z0-9]/g, "_")}-${selectedQuickActionsPost.id}.png`
                        document.body.appendChild(a)
                        a.click()
                        a.remove()
                        window.URL.revokeObjectURL(fileUrl)
                        toast.success("Imagem baixada com sucesso!")
                      } catch (err) {
                        toast.error("Falha ao baixar imagem.")
                      }
                    }}
                    className="w-full justify-start gap-2 h-10 font-semibold text-xs rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <Download className="h-4 w-4" />
                    Baixar Imagem (Download)
                  </Button>

                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch(selectedQuickActionsPost.imageUrl)
                        const blob = await response.blob()
                        await navigator.clipboard.write([
                          new ClipboardItem({ "image/png": blob })
                        ])
                        toast.success("Imagem copiada para a área de transferência!")
                      } catch (err) {
                        // Fallback copiado como link
                        await navigator.clipboard.writeText(selectedQuickActionsPost.imageUrl)
                        toast.success("Link da imagem copiado!")
                      }
                    }}
                    className="w-full justify-start gap-2 h-10 font-semibold text-xs rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar Imagem
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      window.open("https://business.facebook.com/latest/composer", "_blank")
                    }}
                    className="w-full justify-start gap-2 h-10 font-semibold text-xs rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                  >
                    <Share2 className="h-4 w-4" />
                    Meta Business Suite
                  </Button>

                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch(selectedQuickActionsPost.imageUrl)
                        const blob = await response.blob()
                        const file = new File([blob], `status-${selectedQuickActionsPost.id}.png`, { type: "image/png" })
                        
                        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            files: [file],
                            title: "Post Promocional",
                            text: "Confira nossas ofertas imperdíveis!"
                          })
                        } else {
                          const textMsg = `Confira nossa oferta imperdível: ${window.location.origin}/produto/${activeProduct.id}`
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`, "_blank")
                        }
                      } catch (err) {
                        const textMsg = `Confira nossa oferta imperdível: ${window.location.origin}/produto/${activeProduct.id}`
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`, "_blank")
                      }
                    }}
                    className="w-full justify-start gap-2 h-10 font-semibold text-xs rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  >
                    <Share2 className="h-4 w-4" />
                    Status WhatsApp
                  </Button>

                  <div className="border-t pt-2 mt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        if (confirm("Deseja realmente excluir este post?")) {
                          handleDeletePost(selectedQuickActionsPost.id)
                          setSelectedQuickActionsPost(null)
                        }
                      }}
                      className="w-full justify-start gap-2 h-10 font-semibold text-xs rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Post
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Canvas Oculto */}
      <canvas ref={canvasRef} width={1080} height={1080} className="hidden" />

      {/* Modal do Editor de Post (Overlay) */}
      {isModalOpen && activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-6xl w-full max-h-[96vh] p-6 md:p-8 flex flex-col gap-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Cabeçalho do Modal */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                    {activePostId ? "Editando Post Promocional" : "Criando Novo Post Promocional"}
                  </h3>
                  {saveStatus === "saving" && (
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      Salvando...
                    </span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Salvo em nuvem
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">
                      Erro ao salvar
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-bold mt-0.5 uppercase tracking-wide text-primary">
                  {activeProduct.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  title="Desfazer mudança (Ctrl+Z)"
                  className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-gray-700"
                >
                  <Undo className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  title="Refazer mudança (Ctrl+Y)"
                  className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-gray-700 pr-4 border-r border-gray-150"
                >
                  <Redo className="h-5 w-5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Barra de Ferramentas / Photoshop-style Toolbar */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-150 p-2 rounded-2xl -mt-2">
              <button
                type="button"
                onClick={() => setIsLayersModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition shadow-xs"
                title="Ver lista de camadas e selecionar elemento"
              >
                <Layers className="h-4 w-4 text-primary" />
                <span>Camadas</span>
              </button>
              
              <div className="h-6 w-px bg-gray-200 mx-1" />
              
              <button
                type="button"
                onClick={() => setSelectedElement(null)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition",
                  selectedElement 
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100" 
                    : "text-gray-400 cursor-not-allowed"
                )}
                disabled={!selectedElement}
                title="Limpar seleção ativa"
              >
                <MousePointer2 className="h-4 w-4" />
                <span>Limpar Seleção</span>
              </button>

              <span className="text-[10px] text-gray-400 ml-auto mr-2 hidden sm:inline">
                {selectedElement ? `Selecionado: ${getHitRegions().find(r => r.key === selectedElement)?.label}` : "Nenhum elemento selecionado"}
              </span>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="contents">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start overflow-y-auto lg:overflow-visible">
                {/* Controles no Modal (Esquerda) */}
                <div className="lg:col-span-5 space-y-6 lg:max-h-[72vh] lg:overflow-y-auto pr-0 lg:pr-2">
                  {selectedElement ? (
                    /* Modo de elemento selecionado */
                    <div className="flex items-center gap-2 pb-1 border-b">
                      <button
                        type="button"
                        onClick={() => setSelectedElement(null)}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition text-gray-500"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-black text-gray-800 uppercase tracking-wider flex-1">
                        {getHitRegions().find(r => r.key === selectedElement)?.label ?? selectedElement}
                      </span>

                      {/* Botão de Fixar Todos como Padrão Global */}
                      <button
                        type="button"
                        onClick={() => fixComponentFieldsAsDefault(selectedElement)}
                        disabled={isComponentAllDefault(selectedElement)}
                        title={isComponentAllDefault(selectedElement) ? "Todos os campos já são o padrão global" : "Fixar todos os campos deste componente como padrão global"}
                        className={cn(
                          "p-1.5 rounded-xl transition flex items-center gap-1 border shrink-0 text-[10px] font-bold",
                          isComponentAllDefault(selectedElement)
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600 cursor-default"
                            : "hover:bg-emerald-50 border-transparent hover:border-emerald-100 text-gray-400 hover:text-emerald-600"
                        )}
                      >
                        <Pin className={cn("h-3.5 w-3.5", isComponentAllDefault(selectedElement) ? "text-emerald-600" : "text-emerald-500")} />
                        <span>Fixar Padrão</span>
                      </button>

                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Selecionado</span>
                    </div>
                  ) : (
                    /* Modo padrão — dica de clique */
                    <>
                      <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider">Controles de Customização</h4>
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 flex gap-2.5 items-start">
                        <MousePointer2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] text-gray-600 font-bold leading-normal">
                          <strong>Dica:</strong> Clique em qualquer elemento no preview ao lado para editar somente ele. Ou use o botão <Pin className="h-2.5 w-2.5 inline text-emerald-500 mx-0.5" /> para definir um valor como padrão global.
                        </p>
                      </div>
                    </>
                  )}
                  {/* GRUPO TÍTULO: só aparece para 'title' ou quando nada selecionado */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'title' && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      ✏️ Título do Produto
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <Label htmlFor="productTitle" className="text-xs font-bold text-gray-700">Título Customizado</Label>
                        {renderDefaultPin("productTitle", productTitle, marketingDefaults?.productTitle ?? "")}
                      </div>
                      <Input
                        id="productTitle"
                        placeholder={activeProduct.name}
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        className="h-9 text-xs font-bold"
                      />
                    </div>
                    {renderDualInput("productTitleFontSize", productTitleFontSize, setProductTitleFontSize, 16, 50, "Tamanho da Fonte (px)", marketingDefaults?.productTitleFontSize ?? 30)}
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("productTitleOffsetX", productTitleOffsetX, setProductTitleOffsetX, 400, 800, "Posição X (px)", marketingDefaults?.productTitleOffsetX ?? 570)}
                      {renderDualInput("productTitleOffsetY", productTitleOffsetY, setProductTitleOffsetY, 500, 850, "Posição Y (px)", marketingDefaults?.productTitleOffsetY ?? 660)}
                    </div>
                    {renderDualInput("productTitleMaxContainerWidth", productTitleMaxContainerWidth, setProductTitleMaxContainerWidth, 200, 600, "Largura Máxima (px)", marketingDefaults?.productTitleMaxContainerWidth ?? 430)}
                    <div className="grid grid-cols-2 gap-4 border-t pt-3">
                      {renderDualInput("productTitleRotation", productTitleRotation, setProductTitleRotation, -45, 45, "🔄 Rotação (°)", marketingDefaults?.productTitleRotation ?? 0)}
                      {renderDualInput("productTitleScale", productTitleScale, setProductTitleScale, 50, 200, "⚖️ Escala (%)", marketingDefaults?.productTitleScale ?? 100)}
                    </div>
                  </div>

                  {/* GRUPO PREÇO DE: só aparece para 'priceDe' ou quando nada selecionado */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'priceDe' && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      🏷️ Preço Original "De" (Riscado)
                    </h5>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-700">Valor "De" Customizado</Label>
                      <Input
                        id="custom-price"
                        type="number"
                        placeholder={`R$ ${(activeProduct.price || 0).toFixed(2)}`}
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 -mt-2">Deixe em branco para usar o preço original do produto.</p>
                    {renderDualInput("priceDeFontSize", priceDeFontSize, setPriceDeFontSize, 12, 36, "Tamanho da Fonte (px)", marketingDefaults?.priceDeFontSize ?? 20)}
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("priceDeOffsetX", priceDeOffsetX, setPriceDeOffsetX, 400, 800, "Posição X (px)", marketingDefaults?.priceDeOffsetX ?? 570)}
                      {renderDualInput("priceDeOffsetY", priceDeOffsetY, setPriceDeOffsetY, 400, 800, "Posição Y (px)", marketingDefaults?.priceDeOffsetY ?? 610)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-3">
                      {renderDualInput("priceDeRotation", priceDeRotation, setPriceDeRotation, -45, 45, "🔄 Rotação (°)", marketingDefaults?.priceDeRotation ?? 0)}
                      {renderDualInput("priceDeScale", priceDeScale, setPriceDeScale, 50, 200, "⚖️ Escala (%)", marketingDefaults?.priceDeScale ?? 100)}
                    </div>
                  </div>

                  {/* GRUPO POR APENAS: só aparece para 'porApenas' ou quando nada selecionado */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'porApenas' && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      🏷️ Rótulo "Por Apenas"
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <Label htmlFor="porApenasText" className="text-xs font-bold text-gray-700">Texto</Label>
                        {renderDefaultPin("porApenasText", porApenasText, marketingDefaults?.porApenasText ?? "POR APENAS")}
                      </div>
                      <Input
                        id="porApenasText"
                        value={porApenasText}
                        onChange={(e) => setPorApenasText(e.target.value)}
                        className="h-9 text-xs font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("porApenasFontSize", porApenasFontSize, setPorApenasFontSize, 10, 30, "Tamanho Fonte (px)", marketingDefaults?.porApenasFontSize ?? 16)}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <Label htmlFor="porApenasColor" className="text-xs font-bold text-gray-700">Cor do Texto</Label>
                          {renderDefaultPin("porApenasColor", porApenasColor, marketingDefaults?.porApenasColor ?? "#e0a96d")}
                        </div>
                        <Input
                          id="porApenasColor"
                          type="color"
                          value={porApenasColor}
                          onChange={(e) => setPorApenasColor(e.target.value)}
                          className="h-9 p-1 cursor-pointer w-full"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("porApenasOffsetX", porApenasOffsetX, setPorApenasOffsetX, 400, 800, "Posição X (px)", marketingDefaults?.porApenasOffsetX ?? 570)}
                      {renderDualInput("porApenasOffsetY", porApenasOffsetY, setPorApenasOffsetY, 400, 800, "Posição Y (px)", marketingDefaults?.porApenasOffsetY ?? 635)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-3">
                      {renderDualInput("porApenasRotation", porApenasRotation, setPorApenasRotation, -45, 45, "🔄 Rotação (°)", marketingDefaults?.porApenasRotation ?? 0)}
                      {renderDualInput("porApenasScale", porApenasScale, setPorApenasScale, 50, 200, "⚖️ Escala (%)", marketingDefaults?.porApenasScale ?? 100)}
                    </div>
                  </div>

                  {/* GRUPO PREÇO POR: só aparece para 'pricePor' ou quando nada selecionado */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'pricePor' && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      💰 Preço Novo "Por"
                    </h5>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-700">Valor Promo "Por" Customizado</Label>
                      <Input
                        id="custom-promo-price"
                        type="number"
                        placeholder={activeProduct.promo_price ? `R$ ${parseFloat(activeProduct.promo_price.toString()).toFixed(2)}` : "Não cadastrado"}
                        value={customPromoPrice}
                        onChange={(e) => setCustomPromoPrice(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 -mt-2">Deixe em branco para usar o preço promocional do produto.</p>
                    {renderDualInput("priceFontSize", priceFontSize, setPriceFontSize, 24, 72, "Tamanho Fonte (px)", marketingDefaults?.priceFontSize ?? 48)}
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("priceOffsetX", priceOffsetX, setPriceOffsetX, 400, 800, "Posição X (px)", marketingDefaults?.priceOffsetX ?? 570)}
                      {renderDualInput("priceOffsetY", priceOffsetY, setPriceOffsetY, 400, 900, "Posição Y (px)", marketingDefaults?.priceOffsetY ?? 730)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-3">
                      {renderDualInput("priceRotation", priceRotation, setPriceRotation, -45, 45, "🔄 Rotação (°)", marketingDefaults?.priceRotation ?? 0)}
                      {renderDualInput("priceScale", priceScale, setPriceScale, 50, 200, "⚖️ Escala (%)", marketingDefaults?.priceScale ?? 100)}
                    </div>
                  </div>

                  {/* GRUPO PARCELAMENTO: só aparece para 'installments' ou quando nada selecionado */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'installments' && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      📋 Parcelamento &amp; Condições de Pagamento
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <Label htmlFor="installments" className="text-xs font-bold text-gray-700">Texto da Chamada</Label>
                        {renderDefaultPin("installmentsText", installmentsText, marketingDefaults?.installmentsText ?? "Em até 10x sem juros nas principais bandeiras de cartão")}
                      </div>
                      <Input
                        id="installments"
                        value={installmentsText}
                        onChange={(e) => setInstallmentsText(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("installmentsFontSize", installmentsFontSize, setInstallmentsFontSize, 14, 48, "Tamanho da Fonte (px)", marketingDefaults?.installmentsFontSize ?? 26)}
                      {renderDualInput("installmentsOffsetY", installmentsOffsetY, setInstallmentsOffsetY, 800, 970, "Posição Vert. (px)", marketingDefaults?.installmentsOffsetY ?? 895)}
                    </div>
                    {renderDualInput("installmentsOffsetX", installmentsOffsetX, setInstallmentsOffsetX, 0, 1080, "Posição Horiz. (px)", marketingDefaults?.installmentsOffsetX ?? 540)}
                  </div>

                  {/* Medidas do Produto */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'measures' && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      📐 Medidas do Produto
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <Label htmlFor="measuresText" className="text-xs font-bold text-gray-700">Medidas Customizadas</Label>
                        {renderDefaultPin("measuresText", measuresText, marketingDefaults?.measuresText ?? "")}
                      </div>
                      <Input
                        id="measuresText"
                        placeholder={`${activeProduct.width || "?"}x${activeProduct.depth || "?"}x${activeProduct.height || "?"} ( larg x prof x alt )`}
                        value={measuresText}
                        onChange={(e) => setMeasuresText(e.target.value)}
                        className="h-9 text-xs font-bold"
                      />
                    </div>
                    {renderDualInput("measuresFontSize", measuresFontSize, setMeasuresFontSize, 12, 36, "Tamanho da Fonte (px)", marketingDefaults?.measuresFontSize ?? 20)}
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("measuresOffsetX", measuresOffsetX, setMeasuresOffsetX, 500, 950, "Posição X (px)", marketingDefaults?.measuresOffsetX ?? 785)}
                      {renderDualInput("measuresOffsetY", measuresOffsetY, setMeasuresOffsetY, 400, 800, "Posição Y (px)", marketingDefaults?.measuresOffsetY ?? 610)}
                    </div>
                  </div>

                  {/* GRUPO 2: 📸 Foto Principal */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", !['mainImage', 'secondaryImage'].includes(selectedElement) && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      📸 Fotos do Produto & Enquadramento
                    </h5>

                    {activeProduct.product_images && activeProduct.product_images.length > 0 && (
                      <div className="space-y-3">
                        {/* Seletor de foto principal - só aparece quando mainImage ou nada está selecionado */}
                        <div className={cn(selectedElement === 'secondaryImage' && 'hidden')}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block w-5 h-5 bg-primary rounded-md text-white text-[9px] font-black flex items-center justify-center">1</span>
                            <Label className="text-xs font-black text-gray-700 uppercase tracking-wide">Foto Principal</Label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activeProduct.product_images.map((img, idx) => {
                              const isMain = mainImageIndex === idx
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setMainImageIndex(isMain ? -1 : idx)}
                                  className={cn(
                                    "relative h-14 w-14 rounded-xl overflow-hidden border-2 bg-gray-50 transition shrink-0",
                                    isMain ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-gray-200 hover:border-gray-400"
                                  )}
                                >
                                  <img src={img.image_url} alt={`Foto ${idx + 1}`} className="object-contain p-1 w-full h-full" />
                                  {isMain && (
                                    <div className="absolute inset-0 bg-primary/10 flex items-end justify-center pb-1">
                                      <span className="bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">1</span>
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Seletor de foto secundária - só aparece quando secondaryImage ou nada está selecionado */}
                        <div className={cn("border-t pt-3", selectedElement === 'mainImage' && 'hidden')}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block w-5 h-5 bg-emerald-500 rounded-md text-white text-[9px] font-black flex items-center justify-center">2</span>
                            <Label className="text-xs font-black text-gray-700 uppercase tracking-wide">Foto Secundária</Label>
                            <div className="ml-auto flex items-center gap-2">
                              <Checkbox
                                id="show-sec-img-g2"
                                checked={showSecondaryImage}
                                onCheckedChange={(checked) => setShowSecondaryImage(!!checked)}
                              />
                              <Label htmlFor="show-sec-img-g2" className="cursor-pointer text-xs font-bold text-gray-500">Exibir</Label>
                            </div>
                          </div>
                          {showSecondaryImage && (
                            <div className="flex flex-wrap gap-2">
                              {activeProduct.product_images.map((img, idx) => {
                                const isSec = secondaryImageIndex === idx
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setSecondaryImageIndex(isSec ? -1 : idx)
                                      if (!isSec) setShowSecondaryImage(true)
                                    }}
                                    className={cn(
                                      "relative h-14 w-14 rounded-xl overflow-hidden border-2 bg-gray-50 transition shrink-0",
                                      isSec ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-md" : "border-gray-200 hover:border-gray-400"
                                    )}
                                  >
                                    <img src={img.image_url} alt={`Foto ${idx + 1}`} className="object-contain p-1 w-full h-full" />
                                    {isSec && (
                                      <div className="absolute inset-0 bg-emerald-500/10 flex items-end justify-center pb-1">
                                        <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">2</span>
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Controles da foto principal - só quando mainImage selecionado ou nada */}
                    <div className={cn("space-y-4 pt-2 border-t", selectedElement === 'secondaryImage' && 'hidden')}>
                      <p className="text-[11px] font-black text-gray-500 uppercase tracking-wide">📸 Enquadramento da Foto Principal</p>
                      {renderDualInput("mainImageScale", mainImageScale, setMainImageScale, 35, 160, "Escala (%)", marketingDefaults?.mainImageScale ?? 100)}
                      <div className="grid grid-cols-2 gap-4">
                        {renderDualInput("mainImageOffsetX", mainImageOffsetX, setMainImageOffsetX, -250, 250, "Posição X (px)", marketingDefaults?.mainImageOffsetX ?? 0)}
                        {renderDualInput("mainImageOffsetY", mainImageOffsetY, setMainImageOffsetY, -250, 250, "Posição Y (px)", marketingDefaults?.mainImageOffsetY ?? 0)}
                      </div>
                    </div>

                    {/* Controles da foto secundária inline - só quando secondaryImage selecionado ou nada */}
                    {showSecondaryImage && (
                      <div className={cn("space-y-4 pt-2 border-t", selectedElement === 'mainImage' && 'hidden')}>
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-wide">✨ Enquadramento da Foto Secundária</p>
                        {renderDualInput("secondaryImageScale", secondaryImageScale, setSecondaryImageScale, 30, 150, "Escala (%)", marketingDefaults?.secondaryImageScale ?? 100)}
                        <div className="grid grid-cols-2 gap-4">
                          {renderDualInput("secondaryImageOffsetX", secondaryImageOffsetX, setSecondaryImageOffsetX, -200, 200, "Posição X (px)", marketingDefaults?.secondaryImageOffsetX ?? 0)}
                          {renderDualInput("secondaryImageOffsetY", secondaryImageOffsetY, setSecondaryImageOffsetY, -200, 200, "Posição Y (px)", marketingDefaults?.secondaryImageOffsetY ?? 0)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* O Grupo 3 antigo foi removido pois a foto secundária agora está no Grupo 2 */}

                  {/* GRUPO 4: 🔥 Rótulo de Oportunidade */}
                  {activeProduct.opportunities && (
                    <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'opportunityBadge' && 'hidden')}>
                      <div className="flex items-center justify-between border-b pb-2">
                        <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                          🔥 Rótulo de Oportunidade ({activeProduct.opportunities.name})
                        </h5>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="show-opp" 
                            checked={showOpportunityBadge} 
                            onCheckedChange={(checked) => setShowOpportunityBadge(!!checked)} 
                          />
                          <Label htmlFor="show-opp" className="cursor-pointer text-xs font-bold text-gray-500">Exibir</Label>
                          {renderDefaultPin("showOpportunityBadge", showOpportunityBadge, marketingDefaults?.showOpportunityBadge !== false)}
                        </div>
                      </div>

                      {showOpportunityBadge && (
                        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                          <div className="grid grid-cols-2 gap-4">
                            {renderDualInput("oppScale", oppScale, setOppScale, 30, 200, "Escala (%)", marketingDefaults?.oppScale ?? 100)}
                            {renderDualInput("oppRotation", oppRotation, setOppRotation, -360, 360, "Rotação (°)", marketingDefaults?.oppRotation ?? 0)}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {renderDualInput("oppOffsetX", oppOffsetX, setOppOffsetX, 0, 1080, "Mover Horiz. (px)", marketingDefaults?.oppOffsetX ?? 50)}
                            {renderDualInput("oppOffsetY", oppOffsetY, setOppOffsetY, 0, 1080, "Mover Vert. (px)", marketingDefaults?.oppOffsetY ?? 220)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* GRUPO CABEÇALHO: brand e slogan juntos (aparecem para 'brand' ou 'slogan' ou quando nada selecionado) */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", !['brand', 'slogan'].includes(selectedElement) && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      🏢 Cabeçalho da Marca
                    </h5>

                    {/* Marca — ocultar se apenas slogan selecionado */}
                    <div className={cn("space-y-2", selectedElement === 'slogan' && 'hidden')}>
                      <div className="flex items-center justify-between gap-1">
                        <Label htmlFor="brandName" className="text-xs font-bold text-gray-700">Nome da Marca</Label>
                        {renderDefaultPin("brandName", brandName, marketingDefaults?.brandName ?? "MÓVEIS MORANTE")}
                      </div>
                      <Input 
                        id="brandName" 
                        value={brandName} 
                        onChange={(e) => setBrandName(e.target.value)} 
                        className="h-9 text-xs font-bold"
                      />
                      {renderDualInput("brandFontSize", brandFontSize, setBrandFontSize, 12, 72, "Tamanho da Fonte (px)", marketingDefaults?.brandFontSize ?? 42)}
                      <div className="grid grid-cols-2 gap-4">
                        {renderDualInput("brandOffsetX", brandOffsetX, setBrandOffsetX, 10, 600, "Posição X (px)", marketingDefaults?.brandOffsetX ?? 120)}
                        {renderDualInput("brandOffsetY", brandOffsetY, setBrandOffsetY, 10, 180, "Posição Y (px)", marketingDefaults?.brandOffsetY ?? 82)}
                      </div>
                    </div>

                    {/* Slogan — ocultar se apenas brand selecionado */}
                    <div className={cn("space-y-2 border-t pt-3", selectedElement === 'brand' && 'hidden')}>
                      <div className="flex items-center justify-between gap-1">
                        <Label htmlFor="slogan" className="text-xs font-bold text-gray-700">Slogan</Label>
                        {renderDefaultPin("slogan", slogan, marketingDefaults?.slogan ?? "Qualidade que cabe no seu bolso")}
                      </div>
                      <Input 
                        id="slogan" 
                        value={slogan} 
                        onChange={(e) => setSlogan(e.target.value)} 
                        className="h-9 text-xs font-bold"
                      />
                      {renderDualInput("sloganFontSize", sloganFontSize, setSloganFontSize, 10, 50, "Tamanho da Fonte (px)", marketingDefaults?.sloganFontSize ?? 20)}
                      <div className="grid grid-cols-2 gap-4">
                        {renderDualInput("sloganOffsetX", sloganOffsetX, setSloganOffsetX, 10, 600, "Posição X (px)", marketingDefaults?.sloganOffsetX ?? 120)}
                        {renderDualInput("sloganOffsetY", sloganOffsetY, setSloganOffsetY, 10, 190, "Posição Y (px)", marketingDefaults?.sloganOffsetY ?? 130)}
                      </div>
                    </div>
                  </div>

                  {/* GRUPO AVATAR: só aparece para 'avatar' ou quando nada selecionado */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'avatar' && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      🖼️ Avatar (Rodapé)
                    </h5>
                    {renderDualInput("avatarScale", avatarScale, setAvatarScale, 20, 200, "Escala (%)", marketingDefaults?.avatarScale ?? 100)}
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("avatarOffsetX", avatarOffsetX, setAvatarOffsetX, 0, 400, "Posição X (px)", marketingDefaults?.avatarOffsetX ?? 35)}
                      {renderDualInput("avatarOffsetY", avatarOffsetY, setAvatarOffsetY, 900, 1080, "Posição Y (px)", marketingDefaults?.avatarOffsetY ?? 938)}
                    </div>
                  </div>

                  {/* GRUPO TÍTULO ENDEREÇO: só aparece para 'footerTitle' ou quando nada selecionado */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'footerTitle' && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      📍 Título do Endereço (Rodapé)
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <Label htmlFor="footerAddressTitle" className="text-xs font-bold text-gray-700">Texto do Título</Label>
                        {renderDefaultPin("footerAddressTitle", footerAddressTitle, marketingDefaults?.footerAddressTitle ?? "VISITE NOSSA LOJA NO ENDEREÇO")}
                      </div>
                      <Input 
                        id="footerAddressTitle" 
                        value={footerAddressTitle} 
                        onChange={(e) => setFooterAddressTitle(e.target.value)} 
                        className="h-9 text-xs font-bold"
                      />
                    </div>
                    {renderDualInput("footerAddressTitleFontSize", footerAddressTitleFontSize, setFooterAddressTitleFontSize, 12, 40, "Tamanho da Fonte (px)", marketingDefaults?.footerAddressTitleFontSize ?? 24)}
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("footerAddressTitleOffsetX", footerAddressTitleOffsetX, setFooterAddressTitleOffsetX, 0, 800, "Posição X (px)", marketingDefaults?.footerAddressTitleOffsetX ?? 175)}
                      {renderDualInput("footerAddressTitleOffsetY", footerAddressTitleOffsetY, setFooterAddressTitleOffsetY, 930, 1080, "Posição Y (px)", marketingDefaults?.footerAddressTitleOffsetY ?? 988)}
                    </div>
                  </div>

                  {/* GRUPO ENDEREÇO: só aparece para 'footerAddress' ou quando nada selecionado */}
                  <div className={cn("bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 space-y-4 shadow-sm", selectedElement !== 'footerAddress' && 'hidden')}>
                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2">
                      🏠 Endereço Completo (Rodapé)
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <Label htmlFor="footerAddressText" className="text-xs font-bold text-gray-700">Texto do Endereço</Label>
                        {renderDefaultPin("footerAddressText", footerAddressText, marketingDefaults?.footerAddressText ?? "RUA CASCAVEL, 306, GUARAITUBA, COLOMBO")}
                      </div>
                      <Input 
                        id="footerAddressText" 
                        value={footerAddressText} 
                        onChange={(e) => setFooterAddressText(e.target.value)} 
                        className="h-9 text-xs font-bold"
                      />
                    </div>
                    {renderDualInput("footerAddressTextFontSize", footerAddressTextFontSize, setFooterAddressTextFontSize, 12, 40, "Tamanho da Fonte (px)", marketingDefaults?.footerAddressTextFontSize ?? 28)}
                    <div className="grid grid-cols-2 gap-4">
                      {renderDualInput("footerAddressTextOffsetX", footerAddressTextOffsetX, setFooterAddressTextOffsetX, 0, 800, "Posição X (px)", marketingDefaults?.footerAddressTextOffsetX ?? 175)}
                      {renderDualInput("footerAddressTextOffsetY", footerAddressTextOffsetY, setFooterAddressTextOffsetY, 930, 1080, "Posição Y (px)", marketingDefaults?.footerAddressTextOffsetY ?? 1032)}
                    </div>
                  </div>
                </div>

                {/* Preview e Salvar no Modal (Direita) */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center bg-gray-50/50 p-4 lg:p-6 rounded-3xl border border-dashed border-gray-200">
                  <div className="flex items-center justify-between w-full max-w-[420px] mb-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visualização Real do Post (1:1)</h4>
                    {selectedElement ? (
                      <button
                        type="button"
                        onClick={() => setSelectedElement(null)}
                        className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
                      >
                        <ChevronLeft className="h-3 w-3" /> Ver todos
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <MousePointer2 className="h-3 w-3" /> Clique para selecionar
                      </span>
                    )}
                  </div>
                  
                  {/* Canvas real — o que você vê é exatamente o que sai no download */}
                  <div className="relative w-full max-w-[420px] aspect-square mb-6 rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-gray-100 flex items-center justify-center">
                    <canvas
                      ref={previewCanvasRef}
                      width={1080}
                      height={1080}
                      className="w-full h-full outline-none"
                      style={{ imageRendering: "crisp-edges", cursor: selectedElement ? "move" : "crosshair" }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUpOrLeave}
                      onMouseLeave={handleMouseUpOrLeave}
                      onKeyDown={handleKeyDown}
                      tabIndex={0}
                    />
                    {/* Loader enquanto carrega */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity" id="preview-loader">
                      <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                    </div>
                  </div>
 
                  <div className="flex flex-col gap-3 w-full max-w-[420px]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button 
                        type="button"
                        onClick={handleDownloadOnly} 
                        className="w-full gap-2 rounded-full h-11 font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 text-xs"
                      >
                        <Download className="h-4 w-4" />
                        Exportar PNG
                      </Button>
                      
                      <Button 
                        type="button"
                        onClick={handleShareWhatsApp} 
                        className="w-full gap-2 rounded-full h-11 font-bold bg-[#25D366] hover:bg-[#20ba56] text-white shadow-md shadow-[#25D366]/20 text-xs"
                      >
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-2.911c1.597.947 3.393 1.448 5.166 1.449 5.519 0 10.01-4.496 10.014-10.02.002-2.677-1.03-5.195-2.905-7.072C17.24 3.568 14.73 2.527 12.012 2.527c-5.524 0-10.017 4.496-10.021 10.02-.001 1.902.501 3.759 1.456 5.434L2.43 21.722l3.856-1.012a9.907 9.907 0 0 0 4.606 1.144zM17.15 15.3c-.282-.141-1.67-.824-1.928-.918-.258-.094-.446-.141-.634.141-.188.281-.727.918-.891 1.102-.164.183-.328.207-.61.066a8.91 8.91 0 0 1-2.557-1.579c-.888-.792-1.488-1.77-1.662-2.069-.174-.299-.018-.46.123-.601.127-.127.282-.328.423-.492.142-.164.188-.281.282-.469.094-.188.047-.352-.023-.492-.071-.141-.634-1.527-.868-2.09-.228-.549-.46-.474-.634-.482-.164-.008-.352-.01-.54-.01s-.493.07-.751.352c-.258.281-.986.963-.986 2.348s1.01 2.72 1.15 2.908c.141.188 1.986 3.033 4.811 4.25.672.29 1.196.463 1.605.593.675.214 1.289.184 1.774.111.54-.082 1.67-.682 1.905-1.34s.235-1.221.164-1.34c-.07-.12-.258-.188-.54-.328z"/>
                        </svg>
                        WhatsApp
                      </Button>
                    </div>
 
                    <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsModalOpen(false)}
                        className="w-full rounded-full h-10 font-medium text-gray-500 hover:text-gray-700"
                      >
                        Fechar Editor
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </form>
            {/* Modal de Camadas */}
            {isLayersModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl border border-gray-150 max-w-sm w-full p-6 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h4 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      Camadas do Post
                    </h4>
                    <button 
                      onClick={() => setIsLayersModalOpen(false)}
                      className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                    Selecione uma camada para editar no painel lateral:
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
                    {getHitRegions().map((region) => {
                      const isSelected = selectedElement === region.key
                      return (
                        <button
                          key={region.key}
                          type="button"
                          onClick={() => {
                            setSelectedElement(region.key as any)
                            setIsLayersModalOpen(false)
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-left font-bold text-xs border transition-all",
                            isSelected 
                              ? "bg-primary/10 border-primary text-primary" 
                              : "bg-gray-50 border-gray-150 text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <span>{region.label}</span>
                          <span className="text-[10px] text-gray-400 font-normal italic">#{region.key}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
