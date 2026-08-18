"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Loader2, Pencil, Zap, Power, PowerOff } from "lucide-react"
import { toast } from "sonner"
import { Database } from "@/types/database"

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

const generateSlug = (text: string) =>
  text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    fetchOpportunities()
  }, [])

  async function fetchOpportunities() {
    setLoading(true)
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      toast.error("Erro ao carregar oportunidades")
      console.error(error)
    }
    setOpportunities(data || [])
    setLoading(false)
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

  async function handleSave() {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error("Nome e slug são obrigatórios")
      return
    }

    setSaving(true)
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
      setSaving(false)
    }
  }

  async function handleToggleActive(opp: Opportunity) {
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

  async function handleDelete(id: string) {
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
            <Zap className="h-6 w-6 text-amber-500" /> Customização de Estilos & Oportunidades
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize as bordas dos cards, cores, estilos e animações das badges das oportunidades da loja.
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 font-bold">
          <Plus className="h-4 w-4" /> Nova Oportunidade
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : opportunities.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <Zap className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-bold text-lg">Nenhuma oportunidade cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">Crie sua primeira oportunidade para começar.</p>
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
                      <Pencil className="h-3.5 w-3.5" /> Estilizar / Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`gap-1.5 text-xs ${opp.active ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                      onClick={() => handleToggleActive(opp)}
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

      {/* Modal de Criar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              {editingId ? "Personalizar Estilos & Oportunidade" : "Nova Oportunidade"}
            </DialogTitle>
            <DialogDescription>
              Ajuste as cores da borda, estilo de linha e a animação do badge em tempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome */}
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

            {/* Slug */}
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

            {/* Cores */}
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

            {/* Configuração avançada de estilo */}
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

            {/* Preview do Card */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-gray-700">Prévia em Tempo Real do Card do Produto</label>
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
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar Customizações" : "Criar Oportunidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir Oportunidade</DialogTitle>
            <DialogDescription>
              Tem certeza? Os produtos vinculados a esta oportunidade perderão a marcação.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" /> Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
