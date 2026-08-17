"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Loader2, X, ArrowLeft, ArrowRight, Layers, Info, Camera, Cloud, ExternalLink, Sparkles, Pencil, Tags, Image as ImageIcon, ArrowLeftRight, Link2, Link2Off } from "lucide-react"
import { toast } from "sonner"
import { optimizeProductImage } from "@/lib/utils/image-optimization"
import { uploadToR2 } from "@/lib/utils/upload-r2"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Database } from "@/types/database"
import { productSchema } from "@/schemas/product.schema"
import { cn } from "@/lib/utils"
import { CategoriesManagerModal } from "@/features/categories/components/categories-manager-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Category = Database['public']['Tables']['categories']['Row']
type StoreCategory = Category & { type?: "category" | "environment" }
type CategoryRelationship = { parent_id: string; child_id: string }
type Product = Database['public']['Tables']['products']['Row']
type ProductImage = Database['public']['Tables']['product_images']['Row']
type Opportunity = Database['public']['Tables']['opportunities']['Row']

type TempVariation = {
  id?: string
  name?: string
  sku?: string
  price?: string
  stock?: string
  image_url?: string
  attributes: Record<string, string>
  
  promo_price?: string
  description?: string
  width?: string
  depth?: string
  height?: string
  use_parent_price?: boolean
  use_parent_promo_price?: boolean
  use_parent_dimensions?: boolean
  use_parent_description?: boolean
  use_parent_name?: boolean
}

interface AdminProductModalProps {
  productId?: string | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialVariationId?: string | null
}

