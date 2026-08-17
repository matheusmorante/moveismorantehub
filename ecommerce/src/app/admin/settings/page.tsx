"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Palette, Save, Sparkles, Share2, Layers, ImagePlay, ArrowRight, Search, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { defaultProductCardStyle, ProductCardStyle, productCardStyleClasses } from "@/lib/product-card-style"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import Image from "next/image"

const options = {
  border_width: [["thin", "Fina"], ["medium", "Média"], ["strong", "Marcante"]],
  border_radius: [["square", "Reto"], ["soft", "Suave"], ["rounded", "Arredondado"]],
  shadow: [["none", "Sem sombra"], ["soft", "Suave"], ["elevated", "Destacada"]],
  opportunity_emphasis: [["subtle", "Discreto"], ["highlighted", "Em destaque"], ["animated", "Pulsante"]],
  button_style: [["standard", "Cantos suaves"], ["rounded", "Pílula"]],
} as const

const labels: Record<keyof ProductCardStyle, string> = {
  border_width: "Espessura da borda", border_radius: "Formato do card", shadow: "Sombra",
  opportunity_emphasis: "Destaque de oportunidade", button_style: "Formato dos botões",
}

interface FacebookCatalogSettings {
  global_description_prefix: string
  meta_access_token?: string
  meta_catalog_id?: string
  column_mappings: {
    brand: string
    condition: string
    gender: string
    age_group: string
  }
}

interface MarketingDefaults {
  mainImageScale: number
  secondaryImageScale: number
  mainImageOffsetX: number
  mainImageOffsetY: number
  secondaryImageOffsetX: number
  secondaryImageOffsetY: number
  showSecondaryImage: boolean
  showOpportunityBadge: boolean
  mainImageIndex: number
  secondaryImageIndex: number
  installmentsText: string
  brandName: string
  brandFontSize: number
  brandOffsetX: number
  brandOffsetY: number
  slogan: string
  sloganFontSize: number
  sloganOffsetX: number
  sloganOffsetY: number
}

const DEFAULT_MARKETING: MarketingDefaults = {
  mainImageScale: 100,
  secondaryImageScale: 100,
  mainImageOffsetX: 0,
  mainImageOffsetY: 0,
  secondaryImageOffsetX: 0,
  secondaryImageOffsetY: 0,
  showSecondaryImage: true,
  showOpportunityBadge: true,
  mainImageIndex: 0,
  secondaryImageIndex: 1,
  installmentsText: "Em até 10x sem juros nas principais bandeiras de cartão",
  brandName: "MÓVEIS MORANTE",
  brandFontSize: 42,
  brandOffsetX: 120,
  brandOffsetY: 82,
  slogan: "Qualidade que cabe no seu bolso",
  sloganFontSize: 20,
  sloganOffsetX: 120,
  sloganOffsetY: 130,
}

