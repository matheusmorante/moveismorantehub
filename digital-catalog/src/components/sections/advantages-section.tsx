import { Truck, ShieldCheck, Clock, Package, CreditCard } from "lucide-react"

export function AdvantagesSection() {
  return (
    <section className="py-8 md:py-10 bg-gray-50/50 border-y border-gray-100">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-8 gap-x-4">
          <div className="flex flex-col items-center text-center gap-2 group">
            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-gray-100">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-primary uppercase tracking-tight">Entrega Rápida</h3>
              <p className="text-[10px] text-muted-foreground font-medium">(1 a 5 dias úteis)</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-2 group">
            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-gray-100">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-primary uppercase tracking-tight">Compra Segura</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Pagamento na entrega</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-2 group">
            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-gray-100">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-primary uppercase tracking-tight">Até 10x sem Juros</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Visa, Master, Elo e Hiper</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-2 group">
            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-gray-100">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-primary uppercase tracking-tight">Montagem Agendada</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Feito no dia da entrega</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-2 group">
            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-gray-100">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-primary uppercase tracking-tight">Retirada Agendada</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Retire no depósito</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
