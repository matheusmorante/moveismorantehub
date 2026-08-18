"use client"

import { Info, CreditCard, AlertCircle, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"

interface PaymentInfoProps {
  price: number
  originalPrice?: number
}

export function PaymentInfo({ price, originalPrice }: PaymentInfoProps) {
  const installmentValue = price / 10

  return (
    <div className="bg-gray-50/70 p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-3">
      {/* Preços */}
      <div className="space-y-1">
        {originalPrice && originalPrice > price && (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs sm:text-sm text-muted-foreground line-through decoration-primary/30 font-medium">
              De {formatCurrency(originalPrice)}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black text-white bg-[#00A650] px-2 py-0.5 rounded-md shadow-sm leading-none">
              <TrendingDown className="h-3 w-3 text-white shrink-0 stroke-[3]" />
              <span>{Math.floor(((originalPrice - price) / originalPrice) * 100)}% OFF</span>
            </span>
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <p className="text-2xl sm:text-4xl font-black text-[#00A650] tracking-tight leading-none">
            {formatCurrency(price)}
          </p>
        </div>
      </div>

      {/* Parcelamento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-200/60">
        <div className="space-y-0.5">
          <p className="text-xs sm:text-base font-bold text-primary flex flex-wrap gap-x-1 items-center">
            Em até 10x de <span className="text-blue-600 text-sm sm:text-lg font-black">{formatCurrency(installmentValue)}</span> sem juros
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground">
            Visa, MasterCard, Elo e Hiper
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button className="h-8 px-3 gap-1.5 flex items-center justify-center rounded-full bg-white text-gray-700 hover:bg-primary hover:text-white transition-all text-[11px] sm:text-xs font-bold shrink-0 border border-gray-200 shadow-2xs self-start sm:self-auto" title="Ver condições de pagamento">
              <Info className="h-3.5 w-3.5 text-primary group-hover:text-white" />
              <span>Ver condições de pagamento</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Condições de Pagamento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-green-700 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Cartões SEM Juros (Até 10x)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 pl-4 font-medium">
                  <span>• Visa</span>
                  <span>• Mastercard</span>
                  <span>• Elo</span>
                  <span>• Hipercard</span>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <h4 className="font-bold text-sm text-amber-700 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Cartões COM Juros
                </h4>
                <div className="space-y-2 text-sm text-gray-600 pl-4">
                  <p className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    Senff
                  </p>
                  <p className="text-[11px] text-muted-foreground italic mt-2">
                    * Consulte as taxas de juros no momento do fechamento do pedido via WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
