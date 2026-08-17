"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Loader2, LayoutGrid, ListTree } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface CategoriesManagerModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CategoriesManagerModal({ isOpen, onOpenChange, onSuccess }: CategoriesManagerModalProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isEditingDialogOpen, setIsEditingDialogOpen] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<any>(null)
  const [formData, setFormData] = useState({ name: "", slug: "", type: "category", linkedIds: [] as string[] })
  const [isAutoSlug, setIsAutoSlug] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^\w\s-]/g, "")       // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, "-")           // Espaços para -
      .replace(/-+/g, "-")            // Remove duplicados de -
  }

  async function fetchData() {
    setLoading(true)
    const [catRes, relRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("category_relationships").select("*")
    ])

    if (catRes.error || relRes.error) {
      toast.error("Erro ao carregar dados")
    } else {
      setCategories(catRes.data || [])
      setRelationships(relRes.data || [])
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let itemId = currentCategory?.id
      const itemData = { name: formData.name, slug: formData.slug, type: formData.type }

      if (currentCategory) {
        const { error } = await supabase.from("categories").update(itemData).eq("id", currentCategory.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("categories").insert([itemData]).select()
        if (error) throw error
        itemId = data[0].id
      }

      // Atualizar Relacionamentos Bilaterais
      if (formData.type === "category") {
        await supabase.from("category_relationships").delete().eq("child_id", itemId)
        if (formData.linkedIds.length > 0) {
          const newRels = formData.linkedIds.map(pId => ({ parent_id: pId, child_id: itemId }))
          await supabase.from("category_relationships").insert(newRels)
        }
      } else {
        await supabase.from("category_relationships").delete().eq("parent_id", itemId)
        if (formData.linkedIds.length > 0) {
          const newRels = formData.linkedIds.map(cId => ({ parent_id: itemId, child_id: cId }))
          await supabase.from("category_relationships").insert(newRels)
        }
      }

      setIsEditingDialogOpen(false)
      fetchData()
      if (onSuccess) onSuccess()
      toast.success("Salvo com sucesso!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este item?")) return
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id)
      if (error) throw error
      toast.success("Excluído!")
      fetchData()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message)
    }
  }

  const openEditDialog = (category: any = null, defaultType: string = "category") => {
    setCurrentCategory(category)
    const type = category?.type || defaultType
    setIsAutoSlug(!category) // Auto slug ativo apenas para novos por padrão
    
    const linkedIds = category 
      ? relationships
          .filter(r => type === "category" ? r.child_id === category.id : r.parent_id === category.id)
          .map(r => type === "category" ? r.parent_id : r.child_id)
      : []
    
    setFormData({
      name: category?.name || "",
      slug: category?.slug || "",
      type: type,
      linkedIds: linkedIds
    })
    setIsEditingDialogOpen(true)
  }

  const handleNameChange = (name: string) => {
    const newSlug = isAutoSlug ? generateSlug(name) : formData.slug
    setFormData({ ...formData, name, slug: newSlug })
  }

  const environments = categories.filter(c => c.type === "environment")
  const productCategories = categories.filter(c => c.type === "category")

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] md:w-full max-h-[90vh] md:max-h-[85vh] p-4 sm:p-6 md:p-8 overflow-y-auto rounded-2xl md:rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">Gerenciar Ambientes e Categorias</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Adicione, edite ou exclua os ambientes e categorias da loja. Suas alterações refletirão na seleção de categorias do produto imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AMBIENTES */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-gray-700">
                  <LayoutGrid className="h-4.5 w-4.5 text-primary" />
                  Ambientes
                </h3>
                <Button size="sm" onClick={() => openEditDialog(null, "environment")} className="h-8 text-xs font-bold gap-1">
                  <Plus className="h-3.5 w-3.5" /> Novo Ambiente
                </Button>
              </div>
              <CategoryListTable 
                data={environments} 
                onEdit={(c: any) => openEditDialog(c)} 
                onDelete={handleDelete} 
                loading={loading} 
                categories={categories} 
                relationships={relationships} 
                isEnv 
              />
            </div>

            {/* CATEGORIAS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-gray-700">
                  <ListTree className="h-4.5 w-4.5 text-primary" />
                  Categorias
                </h3>
                <Button size="sm" onClick={() => openEditDialog(null, "category")} className="h-8 text-xs font-bold gap-1">
                  <Plus className="h-3.5 w-3.5" /> Nova Categoria
                </Button>
              </div>
              <CategoryListTable 
                data={productCategories} 
                onEdit={(c: any) => openEditDialog(c)} 
                onDelete={handleDelete} 
                loading={loading} 
                categories={categories} 
                relationships={relationships} 
              />
            </div>
          </div>
        </div>

        {/* MODAL DE CRIAÇÃO/EDIÇÃO DETALHADA */}
        <Dialog open={isEditingDialogOpen} onOpenChange={setIsEditingDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl z-[100]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">{currentCategory ? "Editar Item" : "Novo Item"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Tipo</label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val, linkedIds: [] })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="environment">Ambiente</SelectItem>
                      <SelectItem value="category">Categoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    {formData.type === "category" ? "Vincular a Ambientes" : "Vincular a Categorias"}
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border max-h-36 overflow-y-auto">
                    {(formData.type === "category" ? environments : productCategories).map(item => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`modal-link-${item.id}`}
                          checked={formData.linkedIds.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setFormData({ ...formData, linkedIds: [...formData.linkedIds, item.id] })
                            else setFormData({ ...formData, linkedIds: formData.linkedIds.filter(id => id !== item.id) })
                          }}
                        />
                        <label htmlFor={`modal-link-${item.id}`} className="text-xs font-medium leading-none cursor-pointer capitalize">{item.name}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Nome</label>
                  <Input value={formData.name} onChange={(e) => handleNameChange(e.target.value)} className="h-10" required />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-700">Slug (URL)</label>
                    <button 
                      type="button" 
                      onClick={() => setIsAutoSlug(!isAutoSlug)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-0.5 ${
                        isAutoSlug ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}
                    >
                      {isAutoSlug ? "Automático" : "Manual"}
                    </button>
                  </div>
                  <Input 
                    value={formData.slug} 
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/ /g, "-") })} 
                    className="h-10 bg-gray-50/50" 
                    required 
                    readOnly={isAutoSlug}
                  />
                </div>
              </div>
              <DialogFooter className="gap-1.5 pt-2">
                <DialogClose asChild><Button type="button" variant="ghost" size="sm">Cancelar</Button></DialogClose>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

