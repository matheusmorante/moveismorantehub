import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartDrawer } from "../cart-drawer"

interface CartButtonProps {
  mounted: boolean
  itemCount: number
}

export function CartButton({ mounted, itemCount }: CartButtonProps) {
  const showBadge = mounted && itemCount > 0

  return (
    <CartDrawer>
      <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/5">
        <ShoppingCart className="h-5 w-5" />
        {showBadge && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
            {itemCount}
          </span>
        )}
        <span className="sr-only">Carrinho</span>
      </Button>
    </CartDrawer>
  )
}
