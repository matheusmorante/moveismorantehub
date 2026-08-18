"use client"

import { useEffect, useState } from "react"
import { Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Database } from "@/types/database"

type Material = Database["public"]["Tables"]["materials"]["Row"]

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [name, setName] = useState("")

  async function fetchMaterials() {
    setLoading(true)
    const { data, error } = await supabase.from("materials").select("*").order("name")
    if (error) toast.error("Erro ao carregar materiais")
    setMaterials(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMaterials() }, [])

  function openDialog(material: Material | null = null) {
    setEditingMaterial(material)
    setName(material?.name || "")
    setIsDialogOpen(true)
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return toast.error("Informe o nome do material")
    setSaving(true)
    try {
      const payload = { name: name.trim() }
      const { error } = editingMaterial
        ? await supabase.from("materials").update(payload).eq("id", editingMaterial.id)
        : await supabase.from("materials").insert([payload])
      if (error) {
        if (error.code === "PGRST205") throw new Error("A tabela de materiais ainda não foi criada. Aplique as migrações do banco de dados.")
        throw error
      }
      toast.success(editingMaterial ? "Material atualizado" : "Material cadastrado")
      setIsDialogOpen(false)
      fetchMaterials()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar material")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(material: Material) {
    if (!confirm(`Excluir o material “${material.name}”?`)) return
    const { error } = await supabase.from("materials").delete().eq("id", material.id)
    if (error) return toast.error("Não foi possível excluir o material")
    toast.success("Material excluído")
    fetchMaterials()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800"><Layers className="h-6 w-6 text-primary" />Materiais</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cadastre os materiais disponíveis para os produtos.</p>
        </div>
        <Button onClick={() => openDialog()} className="gap-2 font-bold"><Plus className="h-4 w-4" />Novo material</Button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : materials.length === 0 ? (
        <Card className="border-dashed border-2"><CardContent className="py-16 text-center text-muted-foreground">Nenhum material cadastrado.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) => (
            <Card key={material.id} className="border-none shadow-sm"><CardContent className="flex items-center justify-between gap-3 p-4">
              <span className="font-bold text-gray-800">{material.name}</span>
              <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => openDialog(material)}><Pencil className="h-4 w-4" /><span className="sr-only">Editar</span></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(material)}><Trash2 className="h-4 w-4" /><span className="sr-only">Excluir</span></Button></div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader><DialogTitle>{editingMaterial ? "Editar material" : "Novo material"}</DialogTitle></DialogHeader>
            <div className="py-5"><Input autoFocus placeholder="Ex.: Madeira maciça" value={name} onChange={(event) => setName(event.target.value)} /></div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
