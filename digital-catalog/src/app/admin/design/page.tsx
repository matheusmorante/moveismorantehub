"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Loader2, Pencil, Zap, Power, PowerOff, Palette, Sparkles, Save, Image as ImageIcon, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { Database } from "@/types/database"
import { defaultStoreDesignSettings, ProductCardStyle, StoreDesignSettings, productCardStyleClasses } from "@/lib/product-card-style"
import { cn } from "@/lib/utils"
import { uploadToR2 } from "@/lib/utils/upload-r2"

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"]

const BADGE_COLOR_OPTIONS = [
  { value: "bg-red-600", label: "Vermelho", preview: "bg-red-600" },
  { value: "bg-amber-600", label: "Âmbar", preview: "bg-amber-600" },
  { value: "bg-purple-600", label: "Roxo", preview: "bg-purple-600" },
  { value: "bg-blue-600", label: "Azul", preview: "bg-blue-600" },
  { value: "bg-green-600", label: "Verde", preview: "bg-green-600" },
  { value: "bg-pink-600", label: "Rosa", preview: "bg-pink-600" },
  { value: "bg-orange-600", label: "Laranja", preview: "bg-orange-600" },
  { value: "bg-teal-600", label: "Teal", preview: "bg-teal-600" },
]

const BORDER_COLOR_OPTIONS = [
  { value: "border-gray-100", label: "Padrão (Cinza Sutil)", preview: "border-gray-200" },
  { value: "border-orange-500", label: "Laranja", preview: "border-orange-500" },
  { value: "border-amber-500", label: "Âmbar", preview: "border-amber-500" },
  { value: "border-purple-500", label: "Roxo", preview: "border-purple-500" },
  { value: "border-blue-500", label: "Azul", preview: "border-blue-500" },
  { value: "border-red-500", label: "Vermelho", preview: "border-red-500" },
  { value: "border-green-500", label: "Verde", preview: "border-green-500" },
  { value: "border-pink-500", label: "Rosa", preview: "border-pink-500" },
  { value: "border-teal-500", label: "Teal", preview: "border-teal-500" },
]

const BORDER_STYLE_OPTIONS = [
  { value: "solid", label: "Sólida", className: "border-solid" },
  { value: "dashed", label: "Tracejada", className: "border-dashed" },
  { value: "dotted", label: "Pontilhada", className: "border-dotted" },
  { value: "double", label: "Dupla (Espessa)", className: "border-double border-4" },
]

const BADGE_ANIMATION_OPTIONS = [
  { value: "none", label: "Sem Animação", className: "" },
  { value: "pulse", label: "Pulsar (Suave)", className: "animate-pulse" },
  { value: "bounce", label: "Flutuar (Destaque)", className: "animate-bounce" },
]

const designOptions = {
  border_width: [["thin", "Fina"], ["medium", "Média"], ["strong", "Marcante"]],
  border_radius: [["square", "Reto"], ["soft", "Suave"], ["rounded", "Arredondado"]],
  shadow: [["none", "Sem sombra"], ["soft", "Suave"], ["elevated", "Destacada"]],
  opportunity_emphasis: [["subtle", "Discreto"], ["highlighted", "Em destaque"], ["animated", "Pulsante"]],
  button_style: [["standard", "Cantos suaves"], ["rounded", "Pílula"]],
} as const

const designLabels: Record<keyof ProductCardStyle, string> = {
  border_width: "Espessura da borda",
  border_radius: "Formato do card",
  shadow: "Sombra",
  opportunity_emphasis: "Destaque de oportunidade",
  button_style: "Formato dos botões",
}

const generateSlug = (text: string) =>
  text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

