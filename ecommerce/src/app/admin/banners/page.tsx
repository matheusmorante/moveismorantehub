"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Loader2, Image as ImageIcon, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { uploadToR2 } from "@/lib/utils/upload-r2"

export default function BannersAdminPage() {
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [currentBanner, setCurrentBanner] = useState<any>(null)
  const [formData, setFormData] = useState({ title: "", image_url: "", link_url: "", active: true })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase.from("banners").select("*").order("created_at", { ascending: false })
    if (error) toast.error("Erro ao carregar banners")
    else setBanners(data || [])
    setLoading(false)
  }

  const openDialog = (banner: any = null) => {
    setCurrentBanner(banner)
    setFormData(banner
      ? { title: banner.title || "", image_url: banner.image_url, link_url: banner.link_url || "", active: banner.active }
      : { title: "", image_url: "", link_url: "", active: true }
    )
    setIsDialogOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const fileName = `banner-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`
      const publicUrl = await uploadToR2(file, fileName)
      setFormData(prev => ({ ...prev, image_url: publicUrl }))
      toast.success("Imagem enviada!")
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.image_url) { toast.error("Selecione uma imagem!"); return }
    setIsSaving(true)
    try {
      const payload = { title: formData.title, image_url: formData.image_url, link_url: formData.link_url, active: formData.active }
      if (currentBanner) {
        const { error } = await supabase.from("banners").update(payload).eq("id", currentBanner.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("banners").insert([payload])
        if (error) throw error
      }
      toast.success("Banner salvo!")
      setIsDialogOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este banner?")) return
    const { error } = await supabase.from("banners").delete().eq("id", id)
    if (error) toast.error(error.message)
    else { toast.success("Banner excluído!"); fetchData() }
  }

  const toggleActive = async (banner: any) => {
    const { error } = await supabase.from("banners").update({ active: !banner.active }).eq("id", banner.id)
    if (error) toast.error(error.message)
    else { toast.success(banner.active ? "Banner desativado!" : "Banner ativado!"); fetchData() }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border shadow-sm gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Banners</h1>
          <p className="text-sm text-muted-foreground">Gerencie os banners do carrossel da página inicial.</p>
        </div>
        <Button onClick={() => openDialog()} className="w-full md:w-auto gap-2 font-bold">
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
            {loading ? (
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
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(banner)} className="h-8 w-8 text-amber-600 hover:bg-amber-50">
                      {banner.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDialog(banner)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)} className="h-8 w-8 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{currentBanner ? "Editar Banner" : "Novo Banner"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Imagem do Banner*</label>
                <label className="flex flex-col items-center justify-center h-36 w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all relative overflow-hidden">
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  {formData.image_url ? (
                    <Image src={formData.image_url} alt="Preview" fill className="object-cover rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm">Clique para enviar imagem</span>
                    </div>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Título (opcional)</label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Mega Queima de Estoque" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Link de Destino (opcional)</label>
                <Input value={formData.link_url} onChange={e => setFormData({ ...formData, link_url: e.target.value })} placeholder="https://..." />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${formData.active ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.active ? "left-7" : "left-1"}`} />
                </button>
                <span className="text-sm font-medium">{formData.active ? "Banner ativo (aparece no site)" : "Banner inativo (oculto)"}</span>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving || isUploading}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Banner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