export function AdminProductModal({ productId, isOpen, onOpenChange, onSuccess, initialVariationId }: AdminProductModalProps) {
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [categoryRelationships, setCategoryRelationships] = useState<CategoryRelationship[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [step, setStep] = useState(1)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    promo_price: "",
    is_salvado: false,
      opportunity_id: null as string | null,
      category_ids: [] as string[],
      width: "",
      depth: "",
      height: "",
      depth_use_length: false,
    images: [] as string[]
  })
  const [autoSlug, setAutoSlug] = useState(true)
  const [discountPercent, setDiscountPercent] = useState("")
  const [discountFixed, setDiscountFixed] = useState("")
  
  // Atributos globais do banco de dados (Supabase)
  const [dbAttributes, setDbAttributes] = useState<{ id: string; name: string }[]>([])
  const [dbAttributeValues, setDbAttributeValues] = useState<{ id: string; attribute_id: string; value: string }[]>([])
  
  // Grade de variações locais do produto
  const [productVariations, setProductVariations] = useState<TempVariation[]>([])
  const [variationsEnabled, setVariationsEnabled] = useState(false)

  // Sub-formulário de Variação
  const [isCategoriesManagerOpen, setIsCategoriesManagerOpen] = useState(false)
  const [isVarFormOpen, setIsVarFormOpen] = useState(false)
  const [varStep, setVarStep] = useState(1)
  const [editingVarIndex, setEditingVarIndex] = useState<number | null>(null)
  const [varFormState, setVarFormState] = useState<TempVariation>({
    sku: "",
    price: "",
    promo_price: "",
    description: "",
    width: "",
    depth: "",
    height: "",
    image_url: "",
    attributes: {},
    use_parent_price: true,
    use_parent_promo_price: true,
    use_parent_dimensions: true,
    use_parent_description: true,
    use_parent_name: true
  })

  // Modal de gerenciamento de atributos globais (CRUD)
  const [isFastCreateOpen, setIsFastCreateOpen] = useState(false)
  const [fastAttrName, setFastAttrName] = useState("")
  const [fastAttrValues, setFastAttrValues] = useState<string[]>([])
  const [fastAttrValInput, setFastAttrValInput] = useState("")
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null)
  const [varDiscountPercent, setVarDiscountPercent] = useState("")
  const [varDiscountFixed, setVarDiscountFixed] = useState("")

  const parsePrice = (val: string): number => {
    if (!val) return 0
    let cleaned = val.replace(/[^\d.,-]/g, "")
    
    if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".")
    } else {
      if ((cleaned.match(/\./g) || []).length === 1 && /\.\d{1,2}$/.test(cleaned)) {
        // Apenas um ponto seguido de 1 ou 2 casas decimais. Mantemos como decimal.
      } else {
        // Caso contrário, removemos todos os pontos (separadores de milhar)
        cleaned = cleaned.replace(/\./g, "")
      }
    }
    return parseFloat(cleaned) || 0
  }

  // Atualizar descontos ao alterar preço original
  const handlePriceChange = (newPrice: string) => {
    setFormData(prev => ({ ...prev, price: newPrice }))
    const orig = parsePrice(newPrice)
    if (isNaN(orig) || orig <= 0) {
      setDiscountPercent("")
      setDiscountFixed("")
      setFormData(prev => ({ ...prev, promo_price: "" }))
      return
    }

    if (discountPercent) {
      const pct = parseFloat(discountPercent)
      if (!isNaN(pct)) {
        const fixed = orig * (pct / 100)
        setDiscountFixed(fixed.toFixed(2))
        const promo = orig - fixed
        setFormData(prev => ({ ...prev, promo_price: promo > 0 ? promo.toFixed(2) : "0" }))
      }
    } else if (formData.promo_price) {
      const promo = parsePrice(formData.promo_price)
      if (!isNaN(promo) && promo < orig) {
        const fixed = orig - promo
        const pct = (fixed / orig) * 100
        setDiscountFixed(fixed.toFixed(2))
        setDiscountPercent(pct.toFixed(1))
      }
    }
  }

  // Quando muda o desconto percentual (%)
  const handleDiscountPercentChange = (valStr: string) => {
    setDiscountPercent(valStr)
    const orig = parsePrice(formData.price)
    if (isNaN(orig) || orig <= 0 || valStr === "") {
      setDiscountFixed("")
      setFormData(prev => ({ ...prev, promo_price: "" }))
      return
    }

    const pct = parseFloat(valStr)
    if (isNaN(pct) || pct < 0) {
      setDiscountFixed("")
      setFormData(prev => ({ ...prev, promo_price: "" }))
      return
    }

    const fixed = orig * (pct / 100)
    setDiscountFixed(fixed.toFixed(2))
    const promo = orig - fixed
    setFormData(prev => ({ ...prev, promo_price: promo > 0 ? promo.toFixed(2) : "0" }))
  }

  // Quando muda o desconto fixo (R$)
  const handleDiscountFixedChange = (valStr: string) => {
    setDiscountFixed(valStr)
    const orig = parsePrice(formData.price)
    if (isNaN(orig) || orig <= 0 || valStr === "") {
      setDiscountPercent("")
      setFormData(prev => ({ ...prev, promo_price: "" }))
      return
    }

    const fixed = parsePrice(valStr)
    if (isNaN(fixed) || fixed < 0) {
      setDiscountPercent("")
      setFormData(prev => ({ ...prev, promo_price: "" }))
      return
    }

    const pct = (fixed / orig) * 100
    setDiscountPercent(pct.toFixed(1))
    const promo = orig - fixed
    setFormData(prev => ({ ...prev, promo_price: promo > 0 ? promo.toFixed(2) : "0" }))
  }

  // Quando muda o preço promocional final (R$)
  const handlePromoPriceFieldChange = (valStr: string) => {
    setFormData(prev => ({ ...prev, promo_price: valStr }))
    const orig = parsePrice(formData.price)
    if (isNaN(orig) || orig <= 0 || valStr === "") {
      setDiscountPercent("")
      setDiscountFixed("")
      return
    }

    const promo = parsePrice(valStr)
    if (isNaN(promo) || promo < 0 || promo >= orig) {
      setDiscountPercent("")
      setDiscountFixed("")
      return
    }

    const fixed = orig - promo
    const pct = (fixed / orig) * 100
    setDiscountFixed(fixed.toFixed(2))
    setDiscountPercent(pct.toFixed(1))
  }

  // Atualizar descontos da variação ao alterar preço da variação
  const handleVarPriceChange = (newPrice: string) => {
    setVarFormState(prev => ({ ...prev, price: newPrice, use_parent_price: false }))
    const orig = parsePrice(newPrice)
    if (isNaN(orig) || orig <= 0) {
      setVarDiscountPercent("")
      setVarDiscountFixed("")
      setVarFormState(prev => ({ ...prev, promo_price: "" }))
      return
    }

    if (varDiscountPercent) {
      const pct = parseFloat(varDiscountPercent)
      if (!isNaN(pct)) {
        const fixed = orig * (pct / 100)
        setVarDiscountFixed(fixed.toFixed(2))
        const promo = orig - fixed
        setVarFormState(prev => ({ ...prev, promo_price: promo > 0 ? promo.toFixed(2) : "0" }))
      }
    } else if (varFormState.promo_price) {
      const promo = parsePrice(varFormState.promo_price)
      if (!isNaN(promo) && promo < orig) {
        const fixed = orig - promo
        const pct = (fixed / orig) * 100
        setVarDiscountFixed(fixed.toFixed(2))
        setVarDiscountPercent(pct.toFixed(1))
      }
    }
  }

  // Quando muda o desconto percentual da variação (%)
  const handleVarDiscountPercentChange = (valStr: string) => {
    setVarDiscountPercent(valStr)
    const orig = parsePrice(varFormState.use_parent_price !== false ? formData.price : varFormState.price)
    if (isNaN(orig) || orig <= 0 || valStr === "") {
      setVarDiscountFixed("")
      setVarFormState(prev => ({ ...prev, promo_price: "", use_parent_promo_price: false }))
      return
    }

    const pct = parseFloat(valStr)
    if (isNaN(pct) || pct < 0) {
      setVarDiscountFixed("")
      setVarFormState(prev => ({ ...prev, promo_price: "", use_parent_promo_price: false }))
      return
    }

    const fixed = orig * (pct / 100)
    setVarDiscountFixed(fixed.toFixed(2))
    const promo = orig - fixed
    setVarFormState(prev => ({ ...prev, promo_price: promo > 0 ? promo.toFixed(2) : "0", use_parent_promo_price: false }))
  }

  // Quando muda o desconto fixo da variação (R$)
  const handleVarDiscountFixedChange = (valStr: string) => {
    setVarDiscountFixed(valStr)
    const orig = parsePrice(varFormState.use_parent_price !== false ? formData.price : varFormState.price)
    if (isNaN(orig) || orig <= 0 || valStr === "") {
      setVarDiscountPercent("")
      setVarFormState(prev => ({ ...prev, promo_price: "", use_parent_promo_price: false }))
      return
    }

    const fixed = parsePrice(valStr)
    if (isNaN(fixed) || fixed < 0) {
      setVarDiscountPercent("")
      setVarFormState(prev => ({ ...prev, promo_price: "", use_parent_promo_price: false }))
      return
    }

    const pct = (fixed / orig) * 100
    setVarDiscountPercent(pct.toFixed(1))
    const promo = orig - fixed
    setVarFormState(prev => ({ ...prev, promo_price: promo > 0 ? promo.toFixed(2) : "0", use_parent_promo_price: false }))
  }

  // Quando muda o preço promocional final da variação (R$)
  const handleVarPromoPriceFieldChange = (valStr: string) => {
    setVarFormState(prev => ({ ...prev, promo_price: valStr, use_parent_promo_price: false }))
    const orig = parsePrice(varFormState.use_parent_price !== false ? formData.price : varFormState.price)
    if (isNaN(orig) || orig <= 0 || valStr === "") {
      setVarDiscountPercent("")
      setVarDiscountFixed("")
      return
    }

    const promo = parsePrice(valStr)
    if (isNaN(promo) || promo < 0 || promo >= orig) {
      setVarDiscountPercent("")
      setVarDiscountFixed("")
      return
    }

    const fixed = orig - promo
    const pct = (fixed / orig) * 100
    setVarDiscountFixed(fixed.toFixed(2))
    setVarDiscountPercent(pct.toFixed(1))
  }

  const handleFastSaveAttribute = async () => {
    if (!fastAttrName.trim()) {
      toast.error("Preencha o nome do atributo!")
      return
    }

    // Se houver algum valor pendente no input que não foi adicionado via Enter/Vírgula, adiciona agora
    let finalValues = [...fastAttrValues]
    const pendingVal = fastAttrValInput.trim().replace(/,/g, "")
    if (pendingVal) {
      if (!finalValues.includes(pendingVal)) {
        finalValues.push(pendingVal)
      }
    }

    if (finalValues.length === 0) {
      toast.error("Adicione pelo menos um valor!")
      return
    }

    const toastId = toast.loading("Salvando atributo...")
    try {
      if (editingAttrId) {
        const { error: attrErr } = await supabase
          .from("attributes")
          .update({ name: fastAttrName.trim() })
          .eq("id", editingAttrId)

        if (attrErr) throw attrErr

        const { error: delErr } = await supabase
          .from("attribute_values")
          .delete()
          .eq("attribute_id", editingAttrId)

        if (delErr) throw delErr

        const valuesToInsert = finalValues.map(val => ({
          attribute_id: editingAttrId,
          value: val
        }))
        const { error: valErr } = await supabase.from("attribute_values").insert(valuesToInsert)
        if (valErr) throw valErr

        toast.success("Atributo atualizado com sucesso!", { id: toastId })
        await fetchDbAttributes()
      } else {
        const { data: attr, error: attrErr } = await supabase
          .from("attributes")
          .insert([{ name: fastAttrName.trim() }])
          .select()
          .single()

        if (attrErr) throw attrErr

        const valuesToInsert = finalValues.map(val => ({
          attribute_id: attr.id,
          value: val
        }))
        const { error: valErr } = await supabase.from("attribute_values").insert(valuesToInsert)
        if (valErr) throw valErr

        toast.success("Atributo criado com sucesso!", { id: toastId })
        await fetchDbAttributes()

        // Seleciona automaticamente o atributo recém-criado na variação atual
        const attrName = fastAttrName.trim()
        const firstVal = finalValues[0] || ""
        setVarFormState(prev => ({
          ...prev,
          attributes: {
            ...prev.attributes,
            [attrName]: firstVal
          }
        }))
      }

      setIsFastCreateOpen(false)
      setFastAttrName("")
      setFastAttrValues([])
      setFastAttrValInput("")
      setEditingAttrId(null)
    } catch (err: any) {
      toast.error("Erro ao salvar atributo: " + err.message, { id: toastId })
    }
  }

  const handleKeyDownFastAttrVal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const val = fastAttrValInput.trim().replace(/,/g, "")
      if (val) {
        if (fastAttrValues.includes(val)) {
          toast.error("Este valor já foi adicionado!")
          return
        }
        setFastAttrValues(prev => [...prev, val])
      }
      setFastAttrValInput("")
    } else if (e.key === "Backspace" && !fastAttrValInput) {
      setFastAttrValues(prev => prev.slice(0, -1))
    }
  }

  const handleDeleteDbAttribute = async (attrId: string) => {
    if (!confirm("Excluir este atributo global e todos os seus valores vinculados? Isso pode afetar variações existentes.")) return
    try {
      const { error } = await supabase.from("attributes").delete().eq("id", attrId)
      if (error) throw error
      toast.success("Atributo excluído com sucesso!")
      await fetchDbAttributes()
      if (editingAttrId === attrId) {
        setEditingAttrId(null)
        setFastAttrName("")
        setFastAttrValues([])
        setFastAttrValInput("")
      }
    } catch (err: any) {
      toast.error("Erro ao excluir atributo: " + err.message)
    }
  }

  const handleStartEditDbAttribute = (attrId: string, attrName: string) => {
    const vals = dbAttributeValues
      .filter(v => v.attribute_id === attrId)
      .map(v => v.value)
    
    setEditingAttrId(attrId)
    setFastAttrName(attrName)
    setFastAttrValues(vals)
    setFastAttrValInput("")
  }

  const handleCancelEditDbAttribute = () => {
    setEditingAttrId(null)
    setFastAttrName("")
    setProductVariations(prev => prev) // To satisfy typescript if unused
    setFastAttrValues([])
    setFastAttrValInput("")
  }

  const handleDeleteDbAttributeValue = async (valId: string) => {
    try {
      const { error } = await supabase.from("attribute_values").delete().eq("id", valId)
      if (error) throw error
      toast.success("Valor removido com sucesso!")
      await fetchDbAttributes()
    } catch (err: any) {
      toast.error("Erro ao remover valor: " + err.message)
    }
  }

  const handleAddDbAttributeValueToExisting = async (attrId: string, valText: string) => {
    if (!valText.trim()) return
    try {
      const { error } = await supabase
        .from("attribute_values")
        .insert([{ attribute_id: attrId, value: valText.trim() }])

      if (error) throw error
      toast.success("Valor adicionado com sucesso!")
      await fetchDbAttributes()
    } catch (err: any) {
      toast.error("Erro ao adicionar valor: " + err.message)
    }
  }



  const generateSlug = (text: string) =>
    text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")

  const isLoaded = useRef(false)

  // Carregar dados iniciais
  useEffect(() => {
    if (isOpen) {
      isLoaded.current = false
      fetchCategories()
      fetchOpportunities()
      fetchDbAttributes()
      if (productId) {
        fetchProduct(productId)
      } else {
        resetForm()
        isLoaded.current = true
      }
    }
  }, [isOpen, productId])

  // Efeito de Auto-save
  useEffect(() => {
    const isPublished = currentProduct?.status === "published"
    if (isOpen && isLoaded.current && formData.name && !isSaving && !isPublished) {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current)
      autoSaveTimeout.current = setTimeout(() => {
        triggerAutoSave()
      }, 1500)
    }
  }, [formData, isOpen, currentProduct])

  const resetForm = () => {
    setFormData({
      name: "", slug: "", description: "", price: "", promo_price: "", is_salvado: false,
      opportunity_id: null, category_ids: [], width: "", depth: "", height: "", depth_use_length: false, images: [],
    })
    setAutoSlug(true)
    setDiscountPercent("")
    setDiscountFixed("")
    setCurrentProduct(null)
    setStep(1)
    setProductVariations([])
    setIsFastCreateOpen(false)
    setFastAttrName("")
    setFastAttrValues([])
    setFastAttrValInput("")
    setEditingAttrId(null)
  }

  async function fetchCategories() {
    const [categoriesResult, relationshipsResult] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("category_relationships").select("parent_id, child_id"),
    ])
    setCategories((categoriesResult.data || []) as StoreCategory[])
    setCategoryRelationships((relationshipsResult.data || []) as CategoryRelationship[])
  }

  async function fetchOpportunities() {
    const { data } = await supabase.from("opportunities").select("*").eq("active", true).order("name")
    setOpportunities(data || [])
  }

  async function fetchDbAttributes() {
    try {
      const [attrRes, valRes] = await Promise.all([
        supabase.from("attributes").select("*").order("name"),
        supabase.from("attribute_values").select("*").order("value")
      ])
      setDbAttributes((attrRes.data || []) as { id: string; name: string }[])
      setDbAttributeValues((valRes.data || []) as { id: string; attribute_id: string; value: string }[])
    } catch (err) {
      console.error("Erro ao buscar atributos globais:", err)
    }
  }

  const parseLegacyMeasures = (measures: string | null) => {
    if (!measures) return { width: "", depth: "", height: "" }
    const labelled = {
      width: measures.match(/largura:\s*([^|]+)/i)?.[1]?.trim() || "",
      depth: measures.match(/profundidade:\s*([^|]+)/i)?.[1]?.trim() || "",
      height: measures.match(/altura:\s*([^|]+)/i)?.[1]?.trim() || "",
    }
    if (labelled.width || labelled.depth || labelled.height) return labelled
    const values = measures.split(/\s*x\s*/i)
    return { width: values[0] || "", depth: values[1] || "", height: values[2] || "" }
  }

  const formatMeasures = () => {
    const values = [
      formData.width && `Largura: ${formData.width}`,
      formData.depth && `${formData.depth_use_length ? "Comprimento" : "Profundidade"}: ${formData.depth}`,
      formData.height && `Altura: ${formData.height}`,
    ].filter(Boolean)
    return values.join(" | ")
  }

  async function fetchProduct(id: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(*)")
      .eq("id", id)
      .single()

    if (error) {
      toast.error("Erro ao carregar produto: " + error.message)
      isLoaded.current = true
      return
    }

    const { data: prodCats } = await supabase
      .from("product_categories")
      .select("category_id")
      .eq("product_id", id)

    if (data) {
      setCurrentProduct(data)
      const sortedImages = [...(data.product_images || [])].sort((a, b) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1))
      const legacyMeasures = parseLegacyMeasures(data.measures)
      setFormData({
        name: data.name,
        slug: data.slug,
        description: data.description || "",
        price: data.price.toString(),
        promo_price: data.promo_price ? data.promo_price.toString() : "",
        is_salvado: data.is_salvado || false,
        opportunity_id: (data as any).opportunity_id || null,
        category_ids: prodCats?.map((pc: any) => pc.category_id) || [],
        width: data.width || legacyMeasures.width,
        depth: data.depth || legacyMeasures.depth,
        height: data.height || legacyMeasures.height,
        depth_use_length: (data as any).depth_use_length || false,
        images: sortedImages.map((img: any) => img.image_url)
      })
      if (data.promo_price && data.price) {
        const orig = parseFloat(data.price.toString())
        const promo = parseFloat(data.promo_price.toString())
        const fixed = orig - promo
        const pct = (fixed / orig) * 100
        setDiscountFixed(fixed.toFixed(2))
        setDiscountPercent(pct.toFixed(1))
      } else {
        setDiscountFixed("")
        setDiscountPercent("")
      }

      // Buscar variações do produto
      const { data: variationsData } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: true })

      if (variationsData && variationsData.length > 0) {
        const mappedVars = variationsData.map((v: any) => {
          return {
            id: v.id,
            name: v.name,
            sku: v.sku || "",
            price: v.price ? v.price.toString() : "",
            image_url: v.image_url || "",
            attributes: v.attributes || {},
            promo_price: v.promo_price ? v.promo_price.toString() : "",
            description: v.description || "",
            width: v.width || "",
            depth: v.depth || "",
            height: v.height || "",
            use_parent_name: v.use_parent_name !== false,
            use_parent_price: v.use_parent_price !== false,
            use_parent_promo_price: v.use_parent_promo_price !== false,
            use_parent_dimensions: v.use_parent_dimensions !== false,
            use_parent_description: v.use_parent_description !== false
          }
        })
        setProductVariations(mappedVars)
        setVariationsEnabled(true)

        if (initialVariationId) {
          const varIndex = mappedVars.findIndex(v => v.id === initialVariationId)
          if (varIndex !== -1) {
            setTimeout(() => {
              setStep(2)
              const v = mappedVars[varIndex]
              setVarFormState({
                ...v,
                use_parent_price: v.use_parent_price !== false,
                use_parent_promo_price: v.use_parent_promo_price !== false,
                use_parent_dimensions: v.use_parent_dimensions !== false,
                use_parent_description: v.use_parent_description !== false
              })

              const isParentPrice = v.use_parent_price !== false
              const isParentPromo = v.use_parent_promo_price !== false
              const orig = parsePrice(isParentPrice ? data.price.toString() : v.price || "")
              const promo = parsePrice(isParentPromo ? (data.promo_price ? data.promo_price.toString() : "") : v.promo_price || "")
              
              if (orig > 0 && promo > 0 && promo < orig) {
                const fixed = orig - promo
                const pct = (fixed / orig) * 100
                setVarDiscountFixed(fixed.toFixed(2))
                setVarDiscountPercent(pct.toFixed(1))
              } else {
                setVarDiscountPercent("")
                setVarDiscountFixed("")
              }

              setEditingVarIndex(varIndex)
              setVarStep(1)
              setIsVarFormOpen(true)
            }, 100)
          }
        }
      } else {
        setProductVariations([])
        setVariationsEnabled(false)
      }

      // Indica que o carregamento terminou de forma segura ANTES de permitir o auto-save
      setTimeout(() => {
        isLoaded.current = true
      }, 50)
    }
  }

  const generateAutoSku = (varAttributes: Record<string, string>) => {
    const parentSlug = formData.slug || "prod"
    const attrsSlug = Object.entries(varAttributes)
      .map(([_, v]) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""))
      .filter(Boolean)
      .sort()
      .join("-")
    return attrsSlug ? `${parentSlug}-${attrsSlug}` : parentSlug
  }

  const handleOpenAddVar = () => {
    const initialAttrs: Record<string, string> = {}
    if (dbAttributes.length > 0) {
      initialAttrs[dbAttributes[0].name] = ""
    }

    setVarFormState({
      sku: "",
      price: formData.price,
      promo_price: formData.promo_price,
      description: formData.description,
      width: formData.width,
      depth: formData.depth,
      height: formData.height,
      image_url: "",
      attributes: initialAttrs,
      use_parent_price: true,
      use_parent_promo_price: true,
      use_parent_dimensions: true,
      use_parent_description: true,
      use_parent_name: true
    })
    setVarDiscountPercent("")
    setVarDiscountFixed("")
    setEditingVarIndex(null)
    setVarStep(1)
    setIsVarFormOpen(true)
  }

  const handleOpenEditVar = (index: number) => {
    const v = productVariations[index]
    setVarFormState({
      ...v,
      use_parent_price: v.use_parent_price !== false,
      use_parent_promo_price: v.use_parent_promo_price !== false,
      use_parent_dimensions: v.use_parent_dimensions !== false,
      use_parent_description: v.use_parent_description !== false,
      use_parent_name: v.use_parent_name !== false
    })

    const isParentPrice = v.use_parent_price !== false
    const isParentPromo = v.use_parent_promo_price !== false
    const orig = parsePrice(isParentPrice ? formData.price : v.price || "")
    const promo = parsePrice(isParentPromo ? formData.promo_price : v.promo_price || "")
    
    if (orig > 0 && promo > 0 && promo < orig) {
      const fixed = orig - promo
      const pct = (fixed / orig) * 100
      setVarDiscountFixed(fixed.toFixed(2))
      setVarDiscountPercent(pct.toFixed(1))
    } else {
      setVarDiscountPercent("")
      setVarDiscountFixed("")
    }

    setEditingVarIndex(index)
    setVarStep(1)
    setIsVarFormOpen(true)
  }

  const handleSaveVarForm = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (varStep < 3) {
      setVarStep(varStep + 1)
      return
    }
    
    const updatedAttributes = { ...varFormState.attributes }
    const generatedSku = generateAutoSku(updatedAttributes)
    
    const updatedVar: TempVariation = {
      ...varFormState,
      id: varFormState.id || (typeof window !== 'undefined' ? window.crypto.randomUUID() : undefined),
      sku: generatedSku,
      stock: varFormState.stock || "999"
    }

    if (varFormState.use_parent_name !== false) {
      updatedVar.name = formData.name || "Padrão"
    } else {
      updatedVar.name = varFormState.name || "Padrão"
    }

    if (editingVarIndex !== null) {
      const updated = [...productVariations]
      updated[editingVarIndex] = updatedVar
      setProductVariations(updated)
    } else {
      setProductVariations(prev => [...prev, updatedVar])
    }
    setIsVarFormOpen(false)
  }

  const toggleUseParent = (index: number, field: 'price' | 'promo_price' | 'dimensions' | 'description') => {
    const updated = [...productVariations]
    const v = updated[index]
    
    if (field === 'price') {
      const currentVal = v.use_parent_price !== false
      v.use_parent_price = !currentVal
      if (v.use_parent_price) {
        v.price = formData.price
      }
    } else if (field === 'promo_price') {
      const currentVal = v.use_parent_promo_price !== false
      v.use_parent_promo_price = !currentVal
      if (v.use_parent_promo_price) {
        v.promo_price = formData.promo_price
      }
    } else if (field === 'dimensions') {
      const currentVal = v.use_parent_dimensions !== false
      v.use_parent_dimensions = !currentVal
      if (v.use_parent_dimensions) {
        v.width = formData.width
        v.depth = formData.depth
        v.height = formData.height
      }
    } else if (field === 'description') {
      const currentVal = v.use_parent_description !== false
      v.use_parent_description = !currentVal
      if (v.use_parent_description) {
        v.description = formData.description
      }
    }
    
    setProductVariations(updated)
  }

  const saveProductData = async () => {
    let baseSlug = formData.slug ? formData.slug.trim() : generateSlug(formData.name)
    if (!baseSlug) baseSlug = "produto"

    let finalSlug = baseSlug
    let counter = 0
    let slugExists = true

    while (slugExists) {
      const query = supabase
        .from("products")
        .select("id")
        .eq("slug", finalSlug)
      
      if (currentProduct?.id) {
        query.neq("id", currentProduct.id)
      }

      const { data: existing, error } = await query
      if (error) throw error

      if (existing && existing.length > 0) {
        counter++
        finalSlug = `${baseSlug}-${counter}`
      } else {
        slugExists = false
      }
    }

    if (finalSlug !== formData.slug) {
      setFormData(prev => ({ ...prev, slug: finalSlug }))
    }

    const dataToSave = {
      name: formData.name,
      slug: finalSlug,
      description: formData.description,
      price: formData.price ? parsePrice(formData.price) : 0,
      promo_price: formData.promo_price ? parsePrice(formData.promo_price) : null,
      is_salvado: formData.is_salvado || false,
      opportunity_id: formData.opportunity_id,
      width: formData.width || null,
      depth: formData.depth || null,
      height: formData.height || null,
      depth_use_length: formData.depth_use_length || false,
      measures: formatMeasures() || null,
      status: currentProduct?.status || 'draft'
    }

    let savedId = currentProduct?.id

    if (currentProduct?.id) {
      const { error } = await supabase.from("products").update(dataToSave).eq("id", currentProduct.id)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from("products").insert([dataToSave]).select()
      if (error) throw error
      savedId = data[0].id
      setCurrentProduct(data[0])
    }

    // Sincronizar Imagens
    if (formData.images.length > 0 && savedId) {
      await supabase.from("product_images").delete().eq("product_id", savedId)
      const imageRecords = formData.images.map((url, index) => ({
        product_id: savedId,
        image_url: url,
        is_main: index === 0
      }))
      const { error } = await supabase.from("product_images").insert(imageRecords)
      if (error) throw error
    }

    // Sincronizar Categorias
    if (savedId) {
      await supabase.from("product_categories").delete().eq("product_id", savedId)
      if (formData.category_ids.length > 0) {
        const categoryRecords = formData.category_ids.map(categoryId => ({
          product_id: savedId,
          category_id: categoryId
        }))
        const { error } = await supabase.from("product_categories").insert(categoryRecords)
        if (error) throw error
      }
    }

    // Sincronizar Variações
    if (savedId) {
      if (variationsEnabled && productVariations.length > 0) {
        // 1. Apagar variações antigas que foram excluídas no frontend
        const currentIds = productVariations.map(v => v.id).filter(Boolean)
        if (currentIds.length > 0) {
          // Deletar as que não estão no array
          const { error: delErr } = await supabase
            .from("product_variations")
            .delete()
            .eq("product_id", savedId)
            .not("id", "in", `(${currentIds.join(",")})`)
          if (delErr) throw delErr
        } else {
          // Se a lista de variações estiver vazia, apaga todas as variações desse produto
          const { error: delErr } = await supabase.from("product_variations").delete().eq("product_id", savedId)
          if (delErr) throw delErr
        }

        // 2. Inserir ou atualizar as variações atuais
        const updatedVariations = productVariations.map(v => {
          const isParentPrice = v.use_parent_price !== false
          const isParentPromo = v.use_parent_promo_price !== false
          const isParentDims = v.use_parent_dimensions !== false
          const isParentDesc = v.use_parent_description !== false

          return {
            ...v,
            price: isParentPrice ? formData.price : v.price,
            promo_price: isParentPromo ? formData.promo_price : v.promo_price,
            width: isParentDims ? formData.width : v.width,
            depth: isParentDims ? formData.depth : v.depth,
            height: isParentDims ? formData.height : v.height,
            description: isParentDesc ? formData.description : v.description,
          }
        })
        setProductVariations(updatedVariations)

        const recordsToSave = updatedVariations.map(v => ({
          ...(v.id ? { id: v.id } : {}),
          product_id: savedId,
          name: v.name,
          sku: v.sku || null,
          price: v.use_parent_price ? null : (v.price ? parsePrice(v.price) : null),
          stock: v.stock ? parseInt(v.stock, 10) : 0,
          image_url: v.image_url || null,
          attributes: v.attributes,
          promo_price: v.use_parent_promo_price ? null : (v.promo_price ? parsePrice(v.promo_price) : null),
          description: v.use_parent_description ? null : (v.description || null),
          width: v.use_parent_dimensions ? null : (v.width || null),
          depth: v.use_parent_dimensions ? null : (v.depth || null),
          height: v.use_parent_dimensions ? null : (v.height || null),
          use_parent_name: v.use_parent_name !== false,
          use_parent_price: v.use_parent_price !== false,
          use_parent_promo_price: v.use_parent_promo_price !== false,
          use_parent_dimensions: v.use_parent_dimensions !== false,
          use_parent_description: v.use_parent_description !== false
        }))
        
        const { error: varErr } = await supabase.from("product_variations").upsert(recordsToSave)
        if (varErr) throw varErr
      } else {
        // Se desativado, apaga todas as variações desse produto
        const { error: delErr } = await supabase.from("product_variations").delete().eq("product_id", savedId)
        if (delErr) throw delErr
      }
    }

    return savedId
  }

  const triggerAutoSave = async () => {
    if (!formData.name || isSaving) return
    setIsAutoSaving(true)
    try {
      await saveProductData()
    } catch (error) {
      console.error("Erro no auto-save:", error)
    } finally {
      setIsAutoSaving(false)
    }
  }

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar fotos obrigatórias nas variações se estiverem ativas
    if (variationsEnabled && productVariations.length > 0) {
      const missingImage = productVariations.some(v => !v.image_url)
      if (missingImage) {
        toast.error("Obrigatoriedade: Vincule uma foto para cada uma das variações do produto antes de prosseguir.")
        setStep(4)
        return
      }
    }

    // Validar dados antes de prosseguir ou concluir
    const validation = productSchema.safeParse({
      ...formData,
      price: parsePrice(formData.price) || 0,
      promo_price: formData.promo_price ? parsePrice(formData.promo_price) : null,
      category_ids: formData.category_ids,
    })

    if (!validation.success) {
      const firstError = validation.error.issues[0].message
      toast.error(firstError)
      return
    }

    // Cancelar qualquer autosave pendente
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current)
    }

    setIsSaving(true)
    try {
      const savedId = await saveProductData()
      if (!savedId) throw new Error("Não foi possível salvar os dados do produto.")

      const { error } = await supabase
        .from("products")
        .update({ status: 'published' })
        .eq("id", savedId)

      if (error) throw error

      // Atualizar o estado do produto atual para refletir que ele está publicado
      if (currentProduct) {
        setCurrentProduct({ ...currentProduct, status: 'published' })
      }

      // Sincronizar com o catálogo da Meta em background
      fetch("/api/catalog/sync-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: savedId,
          action: "UPDATE",
        }),
      }).catch((err) => console.error("Erro ao sincronizar com a Meta:", err))

      toast.success("Produto salvo com sucesso!")
      if (typeof window !== "undefined") {
        const channel = new BroadcastChannel("catalog-updates")
        channel.postMessage("catalog-updated")
        channel.close()
      }
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsSaving(true)
    const toastId = toast.loading("Otimizando imagens...")

    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const optimizedBlob = await optimizeProductImage(file)
        const optimizedFile = new File([optimizedBlob], `${Date.now()}.jpg`, { type: "image/jpeg" })
        
        const publicUrl = await uploadToR2(optimizedFile)
        newUrls.push(publicUrl)
      }

      setFormData(prev => ({ ...prev, images: [...prev.images, ...newUrls] }))
      toast.success("Imagens enviadas!", { id: toastId })
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const setMainImage = (index: number) => {
    setFormData(prev => {
      const updated = [...prev.images]
      const [item] = updated.splice(index, 1)
      return { ...prev, images: [item, ...updated] }
    })
  }

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsSaving(true)
    const toastId = toast.loading("Substituindo imagem...")

    try {
      const file = files[0]
      const optimizedBlob = await optimizeProductImage(file)
      const optimizedFile = new File([optimizedBlob], `${Date.now()}.jpg`, { type: "image/jpeg" })
      
      const publicUrl = await uploadToR2(optimizedFile)
      
      setFormData(prev => {
        const newImages = [...prev.images]
        newImages[index] = publicUrl
        return { ...prev, images: newImages }
      })
      toast.success("Imagem substituída!", { id: toastId })
    } catch (error: any) {
      toast.error("Erro na substituição: " + error.message, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  // Listener global para Ctrl+V (colar imagens) ao estar na etapa de fotos
  useEffect(() => {
    if (!isOpen || step !== 1) return

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const filesToUpload: File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            filesToUpload.push(file)
          }
        }
      }

      if (filesToUpload.length === 0) return

      // Evitar upload caso ultrapasse o limite
      if (formData.images.length + filesToUpload.length > 12) {
        toast.error("Você só pode enviar até 12 imagens.")
        return
      }

      setIsSaving(true)
      const toastId = toast.loading("Otimizando imagem colada...")

      try {
        const newUrls: string[] = []
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i]
          const optimizedBlob = await optimizeProductImage(file)
          const optimizedFile = new File([optimizedBlob], `pasted-${Date.now()}.jpg`, { type: "image/jpeg" })

          const publicUrl = await uploadToR2(optimizedFile)
          newUrls.push(publicUrl)
        }

        setFormData(prev => ({ ...prev, images: [...prev.images, ...newUrls] }))
        toast.success("Imagem colada com sucesso!", { id: toastId })
      } catch (error: any) {
        toast.error("Erro no upload da imagem colada: " + error.message, { id: toastId })
      } finally {
        setIsSaving(false)
      }
    }

    window.addEventListener("paste", handleGlobalPaste)
    return () => {
      window.removeEventListener("paste", handleGlobalPaste)
    }
  }, [isOpen, step, formData.images, supabase.storage])

  const handleDragOverArea = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  const handleDragLeaveArea = () => {
    setIsDraggingOver(false)
  }

  const handleDropArea = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)

    // 1. Verificar se são arquivos locais arrastados
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      setIsSaving(true)
      const toastId = toast.loading("Otimizando imagens soltas...")
      try {
        const newUrls: string[] = []
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (file.type.startsWith("image/")) {
            const optimizedBlob = await optimizeProductImage(file)
            const optimizedFile = new File([optimizedBlob], `${Date.now()}.jpg`, { type: "image/jpeg" })
            
            const publicUrl = await uploadToR2(optimizedFile)
            newUrls.push(publicUrl)
          }
        }
        if (newUrls.length > 0) {
          setFormData(prev => ({ ...prev, images: [...prev.images, ...newUrls] }))
          toast.success("Imagens adicionadas com sucesso!", { id: toastId })
        } else {
          toast.dismiss(toastId)
        }
      } catch (error: any) {
        toast.error("Erro no upload das imagens: " + error.message, { id: toastId })
      } finally {
        setIsSaving(false)
      }
    } else {
      // 2. Tentar obter a URL de uma imagem arrastada diretamente de outro site
      const imageUrl = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("URL")
      if (imageUrl) {
        setIsSaving(true)
        const toastId = toast.loading("Tentando baixar imagem arrastada do site...")
        try {
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          if (!blob.type.startsWith("image/")) {
            throw new Error("O link não corresponde a uma imagem válida.")
          }
          const file = new File([blob], `dragged-${Date.now()}.jpg`, { type: blob.type })
          const optimizedBlob = await optimizeProductImage(file)
          const optimizedFile = new File([optimizedBlob], `dragged-${Date.now()}.jpg`, { type: "image/jpeg" })

          const publicUrl = await uploadToR2(optimizedFile)
          setFormData(prev => ({ ...prev, images: [...prev.images, publicUrl] }))
          toast.success("Imagem arrastada com sucesso!", { id: toastId })
        } catch (error: any) {
          // Toast explicativo devido a restrições CORS que ocorrem com frequência no carregamento direto via fetch front-end
          toast.error("Este site protege as imagens de fora. Para funcionar, clique nela com o botão direito -> 'Copiar imagem' e aperte Ctrl + V aqui!", { id: toastId, duration: 8000 })
        } finally {
          setIsSaving(false)
        }
      }
    }
  }

  // Permite rolar horizontalmente a lista de imagens usando a roda vertical do mouse (scroll wheel)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleWheelNative = (e: WheelEvent) => {
      // Se houver conteúdo rolável horizontalmente
      if (container.scrollWidth > container.clientWidth) {
        e.preventDefault()
        container.scrollLeft += e.deltaY
      }
    }

    container.addEventListener("wheel", handleWheelNative, { passive: false })
    return () => {
      container.removeEventListener("wheel", handleWheelNative)
    }
  }, [formData.images])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 border-none shadow-2xl bg-white gap-0
          w-full h-[100dvh] max-h-[100dvh] rounded-none flex flex-col
          sm:rounded-[32px] sm:w-[95vw] sm:h-[90vh] sm:max-h-[850px] sm:max-w-[850px]"
      >
        <form 
          onSubmit={handleFinish} 
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
              e.preventDefault()
            }
          }}
          className="flex flex-col h-full min-h-0 overflow-hidden"
        >
          <DialogHeader className="p-4 md:p-8 bg-primary text-white space-y-3 flex-shrink-0 relative">
            <div className="flex justify-between items-start pr-8">
              <div className="space-y-0.5">
                <DialogTitle className="text-lg md:text-2xl font-black tracking-tight flex items-center gap-2">
                  {currentProduct ? "Editar Produto" : "Novo Produto"}
                  {isAutoSaving ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : <Cloud className="h-4 w-4 text-white/50" />}
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/70 text-xs font-medium">
                  {isAutoSaving ? "Sincronizando..." : "Alterações salvas automaticamente."}
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-white border-white/40 bg-white/10 px-2 py-1 font-bold shrink-0 text-xs">
                {step}/4
              </Badge>
            </div>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={`flex-1 py-2 text-[10px] sm:text-xs font-bold border-b-4 transition-all hover:bg-white/5 rounded-t-lg ${step === s ? "border-white text-white bg-white/10" : "border-white/20 text-white/60 hover:text-white/90"}`}
                >
                  {s === 1 ? "1. Fotos" : s === 2 ? "2. Identificação" : s === 3 ? "3. Ficha Técnica" : "4. Variações"}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8" style={{ WebkitOverflowScrolling: 'touch' }}>
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
                  <Layers className="h-5 w-5" />
                  <span>Identificação & Preço</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Nome do Produto <span className="text-red-500">*</span></label>
                    <Input
                      placeholder="Nome do produto"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value
                        setFormData(prev => ({
                          ...prev,
                          name,
                          slug: autoSlug ? generateSlug(name) : prev.slug
                        }))
                      }}
                      className="h-12 text-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-gray-700">Slug (URL) <span className="text-red-500">*</span></label>
                      <button
                        type="button"
                        onClick={() => setAutoSlug(prev => !prev)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                          autoSlug ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {autoSlug ? "Automático" : "Manual"}
                      </button>
                    </div>
                    <Input
                      placeholder="slug-do-produto"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/ /g, "-") })}
                      className="h-12"
                      readOnly={autoSlug}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Preço Original (R$) <span className="text-red-500">*</span></label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0,00" 
                      value={formData.price} 
                      onChange={(e) => handlePriceChange(e.target.value)} 
                      className="h-12 font-bold" 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700">Oportunidade</label>
                      <a
                        href="/admin/opportunities"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Gerenciar
                      </a>
                    </div>
                    <Select 
                      value={formData.opportunity_id || "none"}
                      onValueChange={(val) => {
                        const oppId = val === "none" ? null : val
                        const selectedOpp = opportunities.find(o => o.id === oppId)
                        const isOppSalvado = selectedOpp?.name?.toLowerCase().includes("salvado") || false
                        setFormData(prev => ({
                          ...prev,
                          opportunity_id: oppId,
                          is_salvado: isOppSalvado,
                        }))
                      }}
                    >
                      <SelectTrigger className="h-12 border-2 rounded-xl bg-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma (Produto Normal)</SelectItem>
                        {opportunities.map((opp) => (
                          <SelectItem key={opp.id} value={opp.id}>
                            <div className="flex items-center gap-2">
                              <div className={`h-2.5 w-2.5 rounded-full ${opp.badge_color}`} />
                              {opp.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* Desconto (%) */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Desconto (%)</label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={discountPercent} 
                        onChange={(e) => handleDiscountPercentChange(e.target.value)} 
                        className="h-12 font-bold pr-9" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">%</span>
                    </div>
                  </div>

                  {/* Desconto (R$) */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Desconto (R$)</label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        value={discountFixed} 
                        onChange={(e) => handleDiscountFixedChange(e.target.value)} 
                        className="h-12 font-bold pr-9" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">R$</span>
                    </div>
                  </div>

                  {/* Preço Promocional (R$) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-gray-700">Preço Promocional</label>
                      {(formData.promo_price || discountPercent || discountFixed) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, promo_price: "" }))
                            setDiscountPercent("")
                            setDiscountFixed("")
                          }}
                          className="text-[10px] font-bold text-red-500 hover:underline"
                        >
                          Limpar Promoção
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Sem desconto" 
                        value={formData.promo_price} 
                        onChange={(e) => handlePromoPriceFieldChange(e.target.value)} 
                        className="h-12 border-green-200 bg-green-50/30 font-bold pr-9" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-green-600 pointer-events-none">R$</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">Categoria(s) <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setIsCategoriesManagerOpen(true)}
                      className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline transition-colors cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Gerenciar
                    </button>
                  </div>
                  <div className="mt-2 max-h-[320px] overflow-y-auto rounded-xl border bg-gray-50/50 p-2 custom-scrollbar">
                    {categories.filter((cat) => cat.type === "category").map(cat => {
                      const environments = categoryRelationships
                        .filter((relationship) => relationship.child_id === cat.id)
                        .map((relationship) => categories.find((item) => item.id === relationship.parent_id))
                        .filter((item): item is StoreCategory => item?.type === "environment")

                      return (
                        <label key={cat.id} className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-white/50 p-3 transition-all hover:border-gray-200 hover:bg-white">
                          <Checkbox
                            checked={formData.category_ids.includes(cat.id)}
                            onCheckedChange={(checked) => {
                              setFormData(prev => ({
                                ...prev,
                                category_ids: checked
                                  ? [...prev.category_ids, cat.id]
                                  : prev.category_ids.filter(id => id !== cat.id)
                              }))
                            }}
                          />
                          <div className="min-w-0">
                            <span className="block text-sm font-medium">{cat.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {environments.length ? `Ambientes: ${environments.map((environment) => environment.name).join(", ")}` : "Sem ambiente vinculado"}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
                  <Info className="h-5 w-5" />
                  <span>Descrição e Ficha Técnica</span>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Descrição Completa <span className="text-gray-400 font-normal text-xs">(Opcional)</span></label>
                  <Textarea placeholder="Descrição completa" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={6} className="resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700">Medidas <span className="text-gray-400 font-normal text-xs">(em cm — Opcional)</span></label>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500">Largura</span>
                        <div className="relative">
                          <Input placeholder="Largura" value={formData.width} onChange={(e) => setFormData({ ...formData, width: e.target.value })} className="pr-9" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">cm</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-500">
                            {formData.depth_use_length ? "Comprimento" : "Profundidade"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, depth_use_length: !prev.depth_use_length }))}
                            title={formData.depth_use_length ? "Alternar para Profundidade" : "Alternar para Comprimento"}
                            className="p-0.5 rounded text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="relative">
                          <Input placeholder={formData.depth_use_length ? "Compr." : "Profund."} value={formData.depth} onChange={(e) => setFormData({ ...formData, depth: e.target.value })} className="pr-9" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">cm</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500">Altura</span>
                        <div className="relative">
                          <Input placeholder="Altura" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} className="pr-9" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">cm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Camera className="h-5 w-5" />
                    <span>Fotos do Produto ({formData.images.length}/12)</span>
                  </div>
                  {formData.images.length === 0 && (
                    <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-full border border-red-200">
                      ⚠ Mínimo 1 foto
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground bg-blue-50/50 text-blue-700 p-3 rounded-2xl border border-blue-100 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-blue-600" />
                  <span><strong>Dica prática:</strong> Você pode arrastar e soltar imagens aqui ou copiar de qualquer site (botão direito {"->"} "Copiar imagem") e colar com <strong>Ctrl + V</strong>!</span>
                </p>
                <div 
                  className={`transition-colors rounded-3xl border-2 border-dashed p-4 md:p-8 ${isDraggingOver ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50"}`}
                  onDragOver={handleDragOverArea}
                  onDragLeave={handleDragLeaveArea}
                  onDrop={handleDropArea}
                >
                  <div ref={scrollContainerRef} className="flex overflow-x-auto pb-2 gap-4 scrollbar-thin select-none shrink-0 min-w-0 w-full">
                    {formData.images.length < 12 && (
                      <label className="h-32 w-32 bg-white border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group shrink-0">
                        <Plus className="h-6 w-6 text-primary group-hover:scale-125 transition-transform" />
                        <span className="text-xs font-bold text-gray-500">Adicionar</span>
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                      </label>
                    )}
                    {formData.images.map((url, index) => (
                      <div 
                        key={index} 
                        draggable 
                        onDragStart={() => setDraggedIndex(index)}
                        onDragOver={(e) => {
                          e.preventDefault()
                          if (draggedIndex === null || draggedIndex === index) return
                          const newImages = [...formData.images]
                          const item = newImages.splice(draggedIndex, 1)[0]
                          newImages.splice(index, 0, item)
                          setDraggedIndex(index)
                          setFormData({ ...formData, images: newImages })
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                        onClick={() => {
                          setActiveImageIndex(index)
                        }}
                        className={`group relative h-32 w-32 rounded-3xl overflow-hidden border-2 cursor-move shrink-0 ${index === 0 ? "border-primary" : "border-transparent"}`}
                        title="Arraste para reordenar ou toque para opções"
                      >
                        <img src={url} alt="Foto" className="object-cover w-full h-full" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                          <div className="flex gap-2">
                            <label onClick={(e) => e.stopPropagation()} className="bg-blue-500 text-white p-2 rounded-lg cursor-pointer hover:bg-blue-600 transition-colors" title="Substituir Imagem">
                              <Camera className="h-4 w-4" />
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleReplaceImage(e, index)} />
                            </label>
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(index) }} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors" title="Apagar Imagem">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {index !== 0 && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setMainImage(index) }} className="bg-white text-[10px] text-black font-bold px-3 py-1 rounded hover:bg-gray-100 transition-colors">
                              Definir Capa
                            </button>
                          )}
                        </div>
                        {index === 0 && <Badge className="absolute top-2 left-2 bg-primary pointer-events-none z-20">Capa</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Layers className="h-5 w-5" />
                    <span>Grade de Variações do Produto</span>
                  </div>
                  {variationsEnabled && (
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          if (confirm("Tem certeza que deseja desativar as variações? Todas as variações criadas serão perdidas ao salvar.")) {
                            setVariationsEnabled(false)
                            setProductVariations([])
                          }
                        }}
                        className="h-9 text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 rounded-lg"
                      >
                        Desativar Variações
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsFastCreateOpen(true)}
                        className="h-9 text-xs gap-1.5 rounded-lg border-primary/20 text-primary hover:bg-primary/5"
                      >
                        <Tags className="h-4 w-4" /> Gerenciar Atributos/Valores
                      </Button>
                      <Button 
                        type="button" 
                        onClick={handleOpenAddVar}
                        className="h-9 text-xs gap-1.5 rounded-lg font-bold"
                      >
                        <Plus className="h-4 w-4" /> Adicionar Variação
                      </Button>
                    </div>
                  )}
                </div>

                {!variationsEnabled ? (
                  <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50 space-y-4">
                    <Layers className="h-12 w-12 text-gray-300 animate-pulse" />
                    <div className="text-center space-y-1">
                      <h4 className="font-bold text-gray-700">Este produto possui variações?</h4>
                      <p className="text-xs text-muted-foreground max-w-xs">Ative variações se este produto tiver diferentes opções de tamanho, cor, material, etc. com fotos dedicadas.</p>
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => {
                        setVariationsEnabled(true)
                        if (productVariations.length === 0) {
                          setProductVariations([{
                            sku: "",
                            price: formData.price,
                            promo_price: formData.promo_price,
                            description: formData.description,
                            width: formData.width,
                            depth: formData.depth,
                            height: formData.height,
                            image_url: "",
                            attributes: {},
                            use_parent_price: true,
                            use_parent_promo_price: true,
                            use_parent_dimensions: true,
                            use_parent_description: true,
                            stock: "999"
                          }])
                        }
                      }}
                      className="font-bold rounded-xl"
                    >
                      Ativar Variações para este Produto
                    </Button>
                  </div>
                ) : productVariations.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-sm text-muted-foreground italic">
                    Nenhuma variação adicionada ainda. Clique em "Adicionar Variação" acima para começar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Combinações Ativas ({productVariations.length})</h5>
                      <button 
                        type="button" 
                        onClick={() => setProductVariations([])} 
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        Limpar Variações
                      </button>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="md:hidden space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {productVariations.map((v, index) => {
                        const varPrice = v.use_parent_price !== false ? formData.price : v.price
                        const varPromoPrice = v.use_parent_promo_price !== false ? formData.promo_price : v.promo_price

                        return (
                          <div key={index} className="border rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3 relative">
                            <div className="relative h-14 w-14 rounded-xl overflow-hidden border shrink-0 bg-gray-50">
                              {v.image_url ? (
                                <img src={v.image_url.split(",")[0]} alt="Variante" className="object-cover h-full w-full" />
                              ) : (
                                <ImageIcon className="h-6 w-6 m-auto text-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h6 className="font-bold text-xs text-gray-800 line-clamp-1">{v.name || "Sem Nome"}</h6>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {v.sku || "Auto"}</p>
                              <div className="mt-1">
                                {varPromoPrice ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-red-500 line-through font-bold">
                                      R$ {parseFloat(varPrice).toFixed(2)}
                                    </span>
                                    <span className="text-xs font-black text-primary">
                                      R$ {parseFloat(varPromoPrice).toFixed(2)}
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-xs font-bold text-gray-800">
                                    {varPrice ? `R$ ${parseFloat(varPrice).toFixed(2)}` : "Preço herdado"}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleOpenEditVar(index)}
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setProductVariations(prev => prev.filter((_, i) => i !== index))}
                                className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
 
                     {/* PC View: Table */}
                     <div className="hidden md:block overflow-x-auto border rounded-xl bg-white max-h-[350px] custom-scrollbar">
                       <table className="w-full text-sm text-left border-collapse">
                         <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase border-b sticky top-0 z-10">
                           <tr>
                             <th className="p-3 w-[80px]">Foto</th>
                             <th className="p-3">Nome da Variação</th>
                             <th className="p-3 w-[180px]">SKU</th>
                             <th className="p-3 w-[150px]">Preço</th>
                             <th className="p-3 w-[100px] text-center">Ações</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y">
                           {productVariations.map((v, index) => {
                             const varPrice = v.use_parent_price !== false ? formData.price : v.price
                             const varPromoPrice = v.use_parent_promo_price !== false ? formData.promo_price : v.promo_price
                             return (
                               <tr key={index} className="hover:bg-gray-50/50">
                                 <td className="p-3">
                                   <div className="relative h-10 w-10 rounded border overflow-hidden bg-gray-50">
                                     {v.image_url ? (
                                       <img src={v.image_url.split(",")[0]} alt="Variante" className="object-cover h-full w-full" />
                                     ) : (
                                       <ImageIcon className="h-5 w-5 m-auto text-gray-300" />
                                     )}
                                   </div>
                                 </td>
                                 <td className="p-3 font-medium text-gray-800">
                                   {v.name || "Sem Nome"}
                                 </td>
                                 <td className="p-3 text-xs font-mono text-gray-500">
                                   {v.sku || "Auto"}
                                 </td>
                                 <td className="p-3">
                                   {varPromoPrice ? (
                                     <div className="flex flex-col gap-0.5">
                                       <span className="text-[10px] text-red-500 line-through font-bold">
                                         R$ {parseFloat(varPrice).toFixed(2)}
                                       </span>
                                       <span className="font-extrabold text-xs text-primary">
                                         R$ {parseFloat(varPromoPrice).toFixed(2)}
                                       </span>
                                     </div>
                                   ) : (
                                     <span className="font-bold text-xs text-gray-800">
                                       {varPrice ? `R$ ${parseFloat(varPrice).toFixed(2)}` : "Preço herdado"}
                                     </span>
                                   )}
                                 </td>
                                 <td className="p-3 text-center space-x-1">
                                   <Button 
                                     type="button" 
                                     variant="ghost" 
                                     size="icon" 
                                     onClick={() => handleOpenEditVar(index)}
                                     className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg"
                                     title="Editar"
                                   >
                                     <Pencil className="h-4 w-4" />
                                   </Button>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setProductVariations(prev => prev.filter((_, i) => i !== index))}
                                    className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                                    title="Excluir"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-Modal de Formulário da Variação — Réplica do Pai */}
                <Dialog open={isVarFormOpen} onOpenChange={setIsVarFormOpen}>
                  <DialogContent className="p-0 border-none shadow-2xl bg-white gap-0 w-full h-[90dvh] max-h-[90dvh] rounded-none flex flex-col sm:rounded-[32px] sm:w-[90vw] sm:h-[80vh] sm:max-h-[700px] sm:max-w-[700px] overflow-hidden">
                    <form onSubmit={handleSaveVarForm} className="flex flex-col h-full min-h-0 overflow-hidden">
                      <DialogHeader className="p-4 md:p-6 bg-primary text-white space-y-3 flex-shrink-0 relative">
                        <div className="flex justify-between items-start pr-8">
                          <div className="space-y-0.5">
                            <DialogTitle className="text-base md:text-xl font-black tracking-tight flex items-center gap-2">
                              {editingVarIndex !== null ? "Editar Variação" : "Nova Variação"}
                              <span className="text-white/50 text-xs font-normal">| {formData.name || "Produto Pai"}</span>
                            </DialogTitle>
                            <DialogDescription className="text-primary-foreground/70 text-xs font-medium">
                              Configure os dados específicos desta variação.
                            </DialogDescription>
                          </div>
                          <Badge variant="outline" className="text-white border-white/40 bg-white/10 px-2 py-0.5 font-bold shrink-0 text-xs">
                            {varStep}/3
                          </Badge>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {[1, 2, 3].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setVarStep(s)}
                              className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold border-b-4 transition-all hover:bg-white/5 rounded-t-lg ${varStep === s ? "border-white text-white bg-white/10" : "border-white/20 text-white/60 hover:text-white/90"}`}
                            >
                              {s === 1 ? "1. Foto Vinculada" : s === 2 ? "2. Identificação & Preço" : "3. Ficha Técnica"}
                            </button>
                          ))}
                        </div>
                      </DialogHeader>

                      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {/* Etapa 1: Foto Vinculada */}
                        {varStep === 1 && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
                              <Camera className="h-5 w-5" />
                              <span>Vincular Foto <span className="text-red-500">*</span></span>
                            </div>
                            <p className="text-xs text-muted-foreground bg-blue-50/50 text-blue-700 p-3 rounded-2xl border border-blue-100">
                              Selecione obrigatoriamente uma das fotos adicionadas na Etapa 1 do produto principal para representar esta variação.
                            </p>

                            {formData.images.length === 0 ? (
                              <div className="text-center p-8 border border-dashed rounded-2xl text-xs text-red-500 bg-red-50 font-bold">
                                Nenhuma imagem disponível no produto principal. Adicione imagens na Etapa 1 primeiro!
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {formData.images.map((url, imgIndex) => {
                                  const selectedUrls = varFormState.image_url ? varFormState.image_url.split(",").filter(Boolean) : []
                                  const isSelected = selectedUrls.includes(url)
                                  const selectOrderIndex = selectedUrls.indexOf(url)

                                  return (
                                    <button
                                      key={imgIndex}
                                      type="button"
                                      onClick={() => {
                                        let updatedUrls = [...selectedUrls]
                                        if (isSelected) {
                                          updatedUrls = updatedUrls.filter(u => u !== url)
                                        } else {
                                          if (updatedUrls.length >= 12) {
                                            toast.error("Você pode selecionar no máximo 12 fotos.")
                                            return
                                          }
                                          updatedUrls.push(url)
                                        }
                                        setVarFormState(prev => ({ ...prev, image_url: updatedUrls.join(",") }))
                                      }}
                                      className={`relative aspect-square rounded-2xl overflow-hidden border-4 bg-gray-50 transition-all ${isSelected ? "border-primary scale-[1.03] shadow-md" : "border-transparent opacity-75 hover:opacity-100"}`}
                                    >
                                      <img src={url} alt={`Foto ${imgIndex + 1}`} className="object-cover h-full w-full" />
                                      {isSelected && (
                                        <Badge className="absolute top-1 right-1 bg-primary text-[8px] px-1 py-0 shadow z-10">
                                          #{selectOrderIndex + 1} Vinculada
                                        </Badge>
                                      )}
                                      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.2 rounded">
                                        Foto {imgIndex + 1}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Etapa 2: Identificação & Preço */}
                        {varStep === 2 && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
                              <Layers className="h-5 w-5" />
                              <span>Atributos & Preço</span>
                            </div>

                            {/* Nome / Título da Variante */}
                            <div className="space-y-2 border-b pb-3">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700">Título da Variante</label>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  onClick={() => setVarFormState(prev => {
                                    const nextUse = !prev.use_parent_name
                                    return { 
                                      ...prev, 
                                      use_parent_name: nextUse,
                                      name: nextUse ? (formData.name || "") : prev.name || ""
                                    }
                                  })}
                                  className={`p-1.5 rounded-lg transition-all ${varFormState.use_parent_name !== false ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                                  title={varFormState.use_parent_name !== false ? "Desvincular do Nome do Pai" : "Sincronizar Nome com o Pai"}
                                >
                                  {varFormState.use_parent_name !== false ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                              {varFormState.use_parent_name === false ? (
                                <Input 
                                  placeholder="Título personalizado da variante" 
                                  value={varFormState.name || ""} 
                                  onChange={e => setVarFormState(prev => ({ ...prev, name: e.target.value }))}
                                  required
                                  className="h-11 text-xs font-bold animate-in slide-in-from-top-1 duration-200" 
                                />
                              ) : (
                                <div className="text-xs text-muted-foreground bg-gray-50 p-2.5 rounded-lg border italic">
                                  {formData.name || "Sem nome (Herdado do produto principal)"}
                                </div>
                              )}
                            </div>

                            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border">
                               <div className="flex items-center justify-between border-b pb-2">
                                 <h6 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Atributos</h6>
                                 <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setIsFastCreateOpen(true)}
                                      className="h-7 text-[10px] font-bold gap-1 text-primary hover:bg-primary/5 px-2"
                                    >
                                      <Tags className="h-3 w-3" /> Gerenciar Atributos
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const availableAttr = dbAttributes.find(a => !Object.keys(varFormState.attributes).includes(a.name))
                                        if (availableAttr) {
                                          setVarFormState(prev => ({
                                            ...prev,
                                            attributes: { ...prev.attributes, [availableAttr.name]: "" }
                                          }))
                                        } else if (dbAttributes.length > 0) {
                                          toast.error("Todos os atributos disponíveis já foram adicionados.")
                                        }
                                      }}
                                      className="h-7 text-[10px] font-bold"
                                    >
                                      + Adicionar Atributo
                                    </Button>
                                  </div>
                               </div>

                               {Object.keys(varFormState.attributes).length === 0 ? (
                                 <p className="text-xs text-muted-foreground italic text-center py-2">Nenhum atributo adicionado ainda.</p>
                               ) : (
                                 <div className="space-y-3">
                                   {Object.entries(varFormState.attributes).map(([attrName, attrVal], idx) => {
                                     const currentAttr = dbAttributes.find(a => a.name === attrName)
                                     const attrVals = currentAttr ? dbAttributeValues.filter(val => val.attribute_id === currentAttr.id) : []

                                     return (
                                       <div key={idx} className="flex items-end gap-3 animate-in fade-in duration-200">
                                         <div className="flex-1 space-y-1.5">
                                           <label className="text-[10px] text-gray-500 font-bold uppercase">Atributo</label>
                                           <select
                                             value={attrName}
                                             onChange={e => {
                                               const newName = e.target.value
                                               if (newName === attrName) return
                                               setVarFormState(prev => {
                                                 const updated = { ...prev.attributes }
                                                 delete updated[attrName]
                                                 updated[newName] = ""
                                                 return { ...prev, attributes: updated }
                                               })
                                             }}
                                             className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                           >
                                             {dbAttributes.map(a => (
                                               <option key={a.id} value={a.name} disabled={Object.keys(varFormState.attributes).includes(a.name) && a.name !== attrName}>
                                                 {a.name}
                                               </option>
                                             ))}
                                           </select>
                                         </div>

                                         <div className="flex-1 space-y-1.5">
                                           <label className="text-[10px] text-gray-500 font-bold uppercase">Valor</label>
                                           <select
                                             value={attrVal}
                                             onChange={e => {
                                               const val = e.target.value
                                               setVarFormState(prev => ({
                                                 ...prev,
                                                 attributes: { ...prev.attributes, [attrName]: val }
                                               }))
                                             }}
                                             required
                                             className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                           >
                                             <option value="">Selecione...</option>
                                             {attrVals.map(val => (
                                               <option key={val.id} value={val.value}>{val.value}</option>
                                             ))}
                                           </select>
                                         </div>

                                         <Button
                                           type="button"
                                           variant="ghost"
                                           size="icon"
                                           onClick={() => {
                                             setVarFormState(prev => {
                                               const updated = { ...prev.attributes }
                                               delete updated[attrName]
                                               return { ...prev, attributes: updated }
                                             })
                                           }}
                                           className="h-10 w-10 text-red-500 hover:bg-red-50 shrink-0"
                                         >
                                           <Trash2 className="h-4 w-4" />
                                         </Button>
                                       </div>
                                     )
                                   })}
                                 </div>
                               )}
                             </div>

                            {/* Preço */}
                            <div className="space-y-2 border-b pb-3">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700">Preço</label>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  onClick={() => {
                                    setVarFormState(prev => {
                                      const nextUse = !prev.use_parent_price
                                      const newPrice = nextUse ? formData.price : prev.price
                                      
                                      const orig = parsePrice(newPrice || "")
                                      const promo = parsePrice(prev.use_parent_promo_price !== false ? formData.promo_price : prev.promo_price || "")
                                      if (orig > 0 && promo > 0 && promo < orig) {
                                        const fixed = orig - promo
                                        const pct = (fixed / orig) * 100
                                        setVarDiscountFixed(fixed.toFixed(2))
                                        setVarDiscountPercent(pct.toFixed(1))
                                      } else {
                                        setVarDiscountPercent("")
                                        setVarDiscountFixed("")
                                      }
                                      
                                      return { 
                                        ...prev, 
                                        use_parent_price: nextUse,
                                        price: newPrice 
                                      }
                                    })
                                  }}
                                  className={`p-1.5 rounded-lg transition-all ${varFormState.use_parent_price !== false ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                                  title={varFormState.use_parent_price !== false ? "Desvincular Preço do Pai" : "Sincronizar Preço com o Pai"}
                                >
                                  {varFormState.use_parent_price !== false ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                              {varFormState.use_parent_price === false && (
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="Preço personalizado" 
                                  value={varFormState.price} 
                                  onChange={e => handleVarPriceChange(e.target.value)}
                                  required
                                  className="h-11 text-xs font-bold animate-in slide-in-from-top-1 duration-200" 
                                />
                              )}
                            </div>

                            {/* Preço Promocional & Descontos */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700">Preço Promocional</label>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  onClick={() => {
                                    setVarFormState(prev => {
                                      const nextUse = !prev.use_parent_promo_price
                                      const newPromo = nextUse ? formData.promo_price : prev.promo_price
                                      
                                      const orig = parsePrice(prev.use_parent_price !== false ? formData.price : prev.price || "")
                                      const promo = parsePrice(newPromo || "")
                                      if (orig > 0 && promo > 0 && promo < orig) {
                                        const fixed = orig - promo
                                        const pct = (fixed / orig) * 100
                                        setVarDiscountFixed(fixed.toFixed(2))
                                        setVarDiscountPercent(pct.toFixed(1))
                                      } else {
                                        setVarDiscountPercent("")
                                        setVarDiscountFixed("")
                                      }

                                      return { 
                                        ...prev, 
                                        use_parent_promo_price: nextUse,
                                        promo_price: newPromo 
                                      }
                                    })
                                  }}
                                  className={`p-1.5 rounded-lg transition-all ${varFormState.use_parent_promo_price !== false ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                                  title={varFormState.use_parent_promo_price !== false ? "Desvincular Preço Promocional do Pai" : "Sincronizar Preço Promocional com o Pai"}
                                >
                                  {varFormState.use_parent_promo_price !== false ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                              {varFormState.use_parent_promo_price === false && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-in slide-in-from-top-1 duration-200">
                                  {/* Desconto (%) */}
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700">Desconto (%)</label>
                                    <div className="relative">
                                      <Input 
                                        type="number" 
                                        placeholder="0" 
                                        value={varDiscountPercent} 
                                        onChange={(e) => handleVarDiscountPercentChange(e.target.value)} 
                                        className="h-11 font-bold pr-8 text-xs" 
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">%</span>
                                    </div>
                                  </div>

                                  {/* Desconto (R$) */}
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700">Desconto (R$)</label>
                                    <div className="relative">
                                      <Input 
                                        type="number" 
                                        step="0.01" 
                                        placeholder="0,00" 
                                        value={varDiscountFixed} 
                                        onChange={(e) => handleVarDiscountFixedChange(e.target.value)} 
                                        className="h-11 font-bold pr-8 text-xs" 
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">R$</span>
                                    </div>
                                  </div>

                                  {/* Preço Promocional (R$) */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <label className="text-xs font-bold text-gray-700">Preço Promocional</label>
                                      {(varFormState.promo_price || varDiscountPercent || varDiscountFixed) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setVarFormState(prev => ({ ...prev, promo_price: "" }))
                                            setVarDiscountPercent("")
                                            setVarDiscountFixed("")
                                          }}
                                          className="text-[9px] font-bold text-red-500 hover:underline"
                                        >
                                          Limpar
                                        </button>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <Input 
                                        type="number" 
                                        step="0.01" 
                                        placeholder="Sem desconto" 
                                        value={varFormState.promo_price} 
                                        onChange={(e) => handleVarPromoPriceFieldChange(e.target.value)} 
                                        className="h-11 text-xs font-bold border-green-200 bg-green-50/10" 
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Etapa 3: Ficha Técnica */}
                        {varStep === 3 && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
                              <Info className="h-5 w-5" />
                              <span>Ficha Técnica da Variante</span>
                            </div>

                            {/* Medidas */}
                            <div className="space-y-2 border-b pb-3">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700">Medidas (cm)</label>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  onClick={() => setVarFormState(prev => ({ 
                                    ...prev, 
                                    use_parent_dimensions: !prev.use_parent_dimensions,
                                    width: !prev.use_parent_dimensions ? formData.width : prev.width, 
                                    depth: !prev.use_parent_dimensions ? formData.depth : prev.depth, 
                                    height: !prev.use_parent_dimensions ? formData.height : prev.height 
                                  }))}
                                  className={`p-1.5 rounded-lg transition-all ${varFormState.use_parent_dimensions !== false ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                                  title={varFormState.use_parent_dimensions !== false ? "Desvincular Medidas do Pai" : "Sincronizar Medidas com o Pai"}
                                >
                                  {varFormState.use_parent_dimensions !== false ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                              {varFormState.use_parent_dimensions === false && (
                                <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-1 duration-200">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-500">Largura</span>
                                    <Input 
                                      placeholder="L" 
                                      value={varFormState.width} 
                                      onChange={e => setVarFormState(prev => ({ ...prev, width: e.target.value }))}
                                      className="h-10 text-xs text-center" 
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-500">{formData.depth_use_length ? "Comprimento" : "Profundidade"}</span>
                                    <Input 
                                      placeholder={formData.depth_use_length ? "C" : "P"} 
                                      value={varFormState.depth} 
                                      onChange={e => setVarFormState(prev => ({ ...prev, depth: e.target.value }))}
                                      className="h-10 text-xs text-center" 
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-500">Altura</span>
                                    <Input 
                                      placeholder="A" 
                                      value={varFormState.height} 
                                      onChange={e => setVarFormState(prev => ({ ...prev, height: e.target.value }))}
                                      className="h-10 text-xs text-center" 
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Descrição */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700">Descrição</label>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  onClick={() => setVarFormState(prev => ({ 
                                    ...prev, 
                                    use_parent_description: !prev.use_parent_description,
                                    description: !prev.use_parent_description ? formData.description : prev.description 
                                  }))}
                                  className={`p-1.5 rounded-lg transition-all ${varFormState.use_parent_description !== false ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                                  title={varFormState.use_parent_description !== false ? "Desvincular Descrição do Pai" : "Sincronizar Descrição com o Pai"}
                                >
                                  {varFormState.use_parent_description !== false ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                              {varFormState.use_parent_description === false && (
                                <Textarea 
                                  placeholder="Descrição personalizada da variação" 
                                  value={varFormState.description} 
                                  onChange={e => setVarFormState(prev => ({ ...prev, description: e.target.value }))}
                                  rows={3} 
                                  className="text-xs resize-none animate-in slide-in-from-top-1 duration-200" 
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <DialogFooter className="p-4 md:p-6 bg-gray-50 border-t flex flex-row items-center justify-between gap-3 flex-shrink-0">
                        <div>
                          {varStep > 1 ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setVarStep(varStep - 1)}
                              className="h-10 px-4 font-bold border-2 hover:bg-white"
                            >
                              <ArrowLeft className="mr-1 h-4 w-4" />
                              Voltar
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setIsVarFormOpen(false)}
                              className="h-10 px-4 font-bold text-gray-500 hover:text-red-500 hover:bg-red-50"
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                        {varStep < 3 ? (
                          <Button
                            type="button"
                            onClick={() => setVarStep(varStep + 1)}
                            className="h-10 px-6 font-bold"
                          >
                            Próximo
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="submit"
                            className="h-10 px-6 font-bold bg-green-600 hover:bg-green-700"
                          >
                            Salvar Variação
                          </Button>
                        )}
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 md:p-8 bg-gray-50 border-t flex flex-row items-center justify-between gap-3 flex-shrink-0">
            <div>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="h-11 md:h-14 px-4 md:px-8 font-bold border-2 hover:bg-white transition-all"
                >
                  <ArrowLeft className="mr-1 md:mr-2 h-5 w-5" />
                  Voltar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="h-11 md:h-14 px-4 md:px-8 font-bold text-gray-500 hover:text-red-500 hover:bg-red-50/50 transition-all rounded-xl border border-dashed border-gray-300 hover:border-red-200"
                >
                  Cancelar
                </Button>
              )}
            </div>
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                className="h-11 md:h-14 px-6 md:px-10 font-black text-base md:text-lg shadow-xl shadow-primary/20 rounded-xl md:rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Próximo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinish}
                disabled={isSaving || isAutoSaving}
                className="h-11 md:h-14 px-6 md:px-10 font-black text-base md:text-lg shadow-xl shadow-primary/20 rounded-xl md:rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] bg-green-600 hover:bg-green-700"
              >
                {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Finalizar"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
      {/* Modal de Opções de Foto (Celular/Desktop) */}
      <Dialog open={activeImageIndex !== null} onOpenChange={(open) => { if (!open) setActiveImageIndex(null) }}>
        <DialogContent className="sm:max-w-[360px] p-6 rounded-[24px] bg-white border border-gray-150">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Opções da Foto</DialogTitle>
            <DialogDescription className="text-xs">
              Escolha uma das ações abaixo para gerenciar esta foto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            {activeImageIndex !== null && formData.images[activeImageIndex] && (
              <div className="relative h-40 w-full rounded-2xl overflow-hidden border mx-auto">
                <Image src={formData.images[activeImageIndex]} alt="Foto selecionada" fill className="object-contain bg-gray-50" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="flex items-center justify-center gap-2 bg-blue-500 text-white h-11 px-4 rounded-xl cursor-pointer hover:bg-blue-600 font-semibold text-sm transition-colors">
                <Camera className="h-4 w-4" />
                Alterar
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (activeImageIndex !== null) {
                      handleReplaceImage(e, activeImageIndex)
                      setActiveImageIndex(null)
                    }
                  }} 
                />
              </label>
              <Button 
                type="button" 
                variant="destructive" 
                className="h-11 rounded-xl font-semibold gap-2"
                onClick={() => {
                  if (activeImageIndex !== null) {
                    removeImage(activeImageIndex)
                    setActiveImageIndex(null)
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </Button>
            </div>

            {activeImageIndex !== null && activeImageIndex !== 0 && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-11 rounded-xl font-semibold gap-2 border-primary text-primary hover:bg-primary/5"
                onClick={() => {
                  if (activeImageIndex !== null) {
                    setMainImage(activeImageIndex)
                    setActiveImageIndex(null)
                  }
                }}
              >
                Definir como Capa
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Rápido de Gerenciamento de Atributos e Valores Globais (CRUD) */}
      <Dialog open={isFastCreateOpen} onOpenChange={setIsFastCreateOpen}>
        <DialogContent className="sm:max-w-4xl lg:max-w-6xl w-[95vw] rounded-[24px] p-6 bg-white border border-gray-150 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerenciar Atributos Globais
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Gerencie as propriedades (ex: Cor, Voltagem) utilizadas na grade de variações.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto pr-1 py-4 flex-1">
            {/* Formulário de Criação (Igual à esquerda de attributes/page.tsx) */}
            <Card className="lg:col-span-1 rounded-2xl shadow-sm border h-fit">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {editingAttrId ? "Editar Atributo" : "Novo Atributo"}
                </CardTitle>
                <CardDescription className="text-xs">Cadastre propriedades reutilizáveis.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Nome do Atributo</label>
                    <Input
                      placeholder="Ex: Cor, Tamanho, Voltagem"
                      value={fastAttrName}
                      onChange={e => setFastAttrName(e.target.value)}
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Valores (Enter ou Vírgula)</label>
                    <div className="min-h-12 flex flex-wrap gap-1.5 p-2 bg-white border rounded-xl items-center focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                      {fastAttrValues.map((val, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary"
                          className="h-7 bg-primary/10 text-primary font-bold text-xs gap-1 py-0 px-2 rounded-lg border border-primary/20"
                        >
                          {val}
                          <button 
                            type="button" 
                            onClick={() => setFastAttrValues(prev => prev.filter((_, i) => i !== idx))}
                            className="text-primary hover:text-red-500 rounded-full transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <input
                        type="text"
                        placeholder={fastAttrValues.length === 0 ? "Ex: Azul, Preto..." : ""}
                        value={fastAttrValInput}
                        onChange={e => setFastAttrValInput(e.target.value)}
                        onKeyDown={handleKeyDownFastAttrVal}
                        className="flex-1 min-w-[100px] bg-transparent outline-none border-none text-sm p-1"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {editingAttrId && (
                      <Button type="button" variant="ghost" onClick={handleCancelEditDbAttribute} className="flex-1 rounded-xl h-10">
                        Cancelar
                      </Button>
                    )}
                    <Button type="button" onClick={handleFastSaveAttribute} className="flex-1 font-bold h-10 rounded-xl">
                      {editingAttrId ? "Salvar" : "Criar Atributo"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Atributos (Igual à direita de attributes/page.tsx) */}
            <div className="lg:col-span-2 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {dbAttributes.length === 0 ? (
                <div className="bg-white rounded-2xl border p-12 text-center shadow-sm italic text-muted-foreground">
                  Nenhum atributo cadastrado ainda.
                </div>
              ) : (
                dbAttributes.map(attr => {
                  const attrVals = dbAttributeValues.filter(v => v.attribute_id === attr.id)
                  return (
                    <Card key={attr.id} className="rounded-2xl shadow-sm border">
                      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                        <div>
                          <CardTitle className="text-base font-bold text-gray-800">{attr.name}</CardTitle>
                          <CardDescription className="text-xs">Valores vinculados a este atributo.</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleStartEditDbAttribute(attr.id, attr.name)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                            title="Editar Atributo"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteDbAttribute(attr.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                            title="Excluir Atributo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {attrVals.map(val => (
                            <Badge 
                              key={val.id} 
                              variant="outline"
                              className="py-1 px-3 gap-1.5 font-semibold text-xs border bg-gray-50 text-gray-700 rounded-full group"
                            >
                              {val.value}
                              <button 
                                type="button" 
                                onClick={() => handleDeleteDbAttributeValue(val.id)}
                                className="text-gray-400 hover:text-red-500 rounded-full transition-colors"
                                title="Remover este valor"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>

                        {/* Formulário rápido para adicionar valor avulso */}
                        <div className="flex gap-2 max-w-sm pt-2">
                          <Input 
                            placeholder="Adicionar novo valor..." 
                            id={`modal-input-val-${attr.id}`}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                const inputEl = e.currentTarget
                                await handleAddDbAttributeValueToExisting(attr.id, inputEl.value)
                                inputEl.value = ""
                              }
                            }}
                            className="h-9 text-xs" 
                          />
                          <Button 
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const inputEl = document.getElementById(`modal-input-val-${attr.id}`) as HTMLInputElement
                              if (inputEl) {
                                await handleAddDbAttributeValueToExisting(attr.id, inputEl.value)
                                inputEl.value = ""
                              }
                            }}
                            className="font-bold text-xs h-9 px-3"
                          >
                            Adicionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4 flex justify-end">
            <Button type="button" onClick={() => setIsFastCreateOpen(false)} className="rounded-xl">
              Fechar Gerenciador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <CategoriesManagerModal 
        isOpen={isCategoriesManagerOpen} 
        onOpenChange={setIsCategoriesManagerOpen} 
        onSuccess={fetchCategories} 
      />
    </Dialog>
  )
}
