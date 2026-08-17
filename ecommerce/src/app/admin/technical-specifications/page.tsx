"use client"

import { useEffect, useState } from "react"
import { ListChecks, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Database } from "@/types/database"

type TechnicalSpecification = Database["public"]["Tables"]["technical_specifications"]["Row"]
type InputType = TechnicalSpecification["input_type"]

const inputTypeLabels: Record<InputType, string> = { materials: "Lista de materiais", text: "Texto padrão" }
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")

export default function TechnicalSpecificationsPage() {
  const [items, setItems] = useState<TechnicalSpecification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TechnicalSpecification | null>(null)
  const [formData, setFormData] = useState({ name: "", slug: "", input_type: "text" as InputType, options: [] as string[] })
  const [optionInput, setOptionInput] = useState("")

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase.from("technical_specifications").select("*").order("name")
    if (error) toast.error("Erro ao carregar especificações")
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  function openDialog(item: TechnicalSpecification | null = null) {
    setEditingItem(item)
    setFormData(item ? { name: item.name, slug: item.slug, input_type: item.input_type, options: Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string") : [] } : { name: "", slug: "", input_type: "text", options: [] })
    setOptionInput("")
    setIsDialogOpen(true)
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!formData.name.trim() || !formData.slug.trim()) return toast.error("Nome e identificador são obrigatórios")
    setSaving(true)
    try {
      const payload = { ...formData, name: formData.name.trim(), slug: slugify(formData.slug), options: formData.input_type === "text" ? formData.options : [] }
      const { error } = editingItem
        ? await supabase.from("technical_specifications").update(payload).eq("id", editingItem.id)
        : await supabase.from("technical_specifications").insert([payload])
      if (error) throw error
      toast.success(editingItem ? "Especificação atualizada" : "Especificação cadastrada")
      setIsDialogOpen(false)
      fetchItems()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar especificação")
    } finally { setSaving(false) }
  }

  function addOption() {
    const option = optionInput.trim()
    if (!option || formData.options.includes(option)) return setOptionInput("")
    setFormData({ ...formData, options: [...formData.options, option] })
    setOptionInput("")
  }

  async function handleDelete(item: TechnicalSpecification) {
    if (!confirm(`Excluir a especificação “${item.name}”?`)) return
    const { error } = await supabase.from("technical_specifications").delete().eq("id", item.id)
    if (error) return toast.error("Não foi possível excluir a especificação")
    toast.success("Especificação excluída")
    fetchItems()
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between rounded-2xl border bg-white p-6 shadow-sm">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800"><ListChecks className="h-6 w-6 text-primary" />Especificações técnicas</h1><p className="mt-1 text-sm text-muted-foreground">Defina os campos opcionais usados na ficha dos produtos.</p></div>
      <Button onClick={() => openDialog()} className="gap-2 font-bold"><Plus className="h-4 w-4" />Nova especificação</Button>
    </div>
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : items.length === 0 ? <Card className="border-dashed border-2"><CardContent className="py-16 text-center text-muted-foreground">Nenhuma especificação cadastrada.</CardContent></Card> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <Card key={item.id} className="border-none shadow-sm"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-bold text-gray-800">{item.name}</p><p className="text-xs text-muted-foreground">{inputTypeLabels[item.input_type]}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => openDialog(item)}><Pencil className="h-4 w-4" /><span className="sr-only">Editar</span></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(item)}><Trash2 className="h-4 w-4" /><span className="sr-only">Excluir</span></Button></div></CardContent></Card>)}</div>}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent className="sm:max-w-md"><form onSubmit={handleSave}><DialogHeader><DialogTitle>{editingItem ? "Editar especificação" : "Nova especificação"}</DialogTitle></DialogHeader><div className="space-y-4 py-5"><div className="space-y-2"><label className="text-sm font-bold">Nome</label><Input value={formData.name} placeholder="Ex.: Tipo de madeira" onChange={(event) => setFormData({ ...formData, name: event.target.value, slug: editingItem ? formData.slug : slugify(event.target.value) })} /></div><div className="space-y-2"><label className="text-sm font-bold">Identificador</label><Input value={formData.slug} placeholder="tipo-de-madeira" onChange={(event) => setFormData({ ...formData, slug: event.target.value })} /></div><div className="space-y-2"><label className="text-sm font-bold">Tipo de preenchimento</label><Select value={formData.input_type} onValueChange={(value: InputType) => setFormData({ ...formData, input_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="materials">Lista de materiais</SelectItem><SelectItem value="text">Texto padrão</SelectItem></SelectContent></Select></div>{formData.input_type === "text" && <div className="space-y-2"><label className="text-sm font-bold">Opções padrão</label><Input value={optionInput} placeholder="Digite uma opção e pressione Enter" onChange={(event) => setOptionInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addOption() } }} /><div className="flex flex-wrap gap-2">{formData.options.map((option) => <button key={option} type="button" onClick={() => setFormData({ ...formData, options: formData.options.filter((item) => item !== option) })} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-red-50 hover:text-red-600">{option} ×</button>)}</div></div>}</div><DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter></form></DialogContent></Dialog>
  </div>
}
