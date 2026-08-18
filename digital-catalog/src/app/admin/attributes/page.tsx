"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2, X, Layers, Sparkles, Download } from "lucide-react"
import { toast } from "sonner"

interface Attribute {
  id: string
  name: string
  values?: { id: string; value: string }[]
}

const capitalize = (str: string): string => {
  if (!str) return ""
  const trimmed = str.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export default function AttributesAdminPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loading, setLoading] = useState(true)

  // Criar novo atributo
  const [newAttrName, setNewAttrName] = useState("")
  const [tempValues, setTempValues] = useState<string[]>([])
  const [currentValInput, setCurrentValInput] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleExportCSV = () => {
    try {
      let csvContent = "\uFEFFAtributo,Valor\n"; // UTF-8 BOM for Excel support
      attributes.forEach(attr => {
        if (attr.values && attr.values.length > 0) {
          attr.values.forEach(val => {
            const safeAttrName = attr.name.includes(",") ? `"${attr.name}"` : attr.name;
            const safeVal = val.value.includes(",") ? `"${val.value}"` : val.value;
            csvContent += `${safeAttrName},${safeVal}\n`;
          });
        } else {
          const safeAttrName = attr.name.includes(",") ? `"${attr.name}"` : attr.name;
          csvContent += `${safeAttrName},\n`;
        }
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `atributos_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV exportado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao exportar: " + err.message);
    }
  };

  useEffect(() => {
    fetchAttributes()
  }, [])

  async function fetchAttributes() {
    setLoading(true)
    try {
      // 1. Buscar atributos
      const { data: attrData, error: attrErr } = await supabase
        .from("attributes")
        .select("*")
        .order("name", { ascending: true })

      if (attrErr) throw attrErr

      if (attrData) {
        // 2. Buscar valores para cada atributo
        const { data: valData, error: valErr } = await supabase
          .from("attribute_values")
          .select("*")

        if (valErr) throw valErr

        const fullAttributes = attrData.map((attr: any) => ({
          ...attr,
          values: valData?.filter((val: any) => val.attribute_id === attr.id) || []
        }))

        setAttributes(fullAttributes)
      }
    } catch (err: any) {
      toast.error("Erro ao carregar atributos: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDownTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const val = currentValInput.trim().replace(/,/g, "")
      if (val) {
        if (tempValues.includes(val)) {
          toast.error("Este valor já foi adicionado!")
          return
        }
        setTempValues(prev => [...prev, val])
      }
      setCurrentValInput("")
    } else if (e.key === "Backspace" && !currentValInput) {
      setTempValues(prev => prev.slice(0, -1))
    }
  }

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAttrName.trim()) {
      toast.error("Preencha o nome do atributo!")
      return
    }

    // Se houver algum valor pendente no input que não foi adicionado via Enter/Vírgula, adiciona agora
    let finalValues = [...tempValues]
    const pendingVal = currentValInput.trim().replace(/,/g, "")
    if (pendingVal) {
      if (!finalValues.includes(pendingVal)) {
        finalValues.push(pendingVal)
      }
    }

    if (finalValues.length === 0) {
      toast.error("Adicione pelo menos um valor/rótulo!")
      return
    }

    setIsSaving(true)
    try {
      // 1. Inserir atributo principal (capitalizado)
      const { data: attr, error: attrErr } = await supabase
        .from("attributes")
        .insert([{ name: capitalize(newAttrName) }])
        .select()
        .single()

      if (attrErr) throw attrErr

      // 2. Inserir valores associados (capitalizados)
      const recordsToInsert = finalValues.map(val => ({
        attribute_id: attr.id,
        value: capitalize(val)
      }))

      const { error: valErr } = await supabase
        .from("attribute_values")
        .insert(recordsToInsert)

      if (valErr) throw valErr

      toast.success("Atributo criado com sucesso!")
      setNewAttrName("")
      setTempValues([])
      setCurrentValInput("")
      fetchAttributes()
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAttribute = async (id: string) => {
    if (!confirm("Excluir este atributo e todos os seus valores vinculados? Isso pode afetar variações de produtos existentes.")) return
    try {
      const { error } = await supabase.from("attributes").delete().eq("id", id)
      if (error) throw error
      toast.success("Atributo excluído!")
      fetchAttributes()
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message)
    }
  }

  const handleDeleteValue = async (valId: string) => {
    try {
      const { error } = await supabase.from("attribute_values").delete().eq("id", valId)
      if (error) throw error
      toast.success("Valor removido!")
      fetchAttributes()
    } catch (err: any) {
      toast.error("Erro ao remover valor: " + err.message)
    }
  }

  const handleAddValueToExisting = async (attrId: string, valText: string) => {
    if (!valText.trim()) return
    try {
      const { error } = await supabase
        .from("attribute_values")
        .insert([{ attribute_id: attrId, value: capitalize(valText) }])

      if (error) throw error
      toast.success("Valor adicionado!")
      fetchAttributes()
    } catch (err: any) {
      toast.error("Erro ao adicionar valor: " + err.message)
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden px-2 md:px-0">
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Atributos
          </h1>
          <p className="text-xs text-muted-foreground">Gerencie as propriedades (ex: Cor, Voltagem) utilizadas na grade de variações.</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2 font-bold h-10 shrink-0 self-start sm:self-auto">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Criação */}
        <Card className="lg:col-span-1 rounded-2xl shadow-sm border h-fit">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-primary" />
              Novo Atributo
            </CardTitle>
            <CardDescription className="text-xs">Cadastre propriedades reutilizáveis.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveAttribute} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Nome do Atributo</label>
                <Input
                  placeholder="Ex: Cor, Tamanho, Voltagem"
                  value={newAttrName}
                  onChange={e => setNewAttrName(e.target.value)}
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Valores (Enter ou Vírgula)</label>
                <div className="min-h-12 flex flex-wrap gap-1.5 p-2 bg-white border rounded-xl items-center focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  {tempValues.map((val, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary"
                      className="h-7 bg-primary/10 text-primary font-bold text-xs gap-1 py-0 px-2 rounded-lg border border-primary/20"
                    >
                      {val}
                      <button 
                        type="button" 
                        onClick={() => setTempValues(prev => prev.filter((_, i) => i !== idx))}
                        className="text-primary hover:text-red-500 rounded-full transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    placeholder={tempValues.length === 0 ? "Ex: Azul, Preto..." : ""}
                    value={currentValInput}
                    onChange={e => setCurrentValInput(e.target.value)}
                    onKeyDown={handleKeyDownTagInput}
                    className="flex-1 min-w-[100px] bg-transparent outline-none border-none text-sm p-1"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isSaving} className="w-full font-bold h-10 rounded-xl">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Atributo"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Atributos Existentes */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl border p-12 text-center shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-3">Carregando atributos...</p>
            </div>
          ) : attributes.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center shadow-sm italic text-muted-foreground">
              Nenhum atributo cadastrado ainda.
            </div>
          ) : (
            attributes.map(attr => (
              <Card key={attr.id} className="rounded-2xl shadow-sm border">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-800">{attr.name}</CardTitle>
                    <CardDescription className="text-xs">Valores vinculados a este atributo.</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteAttribute(attr.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {attr.values?.map(val => (
                      <Badge 
                        key={val.id} 
                        variant="outline"
                        className="py-1 px-3 gap-1.5 font-semibold text-xs border bg-gray-50 text-gray-700 rounded-full group"
                      >
                        {val.value}
                        <button 
                          type="button" 
                          onClick={() => handleDeleteValue(val.id)}
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
                      id={`input-val-${attr.id}`}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          const inputEl = e.currentTarget
                          await handleAddValueToExisting(attr.id, inputEl.value)
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
                        const inputEl = document.getElementById(`input-val-${attr.id}`) as HTMLInputElement
                        if (inputEl) {
                          await handleAddValueToExisting(attr.id, inputEl.value)
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
            ))
          )}
        </div>
      </div>
    </div>
  )
}
