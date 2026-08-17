"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Package, ListTree, LogOut, ShoppingBag, Palette, Menu, ChevronRight, Layers, Zap, Loader2, Tags, Settings, Share2, Megaphone } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { defaultProductCardStyle, ProductCardStyle } from "@/lib/product-card-style"

interface FacebookCatalogSettings {
  global_description_prefix: string
  meta_access_token?: string
  meta_catalog_id?: string
  column_mappings: {
    brand: string
    condition: string
    gender: string
    age_group: string
  }
}

const styleOptions = {
  border_width: [["thin", "Fina"], ["medium", "Média"], ["strong", "Marcante"]],
  border_radius: [["square", "Reto"], ["soft", "Suave"], ["rounded", "Arredondado"]],
  shadow: [["none", "Sem sombra"], ["soft", "Suave"], ["elevated", "Destacada"]],
  opportunity_emphasis: [["subtle", "Discreto"], ["highlighted", "Em destaque"], ["animated", "Pulsante"]],
  button_style: [["standard", "Cantos suaves"], ["rounded", "Pílula"]],
} as const

const styleLabels: Record<keyof ProductCardStyle, string> = {
  border_width: "Espessura da borda", border_radius: "Formato do card", shadow: "Sombra",
  opportunity_emphasis: "Destaque de oportunidade", button_style: "Formato dos botões",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Configurações Globais (Modal de Configurações Administrativas)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [styleSettings, setStyleSettings] = useState<ProductCardStyle>(defaultProductCardStyle)
  const [catalogSettings, setCatalogSettings] = useState<FacebookCatalogSettings>({
    global_description_prefix: "",
    meta_access_token: "",
    meta_catalog_id: "",
    column_mappings: {
      brand: "Móveis Morante",
      condition: "new",
      gender: "unisex",
      age_group: "adult"
    }
  })

  useEffect(() => {
    async function checkUser() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        
        if (data?.session?.user?.email === "matheusmorante002@gmail.com") {
          setIsAuthenticated(true)
          loadGlobalSettings()
        } else {
          router.push("/")
        }
      } catch (err) {
        console.error("Erro na verificação de auth:", err)
        router.push("/")
      } finally {
        setCheckingAuth(false)
      }
    }
    checkUser()
  }, [router])

  async function loadGlobalSettings() {
    try {
      const [styleRes, catRes] = await Promise.all([
        supabase.from("store_style_settings").select("border_width, border_radius, shadow, opportunity_emphasis, button_style").eq("id", true).maybeSingle(),
        supabase.from("facebook_catalog_settings").select("global_description_prefix, column_mappings, meta_access_token, meta_catalog_id").eq("id", true).maybeSingle()
      ])

      if (styleRes.data) {
        setStyleSettings(styleRes.data as ProductCardStyle)
      }
      if (catRes.data) {
        setCatalogSettings({
          global_description_prefix: catRes.data.global_description_prefix || "",
          meta_access_token: catRes.data.meta_access_token || "",
          meta_catalog_id: catRes.data.meta_catalog_id || "",
          column_mappings: {
            brand: catRes.data.column_mappings?.brand || "Móveis Morante",
            condition: catRes.data.column_mappings?.condition || "new",
            gender: catRes.data.column_mappings?.gender || "unisex",
            age_group: catRes.data.column_mappings?.age_group || "adult"
          }
        })
      }
    } catch (e) {
      console.error("Erro ao carregar configurações gerais:", e)
    }
  }

  const handleSaveGlobalConfig = async () => {
    setIsSavingConfig(true)
    try {
      const [styleRes, catRes] = await Promise.all([
        supabase.from("store_style_settings").upsert({ id: true, ...styleSettings }),
        supabase.from("facebook_catalog_settings").upsert({
          id: true,
          global_description_prefix: catalogSettings.global_description_prefix,
          meta_access_token: catalogSettings.meta_access_token,
          meta_catalog_id: catalogSettings.meta_catalog_id,
          column_mappings: catalogSettings.column_mappings
        })
      ])

      if (styleRes.error) throw styleRes.error
      if (catRes.error) throw catRes.error

      toast.success("Configurações do sistema atualizadas com sucesso!")
      setIsConfigOpen(false)
      // Disparar recarga de dados do design na UI caso o usuário esteja em páginas de visualização
      if (typeof window !== "undefined") {
        const channel = new BroadcastChannel("catalog-updates")
        channel.postMessage("catalog-updated")
        channel.close()
      }
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message)
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    router.push("/")
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="font-bold text-gray-500 text-sm">Verificando permissões...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const navigation = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, active: pathname === "/admin" },
    { href: "/admin/products", label: "Produtos", icon: Package, active: pathname.startsWith("/admin/products") },
    { href: "/admin/categories", label: "Ambientes & Categorias", icon: ListTree, active: pathname.startsWith("/admin/categories") },
    { href: "/admin/materials", label: "Materiais", icon: Layers, active: pathname.startsWith("/admin/materials") },
    { href: "/admin/opportunities", label: "Oportunidades", icon: Zap, active: pathname.startsWith("/admin/opportunities") },
    { href: "/admin/attributes", label: "Atributos", icon: Tags, active: pathname.startsWith("/admin/attributes") },
    { href: "/admin/marketing", label: "Marketing", icon: Megaphone, active: pathname.startsWith("/admin/marketing") },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-8 md:px-12 lg:px-16">
          <div className="flex h-full items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden rounded-full hover:bg-primary/5">
                  <Menu className="h-6 w-6 text-primary" />
                  <span className="sr-only">Abrir menu administrativo</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <div className="flex h-full flex-col bg-white">
                  <div className="border-b bg-gray-50/50 p-6">
                    <p className="font-black uppercase tracking-tighter text-primary">Móveis <span className="text-accent">Morante</span></p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Dashboard administrativo</p>
                  </div>
                  <nav className="flex-1 space-y-2 p-4">
                    {navigation.map((item) => (
                      <Link key={item.label} href={item.href} className={`flex items-center justify-between rounded-xl p-3 font-bold transition-colors ${item.active ? "bg-primary text-white" : "text-gray-700 hover:bg-primary/5 hover:text-primary"}`}>
                        <span className="flex items-center gap-3"><item.icon className="h-5 w-5" />{item.label}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    ))}
                  </nav>
                  <div className="space-y-2 border-t p-4">
                    <button 
                      onClick={() => setIsConfigOpen(true)}
                      className="flex items-center gap-3 w-full rounded-xl p-3 font-bold text-gray-700 hover:bg-primary/5"
                    >
                      <Settings className="h-5 w-5 text-gray-500" />
                      Configurações Gerais
                    </button>
                    <Link href="/" className="flex items-center gap-3 rounded-xl p-3 font-bold text-primary hover:bg-primary/5"><ShoppingBag className="h-5 w-5" />Voltar para a loja</Link>
                    <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}><LogOut className="h-5 w-5" />Sair</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/admin" className="flex h-16 items-center gap-2">
              <div className="relative h-14 w-12 self-end sm:w-14">
                <Image src="/images/avatar-morante.png" alt="Móveis Morante" fill sizes="56px" className="object-contain object-bottom" />
              </div>
              <span className="flex flex-col text-base font-bold italic uppercase leading-none tracking-tighter text-primary sm:text-lg">
                <span>Móveis <span className="text-accent">Morante</span></span>
                <span className="mt-1 text-[9px] not-italic font-bold tracking-[0.18em] text-muted-foreground">Administração</span>
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navigation.map((item) => (
              <Link key={item.label} href={item.href} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${item.active ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-primary/5 hover:text-primary"}`}>{item.label}</Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsConfigOpen(true)}
              className="rounded-full hover:bg-primary/5 text-gray-600 hover:text-primary"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button asChild variant="ghost" className="hidden gap-2 font-bold text-primary hover:bg-primary/5 sm:flex"><Link href="/"><ShoppingBag className="h-4 w-4" />Voltar para a loja</Link></Button>
            <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}><LogOut className="h-5 w-5" /><span className="sr-only">Sair</span></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] overflow-hidden p-4 md:p-8">
        {children}
      </main>

      {/* Modal de Configuração Geral do Sistema (Permissão de Admin) */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <Settings className="h-5 w-5 text-primary" />
              Painel de Configurações Administrativas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Altere o comportamento visual da loja e a integração de feeds do Facebook Meta. Apenas usuários autorizados podem efetuar alterações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4 text-left">
            {/* Seção 1: Design e Apresentação dos Cards */}
            <div>
              <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Estilo Visual do E-commerce</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(styleOptions) as (keyof ProductCardStyle)[]).map((key) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">{styleLabels[key]}</label>
                    <Select 
                      value={styleSettings[key]} 
                      onValueChange={(val) => setStyleSettings(current => ({ ...current, [key]: val } as ProductCardStyle))}
                    >
                      <SelectTrigger className="w-full h-9 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {styleOptions[key].map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Seção 2: Integração Catálogo Meta */}
            <div className="border-t pt-5">
              <h3 className="text-sm font-bold text-blue-600 mb-3 uppercase tracking-wider">Integração Catálogo Meta & WhatsApp</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Descrição Base Inicial Global</label>
                  <Textarea 
                    placeholder="Texto fixo que aparecerá na primeira linha da descrição de todos os produtos do catálogo..."
                    value={catalogSettings.global_description_prefix}
                    onChange={(e) => setCatalogSettings(prev => ({ ...prev, global_description_prefix: e.target.value }))}
                    className="min-h-20 text-xs font-semibold"
                  />
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Token de Acesso da API do Meta (Access Token)</label>
                    <Input 
                      value={catalogSettings.meta_access_token}
                      placeholder="Cole o token EAATYy..."
                      onChange={(e) => setCatalogSettings(prev => ({ ...prev, meta_access_token: e.target.value }))}
                      className="h-9 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">ID do Catálogo do Meta (Catalog ID)</label>
                    <Input 
                      value={catalogSettings.meta_catalog_id}
                      placeholder="Ex: 2597693034029026"
                      onChange={(e) => setCatalogSettings(prev => ({ ...prev, meta_catalog_id: e.target.value }))}
                      className="h-9 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Marca Padrão (brand)</label>
                    <Input 
                      value={catalogSettings.column_mappings.brand}
                      onChange={(e) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        column_mappings: { ...prev.column_mappings, brand: e.target.value } 
                      }))}
                      className="h-9 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Condição Padrão (condition)</label>
                    <Select 
                      value={catalogSettings.column_mappings.condition}
                      onValueChange={(val) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        column_mappings: { ...prev.column_mappings, condition: val } 
                      }))}
                    >
                      <SelectTrigger className="h-9 text-xs font-semibold w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Novo (new)</SelectItem>
                        <SelectItem value="used">Usado (used)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Gênero Padrão (gender)</label>
                    <Select 
                      value={catalogSettings.column_mappings.gender}
                      onValueChange={(val) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        column_mappings: { ...prev.column_mappings, gender: val } 
                      }))}
                    >
                      <SelectTrigger className="h-9 text-xs font-semibold w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unisex">Unissex (unisex)</SelectItem>
                        <SelectItem value="female">Feminino (female)</SelectItem>
                        <SelectItem value="male">Masculino (male)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Faixa Etária Padrão (age_group)</label>
                    <Select 
                      value={catalogSettings.column_mappings.age_group}
                      onValueChange={(val) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        column_mappings: { ...prev.column_mappings, age_group: val } 
                      }))}
                    >
                      <SelectTrigger className="h-9 text-xs font-semibold w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adult">Adulto (adult)</SelectItem>
                        <SelectItem value="all ages">Todas as idades (all ages)</SelectItem>
                        <SelectItem value="kids">Crianças (kids)</SelectItem>
                        <SelectItem value="teen">Adolescente (teen)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex flex-wrap gap-2 items-center justify-between">
            <Button 
              variant="outline"
              className="text-xs font-bold border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 gap-1.5"
              onClick={async () => {
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
              disabled={isSavingConfig}
            >
              <Share2 className="h-3.5 w-3.5" />
              Atualizar Catálogo Meta
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsConfigOpen(false)} disabled={isSavingConfig} className="text-xs font-bold">
                Cancelar
              </Button>
              <Button onClick={handleSaveGlobalConfig} disabled={isSavingConfig} className="text-xs font-bold bg-primary shadow-md">
                {isSavingConfig ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