export default function SettingsPage() {
  const [style, setStyle] = useState<ProductCardStyle>(defaultProductCardStyle)
  const [catalogSettings, setCatalogSettings] = useState<FacebookCatalogSettings>({
    global_description_prefix: "",
    meta_access_token: "",
    meta_catalog_id: "",
    column_mappings: {
      brand: "Móveis Morante",
      condition: "new",
      gender: "unisex",
      age_group: "adult"
    }
  })
  const [marketingDefaults, setMarketingDefaults] = useState<MarketingDefaults>(DEFAULT_MARKETING)
  const [previewProduct, setPreviewProduct] = useState<any>(null)
  const [previewSearch, setPreviewSearch] = useState("")
  const [previewProducts, setPreviewProducts] = useState<any[]>([])
  const [showPreviewDropdown, setShowPreviewDropdown] = useState(false)
  const settingsPreviewRef = useRef<HTMLCanvasElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      setLoading(true)
      try {
        const [styleRes, catRes] = await Promise.all([
          supabase.from("store_style_settings").select("border_width, border_radius, shadow, opportunity_emphasis, button_style, marketing_defaults").eq("id", true).maybeSingle(),
          supabase.from("facebook_catalog_settings").select("global_description_prefix, column_mappings, meta_access_token, meta_catalog_id").eq("id", true).maybeSingle()
        ])

        if (styleRes.error) {
          toast.error("Não foi possível carregar os estilos.")
        } else if (styleRes.data) {
          const { marketing_defaults, ...styleData } = styleRes.data as any
          setStyle(styleData as ProductCardStyle)
          if (marketing_defaults && typeof marketing_defaults === "object") {
            setMarketingDefaults({ ...DEFAULT_MARKETING, ...marketing_defaults })
          }
        }

        if (catRes.data) {
          setCatalogSettings({
            global_description_prefix: catRes.data.global_description_prefix || "",
            meta_access_token: catRes.data.meta_access_token || "",
            meta_catalog_id: catRes.data.meta_catalog_id || "",
            column_mappings: {
              brand: catRes.data.column_mappings?.brand || "Móveis Morante",
              condition: catRes.data.column_mappings?.condition || "new",
              gender: catRes.data.column_mappings?.gender || "unisex",
              age_group: catRes.data.column_mappings?.age_group || "adult"
            }
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const updateStyle = (key: keyof ProductCardStyle, value: string) => setStyle((current) => ({ ...current, [key]: value } as ProductCardStyle))
  const updateMktDefault = <K extends keyof MarketingDefaults>(key: K, value: MarketingDefaults[K]) =>
    setMarketingDefaults(prev => ({ ...prev, [key]: value }))

  // Carrega lista de produtos para o preview
  useEffect(() => {
    supabase.from("products").select("id, name, price, promo_price, product_images(image_url, is_main)").limit(100)
      .then(({ data }) => { if (data) setPreviewProducts(data) })
  }, [])

  // Redesenha o canvas de preview quando os defaults mudam
  const drawSettingsPreview = useCallback(async () => {
    if (!settingsPreviewRef.current || !previewProduct) return
    const canvas = settingsPreviewRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const S = canvas.width / 1080
    const d = marketingDefaults

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((res) => {
        const img = new window.Image(); img.crossOrigin = "anonymous"; img.src = src
        img.onload = () => res(img); img.onerror = () => res(null as any)
      })

    const images = previewProduct.product_images || []
    const mainUrl = images[d.mainImageIndex]?.image_url || images[0]?.image_url || ""
    const secUrl = images[d.secondaryImageIndex]?.image_url || images[1]?.image_url || ""

    const [headerBg, mainImg, secImg] = await Promise.all([
      loadImg("/images/banner-header-bg.png"),
      mainUrl ? loadImg(mainUrl) : Promise.resolve(null as any),
      (secUrl && d.showSecondaryImage) ? loadImg(secUrl) : Promise.resolve(null as any),
    ])

    // Fundo cabeçalho
    ctx.fillStyle = "#0c1523"
    ctx.fillRect(0, 0, 1080 * S, 200 * S)
    if (headerBg) {
      const tW = 1080 * 0.70 * S, tH = 200 * S, tX = 1080 * S - tW
      const srcH = headerBg.height, srcW = srcH * (tW / tH)
      ctx.drawImage(headerBg, (headerBg.width - srcW) / 2, 0, srcW, srcH, tX, 0, tW, tH)
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(tX, 0, tW, tH)
    }
    // Textos do cabeçalho da marca (dinâmico e ajustável das configurações)
    const brandNameStr = d.brandName || "MÓVEIS MORANTE"
    const brandSize = d.brandFontSize || 42
    const brandX = d.brandOffsetX ?? 120
    const brandY = d.brandOffsetY ?? 82
    
    ctx.font = `italic bold ${brandSize * S}px 'Segoe UI', Arial, sans-serif`
    ctx.fillStyle = "#ffffff"
    
    // Se a marca começa com MÓVEIS MORANTE, vamos pintar o "MÓVEIS" de branco e "MORANTE" de dourado.
    // Caso seja outra marca, pintamos de branco.
    if (brandNameStr.toUpperCase().startsWith("MÓVEIS MORANTE")) {
      const p1 = "MÓVEIS "
      const p2 = brandNameStr.substring(7) // resto da string (geralmente "MORANTE" ou com variações)
      ctx.fillText(p1, brandX * S, brandY * S)
      const p1W = ctx.measureText(p1).width
      ctx.fillStyle = "#e0a96d"
      ctx.fillText(p2, brandX * S + p1W, brandY * S)
    } else {
      ctx.fillText(brandNameStr, brandX * S, brandY * S)
    }
    
    // Linha separadora dourada (posicionada em relação ao Y da marca)
    ctx.strokeStyle = "#e0a96d"
    ctx.lineWidth = 3 * S
    ctx.beginPath()
    ctx.moveTo(brandX * S, (brandY + 11) * S)
    ctx.lineTo((brandX + 320) * S, (brandY + 11) * S)
    ctx.stroke()
    
    // Subtítulo slogan dinâmico e ajustável
    const sloganText = d.slogan || "Qualidade que cabe no seu bolso"
    const sloganSize = d.sloganFontSize || 20
    const sloganX = d.sloganOffsetX ?? 120
    const sloganY = d.sloganOffsetY ?? 130
    
    ctx.fillStyle = "rgba(243, 244, 246, 0.85)"
    ctx.font = `${sloganSize * S}px 'Segoe UI', Arial, sans-serif`
    ctx.fillText(sloganText, sloganX * S, sloganY * S)

    // Imagem principal
    const getBBox = (img: HTMLImageElement) => ({ x: 0, y: 0, w: img.width, h: img.height })
    if (mainImg) {
      const box = getBBox(mainImg)
      const area = 550 * S * (d.mainImageScale / 100)
      const sc = Math.min(area / box.w, area / box.h)
      const dw = box.w * sc, dh = box.h * sc
      const dx = (50 + (550 - dw/S) / 2) * S + d.mainImageOffsetX * S
      const dy = (240 + (550 - dh/S) / 2) * S + d.mainImageOffsetY * S
      ctx.drawImage(mainImg, 0, 0, box.w, box.h, dx, dy, dw, dh)
    }

    // Imagem secundária
    if (secImg && d.showSecondaryImage) {
      const box = getBBox(secImg)
      const area = 380 * S * (d.secondaryImageScale / 100)
      const sc = Math.min(area / box.w, area / box.h)
      const dw = box.w * sc, dh = box.h * sc
      const dx = (650 + (380 - dw/S) / 2) * S + d.secondaryImageOffsetX * S
      const dy = (240 + (380 - dh/S) / 2) * S + d.secondaryImageOffsetY * S
      ctx.drawImage(secImg, 0, 0, box.w, box.h, dx, dy, dw, dh)
    }

    // Título e preço (simplificado)
    const price = previewProduct.promo_price || previewProduct.price || 0
    ctx.fillStyle = "#111827"; ctx.font = `bold ${34*S}px Arial,sans-serif`
    const words = previewProduct.name.split(" ")
    let line = "", titleY = 665 * S
    for (let n = 0; n < words.length; n++) {
      const t = line + words[n] + " "
      if (ctx.measureText(t).width > 380 * S && n > 0) { ctx.fillText(line, 650*S, titleY); line = words[n] + " "; titleY += 40*S } else line = t
    }
    ctx.fillText(line, 650*S, titleY)
    ctx.fillStyle = "#000"; ctx.font = `900 ${62*S}px Arial,sans-serif`
    ctx.fillText(price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 650*S, titleY + 80*S)

    // Parcelamento
    ctx.fillStyle = "#1f2937"; ctx.font = `bold ${26*S}px Arial,sans-serif`; ctx.textAlign = "center"
    ctx.fillText(d.installmentsText, 540*S, 895*S); ctx.textAlign = "left"

    // Rodapé
    ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 930*S, 1080*S, 150*S)
    ctx.fillStyle = "#e0a96d"; ctx.font = `bold ${24*S}px Arial,sans-serif`; ctx.fillText("VISITE NOSSA LOJA NO ENDEREÇO", 50*S, 978*S)
    ctx.fillStyle = "#fff"; ctx.font = `bold ${28*S}px Arial,sans-serif`; ctx.fillText("RUA CASCAVEL, 306, GUARAITUBA, COLOMBO", 50*S, 1025*S)
  }, [previewProduct, marketingDefaults])

  useEffect(() => {
    const t = setTimeout(drawSettingsPreview, 80)
    return () => clearTimeout(t)
  }, [drawSettingsPreview])

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const [styleRes, catRes] = await Promise.all([
        supabase.from("store_style_settings").upsert({ id: true, ...style, marketing_defaults: marketingDefaults }),
        supabase.from("facebook_catalog_settings").upsert({ 
          id: true, 
          global_description_prefix: catalogSettings.global_description_prefix,
          meta_access_token: catalogSettings.meta_access_token,
          meta_catalog_id: catalogSettings.meta_catalog_id,
          column_mappings: catalogSettings.column_mappings
        })
      ])

      if (styleRes.error) throw styleRes.error
      if (catRes.error) throw catRes.error

      toast.success("Todas as configurações foram salvas com sucesso!")
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar as configurações.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Palette className="h-6 w-6 text-primary" /> Configurações Gerais
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie o estilo visual da loja e a integração do catálogo do Facebook Meta.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <div className="space-y-6">
          {/* Estilos */}
          <Card>
            <CardHeader>
              <CardTitle>Cards de produto</CardTitle>
              <CardDescription>
                As cores da borda e do badge de cada oportunidade continuam sendo definidas em "Oportunidades".
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {(Object.keys(options) as (keyof ProductCardStyle)[]).map((key) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">{labels[key]}</label>
                  <Select value={style[key]} onValueChange={(value) => updateStyle(key, value)} disabled={loading}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options[key].map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>


          {/* Configurações do Catálogo Meta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-blue-600" />
                Configurações do Catálogo Meta
              </CardTitle>
              <CardDescription>
                Configure os mapeamentos de colunas para o feed CSV e a descrição inicial global dos produtos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Descrição Base Inicial Global</label>
                <Textarea 
                  placeholder="Texto que aparecerá no início da descrição de todos os produtos no catálogo do Meta..."
                  value={catalogSettings.global_description_prefix}
                  onChange={(e) => setCatalogSettings(prev => ({ ...prev, global_description_prefix: e.target.value }))}
                  className="min-h-24 text-xs font-bold"
                  disabled={loading}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Token de Acesso da API do Meta (Access Token)</label>
                  <Input 
                    value={catalogSettings.meta_access_token}
                    placeholder="Cole o token EAATYy..."
                    onChange={(e) => setCatalogSettings(prev => ({ ...prev, meta_access_token: e.target.value }))}
                    className="h-10 text-xs font-bold"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">ID do Catálogo do Meta (Catalog ID)</label>
                  <Input 
                    value={catalogSettings.meta_catalog_id}
                    placeholder="Ex: 2597693034029026"
                    onChange={(e) => setCatalogSettings(prev => ({ ...prev, meta_catalog_id: e.target.value }))}
                    className="h-10 text-xs font-bold"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-gray-400" /> Mapeamento de Colunas (Valores Fixos)
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700">Marca (brand)</label>
                    <Input 
                      value={catalogSettings.column_mappings.brand}
                      onChange={(e) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        column_mappings: { ...prev.column_mappings, brand: e.target.value } 
                      }))}
                      className="h-10 text-xs font-bold"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700">Condição (condition)</label>
                    <Select 
                      value={catalogSettings.column_mappings.condition}
                      onValueChange={(val) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        column_mappings: { ...prev.column_mappings, condition: val } 
                      }))}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10 text-xs font-bold w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Novo (new)</SelectItem>
                        <SelectItem value="used">Usado (used)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700">Gênero (gender)</label>
                    <Select 
                      value={catalogSettings.column_mappings.gender}
                      onValueChange={(val) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        column_mappings: { ...prev.column_mappings, gender: val } 
                      }))}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10 text-xs font-bold w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unisex">Unissex (unisex)</SelectItem>
                        <SelectItem value="female">Feminino (female)</SelectItem>
                        <SelectItem value="male">Masculino (male)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700">Faixa Etária (age_group)</label>
                    <Select 
                      value={catalogSettings.column_mappings.age_group}
                      onValueChange={(val) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        column_mappings: { ...prev.column_mappings, age_group: val } 
                      }))}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10 text-xs font-bold w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adult">Adulto (adult)</SelectItem>
                        <SelectItem value="all ages">Todas as idades (all ages)</SelectItem>
                        <SelectItem value="kids">Crianças (kids)</SelectItem>
                        <SelectItem value="teen">Adolescente (teen)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prévia */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card className="bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-amber-500" /> Prévia do Card
              </CardTitle>
            </CardHeader>
            <CardContent>
              <article className={cn(
                "overflow-hidden border-orange-500 bg-white text-left transition-all",
                productCardStyleClasses.border_width[style.border_width],
                productCardStyleClasses.border_radius[style.border_radius],
                productCardStyleClasses.shadow[style.shadow]
              )}>
                <div className="relative h-32 bg-gradient-to-br from-slate-200 to-slate-300">
                  <span className={cn(
                    "absolute right-2 top-2 bg-red-600 px-2 py-1 text-[9px] font-black uppercase text-white",
                    productCardStyleClasses.opportunity_emphasis[style.opportunity_emphasis],
                    style.border_radius === "rounded" ? "rounded-full" : "rounded-lg"
                  )}>
                    Liquidação
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold">Sofá Retrátil</p>
                  <p className="mt-1 text-lg font-bold text-[#00A650]">R$ 1.899,90</p>
                  <button className={cn(
                    "mt-3 w-full bg-[#25D366] py-2 text-xs font-bold text-white",
                    productCardStyleClasses.button_style[style.button_style]
                  )}>
                    Fazer pedido
                  </button>
                </div>
              </article>
            </CardContent>
          </Card>
          <Button className="w-full gap-2 font-bold shadow-lg" onClick={handleSaveAll} disabled={saving || loading}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>

          {/* Seção de Sincronização Instantânea via Catalog API */}
          <Card className="border border-blue-100 bg-blue-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-blue-700 flex items-center gap-1.5">
                <Share2 className="h-4 w-4" /> Sincronização Ativa
              </CardTitle>
              <CardDescription className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Envie e atualize todos os produtos e variações em tempo real no Meta (WhatsApp/Instagram) sem ter que esperar a leitura automática agendada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                className="w-full text-xs font-bold border-blue-300 hover:border-blue-400 hover:bg-blue-50 text-blue-700 gap-1.5 h-10 shadow-sm transition-all active:scale-98"
                onClick={async () => {
                  const toastId = toast.loading("Sincronizando produtos com o catálogo do Meta...")
                  try {
                    const response = await fetch("/api/facebook-catalog/sync", {
                      method: "POST"
                    })
                    const resData = await response.json()
                    if (!response.ok) {
                      throw new Error(resData.error || "Erro desconhecido na sincronização.")
                    }
                    toast.success("Catálogo do Meta atualizado com sucesso!", { id: toastId })
                  } catch (err: any) {
                    toast.error("Falha ao sincronizar: " + err.message, { id: toastId })
                  }
                }}
                disabled={loading || saving}
              >
                Atualizar Catálogo Meta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
