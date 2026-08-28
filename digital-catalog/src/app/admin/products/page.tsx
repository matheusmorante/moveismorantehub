"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Search, X, Loader2, Share2, Download, Link, Settings, Layers, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Database } from "@/types/database"
import { AdminProductModal } from "@/features/products/components/admin-product-modal"
import { ProductTable } from "./components/product-table"
import { ProductCards } from "./components/product-cards"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ProductWithDetails = Database['public']['Tables']['products']['Row'] & {
  product_categories?: { categories: { name: string } | null }[]
  product_images: Database['public']['Tables']['product_images']['Row'][]
  product_variations?: any[]
  opportunities?: any | null
}

interface FacebookCatalogSettings {
  global_description_prefix: string
  column_mappings: {
    brand: string
    condition: string
    gender: string
    age_group: string
  }
}

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')
  const [showCatalogMenu, setShowCatalogMenu] = useState(false)

  // Filtros Avançados & Sidebar
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterMinPrice, setFilterMinPrice] = useState<string>("")
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  // Configurações do Catálogo Meta
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [catalogSettings, setCatalogSettings] = useState<FacebookCatalogSettings>({
    global_description_prefix: "",
    column_mappings: {
      brand: "Móveis Morante",
      condition: "new",
      gender: "unisex",
      age_group: "adult"
    }
  })

  useEffect(() => {
    fetchData()
    loadCatalogSettings()

    if (typeof window === "undefined") return
    const channel = new BroadcastChannel("catalog-updates")
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "catalog-updated") {
        fetchData()
      }
    }
    channel.addEventListener("message", handleMessage)
    return () => {
      channel.removeEventListener("message", handleMessage)
      channel.close()
    }
  }, [])

  async function loadCatalogSettings() {
    try {
      const { data } = await supabase
        .from("facebook_catalog_settings")
        .select("global_description_prefix, column_mappings")
        .eq("id", true)
        .maybeSingle()

      if (data) {
        setCatalogSettings({
          global_description_prefix: data.global_description_prefix || "",
          column_mappings: {
            brand: data.column_mappings?.brand || "Móveis Morante",
            condition: data.column_mappings?.condition || "new",
            gender: data.column_mappings?.gender || "unisex",
            age_group: data.column_mappings?.age_group || "adult"
          }
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveConfig = async () => {
    setIsSavingConfig(true)
    try {
      const { error } = await supabase.from("facebook_catalog_settings").upsert({
        id: true,
        global_description_prefix: catalogSettings.global_description_prefix,
        column_mappings: catalogSettings.column_mappings
      })
      if (error) throw error
      toast.success("Configurações do catálogo salvas com sucesso!")
      setIsConfigOpen(false)
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message)
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleCopyCatalogLink = () => {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}/api/facebook-catalog.csv`
    navigator.clipboard.writeText(url)
    toast.success("Link do Catálogo Meta copiado!")
    setShowCatalogMenu(false)
  }

  const handleDownloadCatalog = () => {
    if (typeof window === "undefined") return
    window.open("/api/facebook-catalog.csv", "_blank")
    setShowCatalogMenu(false)
  }

  async function fetchData() {
    setLoading(true)
    
    // Purga física de itens da lixeira desabilitada para preservar o histórico do banco de dados

    const { data, error } = await supabase
      .from("products")
      .select("*, product_categories(categories(name)), product_images(*), product_variations(*), opportunities(*)")
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Erro ao carregar produtos")
    } else {
      setProducts(data || [])
      // Extrair categorias existentes para o filtro
      const catsSet = new Set<string>()
      data?.forEach(p => {
        p.product_categories?.forEach((pc: any) => {
          if (pc.categories?.name) catsSet.add(pc.categories.name)
        })
      })
      setAvailableCategories(Array.from(catsSet).sort())
    }
    setLoading(false)
  }

  const handleSoftDelete = async (id: string) => {
    if (!confirm("Enviar este produto para a lixeira?")) return
    try {
      const { error } = await supabase
        .from("products")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
      
      if (error) throw error

      // Remover do catálogo da Meta
      fetch("/api/catalog/sync-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, action: "DELETE" }),
      }).catch((err) => console.error("Erro ao sincronizar exclusão com a Meta:", err))

      toast.success("Produto enviado para a lixeira!")
      if (typeof window !== "undefined") {
        const channel = new BroadcastChannel("catalog-updates")
        channel.postMessage("catalog-updated")
        channel.close()
      }
      fetchData()
    } catch (error: any) {
      toast.error("Erro ao enviar para a lixeira: " + error.message)
    }
  }

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ deleted_at: null })
        .eq("id", id)
      
      if (error) throw error

      // Re-sincronizar com a Meta
      fetch("/api/catalog/sync-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, action: "UPDATE" }),
      }).catch((err) => console.error("Erro ao sincronizar restauração com a Meta:", err))

      toast.success("Produto restaurado com sucesso!")
      if (typeof window !== "undefined") {
        const channel = new BroadcastChannel("catalog-updates")
        channel.postMessage("catalog-updated")
        channel.close()
      }
      fetchData()
    } catch (error: any) {
      toast.error("Erro ao restaurar: " + error.message)
    }
  }

  const handleHardDelete = async (id: string) => {
    if (!confirm("Confirmar inativação definitiva deste produto? O produto será arquivado para preservar o histórico.")) return
    try {
      // Remover do catálogo da Meta primeiro
      await fetch("/api/catalog/sync-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, action: "DELETE" }),
      }).catch((err) => console.error("Erro ao sincronizar exclusão com a Meta:", err))

      // No lugar de deletar fisicamente, definimos status como 'hidden' e active como false
      const { error } = await supabase.from("products").update({ status: 'hidden', active: false }).eq("id", id)
      if (error) throw error
      toast.success("Produto desativado e arquivado permanentemente!")
      if (typeof window !== "undefined") {
        const channel = new BroadcastChannel("catalog-updates")
        channel.postMessage("catalog-updated")
        channel.close()
      }
      fetchData()
    } catch (error: any) {
      toast.error("Erro ao arquivar produto: " + error.message)
    }
  }

  const toggleProductStatus = async (product: ProductWithDetails) => {
    let newStatus = 'published'
    if (product.status === 'published') {
      newStatus = 'hidden'
    } else if (product.status === 'hidden') {
      newStatus = 'published'
    } else {
      newStatus = 'published'
    }

    setProducts(prev => prev.map(p => p.id === product.id
      ? {
          ...p,
          status: newStatus,
          product_variations: p.product_variations?.map(variation => ({ ...variation, status: newStatus }))
        }
      : p
    ))

    try {
      const { error } = await supabase
        .from("products")
        .update({ status: newStatus })
        .eq("id", product.id)
      
      if (error) {
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: product.status } : p))
        throw error
      }

      // O status do pai define a visibilidade de todas as suas variações.
      const { error: variationsError } = await supabase
        .from("product_variations")
        .update({ status: newStatus })
        .eq("product_id", product.id)

      if (variationsError) throw variationsError

      // Sincronizar status com a Meta (publicado -> UPDATE, ocultado -> DELETE)
      fetch("/api/catalog/sync-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          action: newStatus === "published" ? "UPDATE" : "DELETE",
        }),
      }).catch((err) => console.error("Erro ao sincronizar alteração de status com a Meta:", err))
      
      toast.success(`Produto ${newStatus === 'published' ? 'Publicado' : 'Ocultado'}!`)
      if (typeof window !== "undefined") {
        const channel = new BroadcastChannel("catalog-updates")
        channel.postMessage("catalog-updated")
        channel.close()
      }
    } catch (error: any) {
      toast.error("Erro ao alterar status: " + error.message)
    }
  }

  const toggleVariationStatus = async (productId: string, variationId: string, currentStatus: string) => {
    let newStatus = 'published'
    if (currentStatus === 'published') {
      newStatus = 'hidden'
    } else if (currentStatus === 'hidden') {
      newStatus = 'published'
    } else {
      newStatus = 'published'
    }

    setProducts(prev => prev.map(p => {
      if (p.id === productId && p.product_variations) {
        return {
          ...p,
          product_variations: p.product_variations.map(v => v.id === variationId ? { ...v, status: newStatus } : v)
        }
      }
      return p
    }))

    try {
      const { error } = await supabase
        .from("product_variations")
        .update({ status: newStatus })
        .eq("id", variationId)
      
      if (error) {
        setProducts(prev => prev.map(p => {
          if (p.id === productId && p.product_variations) {
            return {
              ...p,
              product_variations: p.product_variations.map(v => v.id === variationId ? { ...v, status: currentStatus } : v)
            }
          }
          return p
        }))
        throw error
      }
      
      toast.success(`Variação ${newStatus === 'published' ? 'Publicada' : 'Ocultada'}!`)
      if (typeof window !== "undefined") {
        const channel = new BroadcastChannel("catalog-updates")
        channel.postMessage("catalog-updated")
        channel.close()
      }
    } catch (error: any) {
      toast.error("Erro ao alterar status da variação: " + error.message)
    }
  }

  const openEditModal = (productId: string | null = null, variationId: string | null = null) => {
    setSelectedProductId(productId)
    setSelectedVariationId(variationId)
    setIsModalOpen(true)
  }

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id)
    const toastId = toast.loading("Duplicando produto...")
    try {
      const { data: origProduct, error: fetchErr } = await supabase
        .from("products")
        .select("*, product_images(*), product_categories(*)")
        .eq("id", id)
        .single()

      if (fetchErr || !origProduct) throw fetchErr || new Error("Produto não encontrado")

      const baseName = origProduct.name
      const newName = `${baseName} (Cópia)`
      
      const baseSlug = origProduct.slug
      const newSlug = `${baseSlug}-copia-${Date.now()}`

      const newProductData = {
        name: newName,
        slug: newSlug,
        description: origProduct.description,
        price: origProduct.price,
        promo_price: origProduct.promo_price,
        is_salvado: origProduct.is_salvado,
        opportunity_id: origProduct.opportunity_id,
        width: origProduct.width,
        depth: origProduct.depth,
        height: origProduct.height,
        status: "draft",
        featured: false,
        material: origProduct.material,
        measures: origProduct.measures,
        technical_specs: origProduct.technical_specs
      }

      const { data: newProd, error: insertErr } = await supabase
        .from("products")
        .insert([newProductData])
        .select()
        .single()

      if (insertErr || !newProd) throw insertErr || new Error("Falha ao cadastrar o produto duplicado")

      if (origProduct.product_images && origProduct.product_images.length > 0) {
        const newImages = origProduct.product_images.map((img: any) => ({
          product_id: newProd.id,
          image_url: img.image_url,
          is_main: img.is_main
        }))
        const { error: imgErr } = await supabase.from("product_images").insert(newImages)
        if (imgErr) throw imgErr
      }

      if (origProduct.product_categories && origProduct.product_categories.length > 0) {
        const newCategories = origProduct.product_categories.map((cat: any) => ({
          product_id: newProd.id,
          category_id: cat.category_id
        }))
        const { error: catErr } = await supabase.from("product_categories").insert(newCategories)
        if (catErr) throw catErr
      }

      toast.success("Produto duplicado com sucesso!", { id: toastId })
      if (typeof window !== "undefined") {
        const channel = new BroadcastChannel("catalog-updates")
        channel.postMessage("catalog-updated")
        channel.close()
      }
      fetchData()
    } catch (error: any) {
      toast.error("Erro ao duplicar: " + error.message, { id: toastId })
    } finally {
      setDuplicatingId(null)
    }
  }

  const countRealProducts = (productList: typeof products) => {
    return productList.reduce((acc, p) => {
      const varsCount = p.product_variations?.length || 0
      return acc + (varsCount === 0 ? 1 : varsCount)
    }, 0)
  }

  const activeProducts = products.filter(p => !p.deleted_at)
  const trashedProducts = products.filter(p => !!p.deleted_at)

  const currentList = viewMode === 'active' ? activeProducts : trashedProducts

  const filteredProducts = currentList.filter(p => {
    // Busca por termo
    const parentMatches = p.name.toLowerCase().includes(search.toLowerCase())
    const variationMatches = p.product_variations?.some(v => 
      v.name.toLowerCase().includes(search.toLowerCase()) || 
      (v.sku && v.sku.toLowerCase().includes(search.toLowerCase()))
    )
    if (!parentMatches && !variationMatches) return false

    // Filtro por Status
    if (filterStatus !== "all" && p.status !== filterStatus) return false

    // Filtro por Preço Mínimo
    if (filterMinPrice) {
      const min = parseFloat(filterMinPrice)
      if (!isNaN(min) && p.price < min) return false
    }

    // Filtro por Preço Máximo
    if (filterMaxPrice) {
      const max = parseFloat(filterMaxPrice)
      if (!isNaN(max) && p.price > max) return false
    }

    // Filtro por Categoria
    if (filterCategory !== "all") {
      const hasCat = p.product_categories?.some((pc: any) => pc.categories?.name === filterCategory)
      if (!hasCat) return false
    }

    return true
  })

  const hasActiveFilters = filterStatus !== "all" || filterMinPrice !== "" || filterMaxPrice !== "" || filterCategory !== "all"

  const handleClearFilters = () => {
    setFilterStatus("all")
    setFilterMinPrice("")
    setFilterMaxPrice("")
    setFilterCategory("all")
  }

  return (
    <div className="space-y-4 px-2 md:px-0 max-w-full overflow-hidden">
      {/* Cabeçalho */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-800">Produtos</h1>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-primary">{countRealProducts(products)}</span> cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2 relative">
            {/* Botão de Opções do Catálogo Meta */}
            <div className="relative">
              <Button 
                variant="outline" 
                onClick={() => setShowCatalogMenu(!showCatalogMenu)}
                className="gap-2 font-bold shrink-0 h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Share2 className="h-4 w-4 text-blue-600" />
                <span className="hidden sm:inline">Catálogo Meta</span>
              </Button>
              
              {showCatalogMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCatalogMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg p-1.5 z-20 animate-in fade-in slide-in-from-top-1 duration-200">
                    <button 
                      onClick={async () => {
                        setShowCatalogMenu(false)
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
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50/50 rounded-lg text-left transition-colors"
                    >
                      <Share2 className="h-4 w-4 text-blue-600 animate-pulse" />
                      Atualizar Catálogo Meta
                    </button>
                    <button 
                      onClick={handleCopyCatalogLink}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg text-left transition-colors border-t border-gray-100"
                    >
                      <Link className="h-4 w-4 text-gray-400" />
                      Copiar link do feed
                    </button>
                    <button 
                      onClick={handleDownloadCatalog}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg text-left transition-colors border-t border-gray-100"
                    >
                      <Download className="h-4 w-4 text-gray-400" />
                      Baixar arquivo CSV
                    </button>
                    <button 
                      onClick={() => {
                        setIsConfigOpen(true)
                        setShowCatalogMenu(false)
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg text-left transition-colors border-t border-gray-100"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Configurações do feed
                    </button>
                  </div>
                </>
              )}
            </div>

            <Button onClick={() => openEditModal()} className="gap-2 font-bold shadow-lg shadow-primary/20 shrink-0 h-10">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Produto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              className="pl-9 pr-8 h-10 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button 
            variant="outline"
            onClick={() => setIsFilterSidebarOpen(true)}
            className={`h-10 gap-2 font-bold ${hasActiveFilters ? "border-primary text-primary bg-primary/5" : "border-gray-200 text-gray-700"}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 bg-primary text-white h-4 min-w-4 px-1 rounded-full text-[9px] flex items-center justify-center font-black animate-scale-in">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Toggle de Visualização */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button
            type="button"
            variant={viewMode === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('active')}
            className={`font-bold text-xs h-9 rounded-xl ${viewMode === 'active' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Ativos ({countRealProducts(activeProducts)})
          </Button>
          <Button
            type="button"
            variant={viewMode === 'trash' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('trash')}
            className={`font-bold text-xs h-9 rounded-xl gap-1.5 ${viewMode === 'trash' ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 hover:bg-red-50'}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Lixeira ({countRealProducts(trashedProducts)})
          </Button>
        </div>
      </div>

      {/* Mobile/Tablet View: Cards */}
      <div className="lg:hidden space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 custom-scrollbar">
        <ProductCards
          products={filteredProducts}
          loading={loading}
          viewMode={viewMode}
          duplicatingId={duplicatingId}
          onDuplicate={handleDuplicate}
          onEdit={openEditModal}
          onSoftDelete={handleSoftDelete}
          onRestore={handleRestore}
          onHardDelete={handleHardDelete}
          onToggleStatus={toggleProductStatus}
          onToggleVariationStatus={toggleVariationStatus}
        />
      </div>

      {/* Desktop View: Table */}
      <div className="hidden lg:block bg-white rounded-xl border shadow-sm overflow-hidden max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <ProductTable
            products={filteredProducts}
            loading={loading}
            viewMode={viewMode}
            duplicatingId={duplicatingId}
            onDuplicate={handleDuplicate}
            onEdit={openEditModal}
            onSoftDelete={handleSoftDelete}
            onRestore={handleRestore}
            onHardDelete={handleHardDelete}
            onToggleStatus={toggleProductStatus}
            onToggleVariationStatus={toggleVariationStatus}
          />
        </div>
      </div>

      <AdminProductModal 
        productId={selectedProductId} 
        initialVariationId={selectedVariationId}
        isOpen={isModalOpen} 
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) {
            setSelectedProductId(null)
            setSelectedVariationId(null)
          }
        }}
        onSuccess={fetchData}
      />

      {/* Sidebar Lateral de Filtros Avançados */}
      {isFilterSidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsFilterSidebarOpen(false)}
          />
          {/* Painel do Sidebar */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs md:max-w-sm bg-white shadow-2xl p-6 border-l flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" /> Filtros Avançados
                </h3>
                <button 
                  onClick={() => setIsFilterSidebarOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Corpo dos Filtros */}
              <div className="space-y-5 text-left">
                {/* 1. Status do Produto */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Status do Produto</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-10 text-xs font-semibold w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                      <SelectItem value="hidden">Ocultado</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Categoria / Ambiente */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Categoria / Ambiente</label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-10 text-xs font-semibold w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {availableCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Faixa de Preço */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Faixa de Preço (R$)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-bold">Mínimo</span>
                      <Input 
                        type="number"
                        placeholder="Ex: 100"
                        value={filterMinPrice}
                        onChange={(e) => setFilterMinPrice(e.target.value)}
                        className="h-9 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-bold">Máximo</span>
                      <Input 
                        type="number"
                        placeholder="Ex: 5000"
                        value={filterMaxPrice}
                        onChange={(e) => setFilterMaxPrice(e.target.value)}
                        className="h-9 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Sidebar */}
            <div className="border-t pt-4 space-y-2">
              <Button 
                onClick={() => setIsFilterSidebarOpen(false)}
                className="w-full text-xs font-bold bg-primary shadow-md h-10"
              >
                Aplicar Filtros
              </Button>
              {hasActiveFilters && (
                <Button 
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="w-full text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 h-10"
                >
                  Limpar Todos
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