function CategoryListTable({ data, onEdit, onDelete, loading, categories, relationships, isEnv }: any) {
  if (loading) return <div className="p-6 text-center bg-white rounded-xl border"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
  if (data.length === 0) return <div className="p-6 text-center bg-white rounded-xl border text-muted-foreground text-xs italic">Nenhum item cadastrado.</div>

  return (
    <div className="bg-white rounded-xl border overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
      <Table>
        <TableHeader className="bg-gray-50 sticky top-0 z-10">
          <TableRow>
            <TableHead className="font-bold text-xs py-2">Nome</TableHead>
            <TableHead className="font-bold text-xs py-2">{isEnv ? "Filhos" : "Ambientes"}</TableHead>
            <TableHead className="font-bold text-xs py-2 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item: any) => {
            const rels = isEnv 
              ? relationships.filter((r: any) => r.parent_id === item.id)
              : relationships.filter((r: any) => r.child_id === item.id)
            
            const relatedNames = rels.map((r: any) => {
              const target = categories.find((c: any) => c.id === (isEnv ? r.child_id : r.parent_id))
              return target?.name
            }).filter(Boolean)

            return (
              <TableRow key={item.id} className="hover:bg-gray-50/50">
                <TableCell className="font-medium text-gray-700 capitalize text-xs py-2">{item.name}</TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-0.5">
                    {relatedNames.length > 0 ? (
                      relatedNames.map((name: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[9px] bg-primary/5 text-primary border-none capitalize py-0 px-1">{name}</Badge>
                      ))
                    ) : (
                      <span className="text-[9px] text-muted-foreground italic">Nenhum</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right py-1.5 space-x-0.5">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-7 w-7 text-blue-600"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="h-7 w-7 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
