"use client"

import { useCart } from "@/hooks/use-cart"
import { formatCurrency } from "@/lib/utils"
import { sendCartInterest } from "@/services/whatsapp"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet"
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import Image from "next/image"
import { ScrollArea } from "@/components/ui/scroll-area"

export function CartDrawer({ children }: { children: React.ReactNode }) {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart()

  const handleCheckout = () => {
    sendCartInterest(items, totalPrice())
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Seu Carrinho ({totalItems()})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/20" />
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="flex flex-col gap-6 py-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative h-20 w-20 rounded-md overflow-hidden border">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm line-clamp-2">{item.name}</h4>
                        <p className="text-primary font-bold text-sm">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs font-bold w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <SheetFooter className="border-t pt-6 flex-col gap-4">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-muted-foreground">Subtotal</span>
                <span className="font-bold text-xl text-primary">{formatCurrency(totalPrice())}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O fechamento do pedido será realizado via WhatsApp.
              </p>
              <Button 
                className="w-full gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white py-6 text-lg font-bold"
                onClick={handleCheckout}
              >
                <WhatsAppIcon className="h-6 w-6" />
                Finalizar Pedido
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