export default function DesignPage() {
  const [activeTab, setActiveTab] = useState("cards")

  // --- Estados do Design Global ---
  const [globalStyle, setGlobalStyle] = useState<StoreDesignSettings>(defaultStoreDesignSettings)
  const [globalLoading, setGlobalLoading] = useState(true)
  const [globalSaving, setGlobalSaving] = useState(false)

  // --- Estados das Oportunidades ---
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [oppLoading, setOppLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [oppSaving, setOppSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    badge_color: "bg-red-600",
    border_color: "border-orange-500",
    border_style: "solid",
    badge_animation: "pulse",
    active: true,
    observations: "",
    title_color: "",
  })
  const [autoSlug, setAutoSlug] = useState(true)

  // --- Estados dos Banners ---
  const [banners, setBanners] = useState<any[]>([])
  const [bannersLoading, setBannersLoading] = useState(true)
  const [isBannerDialogOpen, setIsBannerDialogOpen] = useState(false)
  const [isBannerSaving, setIsBannerSaving] = useState(false)
  const [isBannerUploading, setIsBannerUploading] = useState(false)
  const [currentBanner, setCurrentBanner] = useState<any>(null)
  const [bannerFormData, setBannerFormData] = useState({ title: "", image_url: "", link_url: "", active: true })

  // Carregar dados
  useEffect(() => {
    loadGlobalStyle()
    fetchOpportunities()
    fetchBanners()
  }, [])

  async function loadGlobalStyle() {
    setGlobalLoading(true)
    try {
      const { data, error } = await supabase
        .from("store_style_settings")
        .select("border_width, border_radius, shadow, opportunity_emphasis, button_style, product_image_fit, primary_color, accent_color, background_color, hero_overlay, product_grid_columns, product_grid_gap")
        .eq("id", true)
        .maybeSingle()

      if (error) {
        // Erro real de consulta — usar valores padrão silenciosamente
        console.error("Erro ao carregar estilos:", error)
        setGlobalStyle(defaultStoreDesignSettings)
      } else if (data) {
        // Mesclar com os padrões para preencher campos ausentes (schema mais recente)
        setGlobalStyle({ ...defaultStoreDesignSettings, ...data } as StoreDesignSettings)
      } else {
        // Nenhum registro encontrado — criar com valores padrão
        setGlobalStyle(defaultStoreDesignSettings)
        await supabase.from("store_style_settings").upsert({ id: true, ...defaultStoreDesignSettings })
      }
    } catch (err) {
      console.error("Erro inesperado ao carregar estilos:", err)
      setGlobalStyle(defaultStoreDesignSettings)
    } finally {
      setGlobalLoading(false)
    }
  }

  async function saveGlobalStyle() {
    setGlobalSaving(true)
    const { error } = await supabase.from("store_style_settings").upsert({ id: true, ...globalStyle })
    setGlobalSaving(false)
    if (error) {
      return toast.error(error.message || "Não foi possível salvar os estilos")
    }
    toast.success("Estilos globais salvos com sucesso!")
  }

  const updateGlobalStyle = (key: keyof StoreDesignSettings, value: string) => {
    setGlobalStyle((current) => ({ ...current, [key]: value } as StoreDesignSettings))
  }

  async function fetchOpportunities() {
    setOppLoading(true)
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      toast.error("Erro ao carregar oportunidades")
    }
    setOpportunities(data || [])
    setOppLoading(false)
  }

  function resetForm() {
    setFormData({
      name: "",
      slug: "",
      badge_color: "bg-red-600",
      border_color: "border-orange-500",
      border_style: "solid",
      badge_animation: "pulse",
      active: true,
      observations: "",
      title_color: "",
    })
    setAutoSlug(true)
    setEditingId(null)
  }

  // --- Funções dos Banners ---
  async function fetchBanners() {
    setBannersLoading(true)
    const { data, error } = await supabase.from("banners").select("*").order("created_at", { ascending: false })
    if (error) toast.error("Erro ao carregar banners")
    else setBanners(data || [])
    setBannersLoading(false)
  }

  const openBannerDialog = (banner: any = null) => {
    setCurrentBanner(banner)
    setBannerFormData(banner
      ? { title: banner.title || "", image_url: banner.image_url, link_url: banner.link_url || "", active: banner.active }
      : { title: "", image_url: "", link_url: "", active: true }
    )
    setIsBannerDialogOpen(true)
  }

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsBannerUploading(true)
    try {
      const fileName = `banner-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`
      const publicUrl = await uploadToR2(file, fileName)
      setBannerFormData(prev => ({ ...prev, image_url: publicUrl }))
      toast.success("Imagem enviada!")
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message)
    } finally {
      setIsBannerUploading(false)
    }
  }

  const handleBannerSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bannerFormData.image_url) { toast.error("Selecione uma imagem!"); return }
    setIsBannerSaving(true)
    try {
      const payload = { title: bannerFormData.title, image_url: bannerFormData.image_url, link_url: bannerFormData.link_url, active: bannerFormData.active }
      if (currentBanner) {
        const { error } = await supabase.from("banners").update(payload).eq("id", currentBanner.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("banners").insert([payload])
        if (error) throw error
      }
      toast.success("Banner salvo!")
      setIsBannerDialogOpen(false)
      fetchBanners()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsBannerSaving(false)
    }
  }

  const handleBannerDelete = async (id: string) => {
    if (!confirm("Excluir este banner?")) return
    const { error } = await supabase.from("banners").delete().eq("id", id)
    if (error) toast.error(error.message)
    else { toast.success("Banner excluído!"); fetchBanners() }
  }

  const toggleBannerActive = async (banner: any) => {
    const { error } = await supabase.from("banners").update({ active: !banner.active }).eq("id", banner.id)
    if (error) toast.error(error.message)
    else { toast.success(banner.active ? "Banner desativado!" : "Banner ativado!"); fetchBanners() }
  }

  function openCreateModal() {
    resetForm()
    setIsModalOpen(true)
  }

  function openEditModal(opp: Opportunity) {
    setEditingId(opp.id)
    setFormData({
      name: opp.name,
      slug: opp.slug,
      badge_color: opp.badge_color,
      border_color: opp.border_color,
      border_style: opp.border_style || "solid",
      badge_animation: opp.badge_animation || "pulse",
      active: opp.active,
      observations: opp.observations || "",
      title_color: opp.title_color || "",
    })
    setAutoSlug(false)
    setIsModalOpen(true)
  }

  async function handleSaveOpp() {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error("Nome e slug são obrigatórios")
      return
    }

    setOppSaving(true)
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        badge_color: formData.badge_color,
        border_color: formData.border_color,
        border_style: formData.border_style,
        badge_animation: formData.badge_animation,
        active: formData.active,
        observations: formData.observations,
        title_color: formData.title_color || null,
      }

      if (editingId) {
        const { error } = await supabase
          .from("opportunities")
          .update(payload)
          .eq("id", editingId)

        if (error) throw error
        toast.success("Oportunidade atualizada!")
      } else {
        const { error } = await supabase
          .from("opportunities")
          .insert([payload])

        if (error) throw error
        toast.success("Oportunidade criada!")
      }

      setIsModalOpen(false)
      resetForm()
      fetchOpportunities()
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar")
    } finally {
      setOppSaving(false)
    }
  }

  async function handleToggleOppActive(opp: Opportunity) {
    const { error } = await supabase
      .from("opportunities")
      .update({ active: !opp.active })
      .eq("id", opp.id)

    if (error) {
      toast.error("Erro ao atualizar status")
      return
    }

    toast.success(opp.active ? "Oportunidade desativada" : "Oportunidade ativada")
    fetchOpportunities()
  }

  async function handleDeleteOpp(id: string) {
    await supabase.from("products").update({ opportunity_id: null }).eq("opportunity_id", id)
    const { error } = await supabase.from("opportunities").delete().eq("id", id)

    if (error) {
      toast.error("Erro ao excluir oportunidade")
      return
    }

    toast.success("Oportunidade excluída")
    setDeleteConfirmId(null)
    fetchOpportunities()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" /> Estilos & Design do Site
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize a identidade visual, formato dos cards de produto, bordas e badges de oportunidades.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-white p-1 rounded-xl border">
          <TabsTrigger value="cards" className="rounded-lg font-bold gap-2">
            <Palette className="h-4 w-4" /> Layout dos Cards
          </TabsTrigger>
          <TabsTrigger value="product-list" className="rounded-lg font-bold gap-2">
            <Palette className="h-4 w-4" /> Lista de Produtos
          </TabsTrigger>
          <TabsTrigger value="identity" className="rounded-lg font-bold gap-2">
            <Sparkles className="h-4 w-4" /> Cores & Identidade
          </TabsTrigger>
          <TabsTrigger value="banner" className="rounded-lg font-bold gap-2">
            <Palette className="h-4 w-4" /> Banners & Chamadas
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="rounded-lg font-bold gap-2">
            <Zap className="h-4 w-4" /> Oportunidades & Borda de Cards
          </TabsTrigger>
        </TabsList>

        {/* ABA: LAYOUT DOS CARDS */}
        <TabsContent value="cards">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Estilo Geral dos Cards</CardTitle>
                <CardDescription>
                  Essas configurações alteram o comportamento visual de todos os cards de produtos na vitrine.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                {(Object.keys(designOptions) as (keyof ProductCardStyle)[]).map((key) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">{designLabels[key]}</label>
                    <Select 
                      value={globalStyle[key]} 
                      onValueChange={(value) => updateGlobalStyle(key, value)} 
                      disabled={globalLoading}
                    >
                      <SelectTrigger className="w-full h-11 border-2 rounded-xl bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {designOptions[key].map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-slate-50 border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> Prévia do Card
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <article className={cn(
                    "overflow-hidden bg-white text-left transition-all border-orange-500 border-2",
                    productCardStyleClasses.border_radius[globalStyle.border_radius],
                    productCardStyleClasses.shadow[globalStyle.shadow]
                  )}>
                    <div className="relative h-32 bg-gradient-to-br from-slate-200 to-slate-300">
                      <span className={cn(
                        "absolute right-2 top-2 bg-red-600 px-2 py-1 text-[9px] font-black uppercase text-white animate-pulse rounded-lg",
                        productCardStyleClasses.opportunity_emphasis[globalStyle.opportunity_emphasis]
                      )}>
                        Liquidação
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold">Sofá Retrátil Morante</p>
                      <p className="mt-1 text-lg font-bold text-[#00A650]">R$ 1.899,90</p>
                      <button className={cn(
                        "mt-3 w-full bg-[#25D366] py-2 text-xs font-bold text-white",
                        productCardStyleClasses.button_style[globalStyle.button_style]
                      )}>
                        Fazer pedido
                      </button>
                    </div>
                  </article>
                </CardContent>
              </Card>
              
              <Button 
                className="w-full gap-2 font-bold h-12 rounded-xl" 
                onClick={saveGlobalStyle} 
                disabled={globalSaving || globalLoading}
              >
                <Save className="h-4 w-4" />
                {globalSaving ? "Salvando..." : "Salvar Estilos Gerais"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ABA: LISTA DE PRODUTOS */}
        <TabsContent value="product-list">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle>Lista de produtos</CardTitle><CardDescription>Estes ajustes afetam somente a grade da vitrine: quantidade de cards, distância entre eles e encaixe das fotos.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                {([
                  ["product_grid_columns", "Tamanho dos cards", [["compact", "Compactos — mais produtos por linha"], ["comfortable", "Equilibrados — recomendado"], ["large", "Grandes — mais destaque por produto"]]],
                  ["product_grid_gap", "Espaçamento entre cards", [["tight", "Junto"], ["normal", "Equilibrado"], ["spacious", "Arejado"]]],
                  ["product_image_fit", "Encaixe da imagem", [["cover", "Preencher o espaço"], ["contain", "Mostrar imagem inteira"]]],
                ] as const).map(([key, label, values]) => <div key={key} className="space-y-2"><label className="text-sm font-bold text-gray-700">{label}</label><Select value={globalStyle[key]} onValueChange={(value) => updateGlobalStyle(key, value)} disabled={globalLoading}><SelectTrigger className="h-11 w-full rounded-xl border-2 bg-white"><SelectValue /></SelectTrigger><SelectContent>{values.map(([value, itemLabel]) => <SelectItem key={value} value={value}>{itemLabel}</SelectItem>)}</SelectContent></Select></div>)}
              </CardContent>
            </Card>
            <div className="space-y-4"><Card className="border-none bg-slate-50 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base">Prévia da lista</CardTitle><CardDescription>Exemplo de como a grade ficará na vitrine.</CardDescription></CardHeader><CardContent><div className={cn("grid", globalStyle.product_grid_columns === "compact" ? "grid-cols-4" : globalStyle.product_grid_columns === "large" ? "grid-cols-2" : "grid-cols-3", globalStyle.product_grid_gap === "tight" ? "gap-1.5" : globalStyle.product_grid_gap === "spacious" ? "gap-4" : "gap-2.5")}>{["Sofá", "Cama", "Mesa", "Armário"].map((name) => <article key={name} className={cn("overflow-hidden border bg-white", productCardStyleClasses.border_radius[globalStyle.border_radius])}><div className={cn("aspect-square bg-slate-200", globalStyle.product_image_fit === "contain" && "m-1 rounded bg-white")}><div className={cn("h-full w-full bg-gradient-to-br from-slate-200 to-slate-300", globalStyle.product_image_fit === "contain" && "scale-75 rounded-lg")} /></div><div className="p-1.5"><p className="truncate text-[9px] font-bold">{name}</p><p className="mt-1 text-[9px] font-black text-green-600">R$ 999</p></div></article>)}</div></CardContent></Card><Button className="h-12 w-full gap-2 rounded-xl font-bold" onClick={saveGlobalStyle} disabled={globalSaving || globalLoading}><Save className="h-4 w-4" />{globalSaving ? "Salvando..." : "Salvar lista de produtos"}</Button></div>
          </div>
        </TabsContent>

        {/* ABA: BANNERS */}
        <TabsContent value="banner">
          <div className="space-y-8">
            {/* Seção: Overlay / Estilo visual dos banners */}
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle>Estilo visual dos banners</CardTitle><CardDescription>Escolha a intensidade da camada sobre as imagens dos banners para manter textos e botões legíveis.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {([
                    ["soft", "Suave", "Imagem mais visível, com contraste leve."],
                    ["dark", "Escuro", "Equilíbrio entre foto e leitura. Recomendado."],
                    ["vibrant", "Impactante", "Tonalidade quente para campanhas e liquidações."],
                  ] as const).map(([value, title, description]) => (
                    <button key={value} type="button" onClick={() => updateGlobalStyle("hero_overlay", value)} className={cn("flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all", globalStyle.hero_overlay === value ? "border-primary bg-primary/5" : "border-transparent bg-slate-50 hover:bg-slate-100")}>
                      <span className={cn("h-10 w-10 rounded-full border-4 border-white shadow-sm", value === "soft" && "bg-slate-500", value === "dark" && "bg-slate-950", value === "vibrant" && "bg-orange-700")} />
                      <span><span className="block text-sm font-bold text-gray-800">{title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <div className="space-y-4"><Card className="overflow-hidden border-none shadow-sm"><CardHeader className="border-b bg-slate-50 pb-3"><CardTitle className="text-base">Prévia do banner</CardTitle></CardHeader><CardContent className="p-0"><div className="relative flex h-56 items-center overflow-hidden bg-[url('https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center"><div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, ${globalStyle.hero_overlay === "soft" ? "rgb(15 23 42 / .55)" : globalStyle.hero_overlay === "vibrant" ? "rgb(79 18 0 / .72)" : "rgb(0 0 0 / .80)"}, rgb(0 0 0 / .2), transparent)` }} /><div className="relative z-10 px-6"><p className="text-2xl font-black leading-tight text-white">Conforto para<br />sua casa</p><button className="mt-4 rounded-full px-4 py-2 text-xs font-bold" style={{ backgroundColor: globalStyle.accent_color, color: globalStyle.primary_color }}>VER OFERTAS</button></div></div></CardContent></Card><Button className="w-full gap-2 font-bold h-12 rounded-xl" onClick={saveGlobalStyle} disabled={globalSaving || globalLoading}><Save className="h-4 w-4" />{globalSaving ? "Salvando..." : "Salvar estilo do banner"}</Button></div>
            </div>

            {/* Seção: Gerenciar Banners do Carrossel */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border shadow-sm gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Banners do Carrossel</h3>
                  <p className="text-sm text-muted-foreground">Gerencie os banners do carrossel da página inicial.</p>
                </div>
                <Button onClick={() => openBannerDialog()} className="w-full md:w-auto gap-2 font-bold">
                  <Plus className="h-4 w-4" /> Novo Banner
                </Button>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[120px]">Imagem</TableHead>
                      <TableHead className="font-bold">Título</TableHead>
                      <TableHead className="font-bold">Link</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="text-right font-bold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bannersLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : banners.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">Nenhum banner cadastrado.</TableCell></TableRow>
                    ) : (
                      banners.map(banner => (
                        <TableRow key={banner.id} className="hover:bg-gray-50/50">
                          <TableCell>
                            <div className="relative h-16 w-24 rounded-lg overflow-hidden border bg-gray-100">
                              {banner.image_url
                                ? <Image src={banner.image_url} alt={banner.title || "Banner"} fill className="object-cover" />
                                : <ImageIcon className="h-5 w-5 m-auto text-gray-300 mt-5" />
                              }
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-800">{banner.title || <span className="italic text-muted-foreground">Sem título</span>}</TableCell>
                          <TableCell>
                            {banner.link_url
                              ? <a href={banner.link_url} target="_blank" className="text-primary text-sm hover:underline truncate max-w-[200px] block">{banner.link_url}</a>
                              : <span className="text-muted-foreground text-sm italic">Sem link</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Badge className={banner.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                              {banner.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => toggleBannerActive(banner)} className="h-8 w-8 text-amber-600 hover:bg-amber-50">
                              {banner.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openBannerDialog(banner)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleBannerDelete(banner.id)} className="h-8 w-8 text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ABA: IDENTIDADE VISUAL */}
        <TabsContent value="identity">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Identidade visual da loja</CardTitle>
                <CardDescription>Defina as cores que aparecem em títulos, botões, chamadas e no fundo da loja.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {([
                  ["primary_color", "Cor principal", "Usada em títulos, navegação e ações principais."],
                  ["accent_color", "Cor de destaque", "Usada em chamadas, ofertas e botões de destaque."],
                  ["background_color", "Cor de fundo", "Define a base visual das páginas da loja."],
                ] as const).map(([key, label, description]) => (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50/60 p-4">
                    <div><p className="text-sm font-bold text-gray-800">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
                    <div className="flex items-center gap-2">
                      <input aria-label={label} type="color" value={globalStyle[key]} onChange={(event) => updateGlobalStyle(key, event.target.value)} disabled={globalLoading} className="h-10 w-12 cursor-pointer rounded-md border bg-white p-1" />
                      <Input value={globalStyle[key]} onChange={(event) => updateGlobalStyle(key, event.target.value)} className="w-24 bg-white font-mono text-xs uppercase" maxLength={7} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader className="border-b bg-slate-50 pb-3"><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-amber-500" /> Prévia da página</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="p-4" style={{ backgroundColor: globalStyle.background_color }}>
                    <div className="flex items-center justify-between"><strong className="text-sm" style={{ color: globalStyle.primary_color }}>MORANTE</strong><span className="text-[10px] text-slate-500">Início · Produtos</span></div>
                    <div className="mt-4 rounded-lg p-4" style={{ backgroundColor: globalStyle.primary_color }}><p className="text-xs font-bold text-white">Conforto para a sua casa</p><button className="mt-3 rounded-full px-3 py-1.5 text-[10px] font-black" style={{ backgroundColor: globalStyle.accent_color, color: globalStyle.primary_color }}>VER OFERTAS</button></div>
                    <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-md bg-white p-2 shadow-sm"><div className="h-10 rounded bg-slate-200" /><p className="mt-2 text-[10px] font-bold" style={{ color: globalStyle.primary_color }}>Sofá retrátil</p></div><div className="rounded-md bg-white p-2 shadow-sm"><div className="h-10 rounded bg-slate-200" /><p className="mt-2 text-[10px] font-bold" style={{ color: globalStyle.primary_color }}>Cama box</p></div></div>
                  </div>
                </CardContent>
              </Card>
              <Button className="w-full gap-2 font-bold h-12 rounded-xl" onClick={saveGlobalStyle} disabled={globalSaving || globalLoading}><Save className="h-4 w-4" />{globalSaving ? "Salvando..." : "Salvar identidade visual"}</Button>
            </div>
          </div>
        </TabsContent>

        {/* ABA: OPORTUNIDADES */}
        <TabsContent value="opportunities">
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
              <div>
                <h3 className="font-bold text-gray-800">Estilos Específicos por Oportunidade</h3>
                <p className="text-xs text-muted-foreground">Personalize a linha de contorno dos cards e o selo de acordo com o tipo de oportunidade.</p>
              </div>
              <Button onClick={openCreateModal} className="gap-2 font-bold size-sm md:size-default">
                <Plus className="h-4 w-4" /> Nova Oportunidade
              </Button>
            </div>

            {oppLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : opportunities.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <Zap className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 font-bold text-lg">Nenhuma oportunidade cadastrada</p>
                  <Button onClick={openCreateModal} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" /> Criar Oportunidade
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {opportunities.map((opp) => {
                  const borderStyleClass = BORDER_STYLE_OPTIONS.find(o => o.value === (opp.border_style || "solid"))?.className || "border-solid"
                  const animationClass = BADGE_ANIMATION_OPTIONS.find(o => o.value === (opp.badge_animation || "pulse"))?.className || ""
                  return (
                    <Card 
                      key={opp.id} 
                      className={`relative transition-all hover:shadow-lg ${!opp.active ? "opacity-50" : ""} border-2 ${opp.border_color} ${borderStyleClass}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-bold truncate">{opp.name}</CardTitle>
                            <p className="text-xs text-muted-foreground font-mono mt-1">{opp.slug}</p>
                          </div>
                          <Badge className={`${opp.badge_color} text-white text-[10px] shrink-0 ${animationClass}`}>
                            {opp.name}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 mb-4 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Borda do Card:</span>
                            <span className="font-semibold text-gray-700 capitalize">
                              {BORDER_COLOR_OPTIONS.find(c => c.value === opp.border_color)?.label || "Nenhuma"} 
                              {" ("}
                              {BORDER_STYLE_OPTIONS.find(s => s.value === (opp.border_style || "solid"))?.label || "Sólida"}
                              {")"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Efeito Badge:</span>
                            <span className="font-semibold text-gray-700">
                              {BADGE_ANIMATION_OPTIONS.find(a => a.value === (opp.badge_animation || "pulse"))?.label || "Nenhum"}
                            </span>
                          </div>
                          {opp.observations && (
                            <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                              <span className="block font-bold">Aviso/Observação:</span>
                              <span className="line-clamp-2 text-gray-600">{opp.observations}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5 text-xs font-bold"
                            onClick={() => openEditModal(opp)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Estilizar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`gap-1.5 text-xs ${opp.active ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                            onClick={() => handleToggleOppActive(opp)}
                          >
                            {opp.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setDeleteConfirmId(opp.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Oportunidade */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Zap className="h-5 w-5 text-amber-500" />
              {editingId ? "Personalizar Estilos & Oportunidade" : "Nova Oportunidade"}
            </DialogTitle>
            <DialogDescription>
              Ajuste as cores da borda, estilo de linha e a animação do badge em tempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Nome da Oportunidade <span className="text-red-500">*</span></label>
              <Input
                placeholder="Ex: Liquidação - Últimas Unidades"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value
                  setFormData(prev => ({
                    ...prev,
                    name,
                    ...(autoSlug ? { slug: generateSlug(name) } : {}),
                  }))
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Slug identificador <span className="text-red-500">*</span></label>
              <Input
                placeholder="liquidacao-ultimas-unidades"
                value={formData.slug}
                onChange={(e) => {
                  setAutoSlug(false)
                  setFormData(prev => ({ ...prev, slug: e.target.value }))
                }}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Cor do Badge</label>
                <Select
                  value={formData.badge_color}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, badge_color: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${opt.preview}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Cor da Borda</label>
                <Select
                  value={formData.border_color}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, border_color: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BORDER_COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-6 rounded border-2 ${opt.preview}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Estilo da Linha da Borda</label>
                <Select
                  value={formData.border_style}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, border_style: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BORDER_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Efeito Visual do Badge</label>
                <Select
                  value={formData.badge_animation}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, badge_animation: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_ANIMATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cor do Título do Produto */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Cor do Título do Produto (Opcional)</label>
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder="Ex: #DC2626 ou deixe em branco para herdar a cor do badge"
                  value={formData.title_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, title_color: e.target.value }))}
                  className="h-10 text-sm font-mono flex-1"
                />
                <Input
                  type="color"
                  value={formData.title_color && formData.title_color.startsWith("#") ? formData.title_color : "#1f2937"}
                  onChange={(e) => setFormData(prev => ({ ...prev, title_color: e.target.value }))}
                  className="w-10 h-10 p-1 cursor-pointer shrink-0 rounded-lg border"
                />
                {formData.title_color && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, title_color: "" }))}
                    className="text-xs text-red-500 hover:text-red-600 font-bold"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Define uma cor exclusiva para o título do produto em destaque. Se vazio, o sistema calculará automaticamente com base na cor do badge.</p>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Observações (Texto de Aviso no Produto)</label>
              <textarea
                placeholder="Ex: Esse produto é do lote dos salvados..."
                value={formData.observations}
                onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                rows={8}
                className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-gray-700">Prévia do Card em Tempo Real</label>
              <div className={`border-2 ${formData.border_color} ${BORDER_STYLE_OPTIONS.find(o => o.value === formData.border_style)?.className || "border-solid"} rounded-xl p-4 bg-white flex items-center justify-between shadow-sm transition-all duration-300`}>
                <div className="space-y-1">
                  <span 
                    className="text-sm font-black transition-colors"
                    style={{
                      color: formData.title_color ? formData.title_color : (
                             formData.badge_color === 'bg-red-600' ? '#DC2626' : 
                             formData.badge_color === 'bg-amber-600' ? '#D97706' :
                             formData.badge_color === 'bg-purple-600' ? '#7C3AED' :
                             formData.badge_color === 'bg-blue-600' ? '#2563EB' :
                             formData.badge_color === 'bg-green-600' ? '#16A34A' :
                             formData.badge_color === 'bg-pink-600' ? '#DB2777' :
                             formData.badge_color === 'bg-orange-600' ? '#EA580C' :
                             formData.badge_color === 'bg-teal-600' ? '#0D9488' : '#1f2937')
                    }}
                  >
                    {formData.name || "Exemplo de Móvel"}
                  </span>
                  <p className="text-[10px] text-green-600 font-bold">R$ 1.299,00</p>
                </div>
                <Badge className={`${formData.badge_color} text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm ${BADGE_ANIMATION_OPTIONS.find(o => o.value === formData.badge_animation)?.className || ""}`}>
                  {formData.name || "Oportunidade"}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveOpp} disabled={oppSaving} className="gap-2 font-bold">
              {oppSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar Customizações" : "Criar Oportunidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação Exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 font-bold">Excluir Oportunidade</DialogTitle>
            <DialogDescription>
              Tem certeza? Os produtos vinculados a esta oportunidade perderão a marcação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteOpp(deleteConfirmId)}>
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Banner */}
      <Dialog open={isBannerDialogOpen} onOpenChange={setIsBannerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleBannerSave}>
            <DialogHeader>
              <DialogTitle>{currentBanner ? "Editar Banner" : "Novo Banner"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Imagem do Banner*</label>
                <label className="flex flex-col items-center justify-center h-36 w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all relative overflow-hidden">
                  {isBannerUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  {bannerFormData.image_url ? (
                    <Image src={bannerFormData.image_url} alt="Preview" fill className="object-cover rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm">Clique para enviar imagem</span>
                    </div>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleBannerImageUpload} />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Título (opcional)</label>
                <Input value={bannerFormData.title} onChange={e => setBannerFormData({ ...bannerFormData, title: e.target.value })} placeholder="Ex: Mega Queima de Estoque" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Link de Destino (opcional)</label>
                <Input value={bannerFormData.link_url} onChange={e => setBannerFormData({ ...bannerFormData, link_url: e.target.value })} placeholder="https://..." />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
                <button
                  type="button"
                  onClick={() => setBannerFormData(prev => ({ ...prev, active: !prev.active }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${bannerFormData.active ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${bannerFormData.active ? "left-7" : "left-1"}`} />
                </button>
                <span className="text-sm font-medium">{bannerFormData.active ? "Banner ativo (aparece no site)" : "Banner inativo (oculto)"}</span>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isBannerSaving || isBannerUploading}>
                {isBannerSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Banner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
