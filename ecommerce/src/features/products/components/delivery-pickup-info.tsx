"use client"

import { Truck, Package } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { Button } from "@/components/ui/button"
import { generateWhatsAppLink } from "@/services/whatsapp"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function DeliveryPickupInfo() {
  const handleWhatsApp = (subject: string) => {
    const message = `Olá, gostaria de tirar dúvidas sobre ${subject} na Móveis Morante.`
    window.open(generateWhatsAppLink(message), "_blank")
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex-1 gap-2 border-primary/20 hover:border-primary text-primary h-12">
            <Truck className="h-4 w-4" />
            Condições de Entrega
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Condições de Entrega
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed text-gray-700 py-4">
            <p>Entregamos para Curitiba e toda região metropolitana.</p>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <p className="font-medium text-blue-900">
                Prazo médio: <span className="font-bold underline decoration-blue-500">1 a 5 dias úteis</span>.
              </p>
            </div>
            <p>
              O dia e horário exatos da entrega são combinados e agendados diretamente pelo 
              <span className="font-bold text-green-600"> WhatsApp</span> na realização do pedido.
            </p>
            <p>
              Entre em contato para consultar o valor do frete. Produtos menores normalmente já são 
              entregues montados diretamente do depósito. Produtos grandes são montados no local 
              da entrega no mesmo dia.
            </p>
            <Button 
              className="w-full gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white border-none"
              onClick={() => handleWhatsApp("entrega")}
            >
              <WhatsAppIcon className="h-4 w-4" />
              Consultar Frete no WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex-1 gap-2 border-primary/20 hover:border-primary text-primary h-12">
            <Package className="h-4 w-4" />
            Condições de Retirada
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Condições de Retirada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed text-gray-700 py-4">
            <p>Também é possível realizar a retirada dos produtos diretamente conosco.</p>
            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-bounce" />
              <p className="font-medium text-yellow-900">
                <span className="font-bold">Retirada Agendada</span>: Móveis montados ou na caixa.
              </p>
            </div>
            <p>
              Podemos deixar o móvel já montado para retirada. Caso o produto não seja última unidade, 
              também é possível retirar na caixa.
            </p>
            <p className="font-medium italic">
              A retirada deve ser agendada antecipadamente para dar tempo da montagem quando necessário.
            </p>
            <Button 
              className="w-full gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white border-none"
              onClick={() => handleWhatsApp("retirada")}
            >
              <WhatsAppIcon className="h-4 w-4" />
              Agendar Retirada no WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
