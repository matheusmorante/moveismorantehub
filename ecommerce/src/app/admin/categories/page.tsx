"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Loader2, LayoutGrid, Upload, Download } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<any>(null)
  const [formData, setFormData] = useState({ name: "", slug: "", type: "category", linkedIds: [] as string[] })
  const [isAutoSlug, setIsAutoSlug] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const lowercaseWords = new Set(['de', 'da', 'do', 'dos', 'das', 'para', 'com', 'e', 'em', 'a', 'o', 'as', 'os', 'por', 'sem', 'ou'])

  const toTitleCase = (str: string) => {
    if (!str) return str
    return str
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .map((word, index) => {
        if (!word) return ''
        if (index === 0 || !lowercaseWords.has(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1)
        }
        return word
      })
      .join(' ')
  }

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

  useEffect(() => {
    fetchData()
  }, [])

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

  const handleExportCSV = () => {
    try {
      let csvContent = "Ambiente,Categoria\n"
      const rows: string[] = []

      const envs = categories.filter(c => c.type === "environment")
      const subCats = categories.filter(c => c.type === "category")

      envs.forEach(env => {
        const linkedCats = subCats.filter(cat => 
          relationships.some(r => r.parent_id === env.id && r.child_id === cat.id)
        )

        if (linkedCats.length > 0) {
          linkedCats.forEach(cat => {
            rows.push(`"${env.name.replace(/"/g, '""')}","${cat.name.replace(/"/g, '""')}"`)
          })
        } else {
          rows.push(`"${env.name.replace(/"/g, '""')}",`)
        }
      })

      subCats.forEach(cat => {
        const hasEnv = relationships.some(r => r.child_id === cat.id)
        if (!hasEnv) {
          rows.push(`,"${cat.name.replace(/"/g, '""')}"`)
        }
      })

      csvContent += rows.join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `ambientes_e_categorias_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("CSV exportado com sucesso!")
    } catch (error: any) {
      toast.error("Erro ao exportar CSV: " + error.message)
    }
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      if (!text) return

      try {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        let startIndex = 0
        if (lines.length > 0 && (lines[0].toLowerCase().includes("ambiente") || lines[0].toLowerCase().includes("categoria") || lines[0].toLowerCase().includes("pai") || lines[0].toLowerCase().includes("filho"))) {
          startIndex = 1
        }

        const { data: existingCats } = await supabase.from('categories').select('*')
        const catsMap = new Map<string, { id: string, type: string }>()
        existingCats?.forEach(c => catsMap.set(c.name.trim().toUpperCase(), { id: c.id, type: c.type || 'category' }))

        let createdCatsCount = 0
        let createdRelsCount = 0

        for (let i = startIndex; i < lines.length; i++) {
          const row = lines[i]
          let parts: string[] = []
          if (row.includes('"')) {
            const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
            parts = matches ? matches.map(m => m.replace(/"/g, '').trim()) : row.split(',').map(p => p.trim())
          } else {
            parts = row.split(',').map(p => p.trim())
          }

          if (parts.length > 0) {
            const parentName = parts[0] ? parts[0].trim().toUpperCase() : ""
            const childName = parts[1] ? parts[1].trim().toUpperCase() : ""

            let parentId = ""
            let childId = ""

            if (parentName) {
              if (catsMap.has(parentName)) {
                parentId = catsMap.get(parentName)!.id
              } else {
                const { data: newParent, error: errP } = await supabase.from('categories').insert([{
                  name: parentName,
                  type: 'environment',
                  slug: generateSlug(parentName)
                }]).select()
                if (errP) throw errP
                parentId = newParent[0].id
                catsMap.set(parentName, { id: parentId, type: 'environment' })
                createdCatsCount++
              }
            }

            if (childName) {
              if (catsMap.has(childName)) {
                childId = catsMap.get(childName)!.id
              } else {
                const { data: newChild, error: errC } = await supabase.from('categories').insert([{
                  name: childName,
                  type: 'category',
                  slug: generateSlug(childName)
                }]).select()
                if (errC) throw errC
                childId = newChild[0].id
                catsMap.set(childName, { id: childId, type: 'category' })
                createdCatsCount++
              }
            }

            if (parentId && childId) {
              const { data: existingRel } = await supabase.from('category_relationships')
                .select('*')
                .eq('parent_id', parentId)
                .eq('child_id', childId)

              if (!existingRel || existingRel.length === 0) {
                const { error: errRel } = await supabase.from('category_relationships').insert([{
                  parent_id: parentId,
                  child_id: childId
                }])
                if (errRel) throw errRel
                createdRelsCount++
              }
            }
          }
        }

        toast.success(`Importação concluída! ${createdCatsCount} itens criados e ${createdRelsCount} relacionamentos vinculados.`)
        fetchData()
      } catch (err: any) {
        toast.error("Erro ao importar CSV: " + err.message)
      }
    }
    reader.readAsText(file)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let itemId = currentCategory?.id
      const formattedName = toTitleCase(formData.name)
      const itemData = { name: formattedName, slug: formData.slug || generateSlug(formattedName), type: formData.type }

      if (currentCategory) {
        const { error } = await supabase.from("categories").update(itemData).eq("id", currentCategory.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("categories").insert([itemData]).select()
        if (error) throw error
        itemId = data[0].id
      }

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

      setIsDialogOpen(false)
      fetchData()
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
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message)
    }
  }

  const openDialog = (category: any = null, defaultType: string = "category", defaultLinkedId?: string) => {
    setCurrentCategory(category)
    const type = category?.type || defaultType
    setIsAutoSlug(!category)
    
    let linkedIds: string[] = []
    if (category) {
      linkedIds = relationships
        .filter(r => type === "category" ? r.child_id === category.id : r.parent_id === category.id)
        .map(r => type === "category" ? r.parent_id : r.child_id)
    } else if (defaultLinkedId) {
      linkedIds = [defaultLinkedId]
    }

    setFormData({
      name: category?.name || "",
      slug: category?.slug || "",
      type: type,
      linkedIds: linkedIds
    })
    setIsDialogOpen(true)
  }

  const handleNameChange = (name: string) => {
    const newSlug = isAutoSlug ? generateSlug(name) : formData.slug
    setFormData({ ...formData, name, slug: newSlug })
  }

  const environments = categories.filter(c => c.type === "environment")
  const productCategories = categories.filter(c => c.type === "category")

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto w-full">
      {/* Header limpo e direto sem abas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            Ambientes e Categorias
          </h1>
          <p className="text-sm text-muted-foreground">Estrutura unificada de organização de produtos</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={() => openDialog(null, "environment")} className="gap-2 font-bold shadow-sm rounded-xl">
            <Plus className="h-4 w-4" /> Novo Ambiente
          </Button>
        </div>
      </div>

      {/* Tabela Unificada */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
        ) : environments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum ambiente cadastrado.</div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="font-bold">Nome do Ambiente</TableHead>
                <TableHead className="font-bold">Categorias</TableHead>
                <TableHead className="font-bold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {environments.map((env: any) => {
                const rels = relationships.filter((r: any) => r.parent_id === env.id)
                const children = rels.map((r: any) => categories.find((c: any) => c.id === r.child_id)).filter(Boolean)

                return (
                  <TableRow key={env.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-bold text-gray-800 capitalize">{env.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {children.map((cat: any) => (
                          <Badge key={cat.id} variant="secondary" className="text-[11px] bg-slate-100 text-slate-700 hover:bg-slate-200 border-none capitalize flex items-center gap-1 py-1 px-2.5 rounded-lg">
                            {cat.name}
                            <button onClick={() => openDialog(cat, "category")} className="text-slate-400 hover:text-blue-600 ml-0.5" title="Editar categoria">
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                        <button
                          onClick={() => openDialog(null, "category", env.id)}
                          className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          title="Adicionar nova categoria neste ambiente"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(env, "environment")} className="h-8 w-8 text-blue-600"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(env.id)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader><DialogTitle>{currentCategory ? `Editar ${formData.type === "environment" ? "Ambiente" : "Categoria"}` : `Novo ${formData.type === "environment" ? "Ambiente" : "Categoria"}`}</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tipo</label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val, linkedIds: [] })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="environment">Ambiente</SelectItem>
                    <SelectItem value="category">Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 block">
                  {formData.type === "category" ? "Vincular a Ambientes" : "Vincular a Categorias"}
                </label>
                <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border max-h-48 overflow-y-auto">
                  {(formData.type === "category" ? environments : productCategories).map(item => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`link-${item.id}`}
                        checked={formData.linkedIds.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setFormData({ ...formData, linkedIds: [...formData.linkedIds, item.id] })
                          else setFormData({ ...formData, linkedIds: formData.linkedIds.filter(id => id !== item.id) })
                        }}
                      />
                      <label htmlFor={`link-${item.id}`} className="text-sm font-medium leading-none cursor-pointer capitalize">{item.name}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome</label>
                <Input value={formData.name} onChange={(e) => handleNameChange(e.target.value)} className="h-11" required />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-700">Slug (URL)</label>
                  <button 
                    type="button" 
                    onClick={() => setIsAutoSlug(!isAutoSlug)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${
                      isAutoSlug ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {isAutoSlug ? "Automático Ativo" : "Manual"}
                  </button>
                </div>
                <Input 
                  value={formData.slug} 
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/ /g, "-") })} 
                  className="h-11 bg-gray-50/50" 
                  required 
                  readOnly={isAutoSlug}
                />
                {isAutoSlug && <p className="text-[10px] text-muted-foreground">Desative o automático para editar manualmente.</p>}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
