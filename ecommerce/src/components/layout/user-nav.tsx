"use client"

import { useState } from "react"
import { 
  User as UserIcon, 
  LogOut, 
  UserCircle, 
  Settings, 
  ShoppingBag,
  ShieldCheck,
} from "lucide-react"
import { useAdminMode } from "@/hooks/use-admin-mode"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

export function UserNav() {
  const { user, loginWithGoogle, logout } = useAuth()
  const { isAdminMode, toggleAdminMode } = useAdminMode()
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  const handleLoginGoogle = async () => {
    const { error } = await loginWithGoogle()
    if (error) {
      toast.error("Erro ao entrar com Google: " + error.message)
    }
  }

  const handleLogout = async () => {
    const { error } = await logout()
    if (error) {
      toast.error("Erro ao sair: " + error.message)
    } else {
      toast.success("Saiu com sucesso!")
    }
  }

  const handleEmailLoginPlaceholder = (e: React.FormEvent) => {
    e.preventDefault()
    toast.info("Login por e-mail será implementado em breve. Use o Google por enquanto!")
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="gap-2 px-1.5 sm:px-2 md:px-4">
              <UserCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              <span className="hidden md:inline-block text-sm font-medium">Logar / Cadastrar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">Acesse sua Conta</DialogTitle>
              <DialogDescription className="text-center">
                Entre para acompanhar seus pedidos e gerenciar seu perfil.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEmailLoginPlaceholder} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="seu@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required />
              </div>
              <Button type="submit" className="w-full bg-primary text-white font-bold py-6">
                Entrar
              </Button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            <Button variant="outline" type="button" className="w-full py-6 gap-3 font-bold border-gray-300" onClick={handleLoginGoogle}>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Entrar com Google
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Ainda não tem uma conta? <button className="text-primary font-bold hover:underline">Cadastre-se</button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const userName = user.user_metadata?.full_name || user.email || "Usuário"
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-1.5 sm:px-2 md:px-4 hover:bg-primary/5">
          <UserCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
          <span className="hidden md:inline-block text-sm font-bold text-primary">{userName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = "/perfil"}>
            <UserIcon className="mr-2 h-4 w-4 text-primary" />
            <span className="font-semibold">Meu Perfil</span>
          </DropdownMenuItem>
          {user.email === "matheusmorante002@gmail.com" && (
            <>
              <DropdownMenuItem className="cursor-pointer text-primary font-bold focus:text-primary" onClick={() => window.location.href = "/admin"}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Painel Admin</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold text-amber-600 focus:text-amber-600" onClick={toggleAdminMode}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>{isAdminMode ? "Desativar Modo Edição" : "Ativar Modo Edição"}</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem className="cursor-pointer">
            <ShoppingBag className="mr-2 h-4 w-4" />
            <span>Meus Pedidos</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
