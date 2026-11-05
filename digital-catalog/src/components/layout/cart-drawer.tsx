'use client';

import { useCart } from '@/hooks/use-cart';
import { formatCurrency } from '@/lib/utils';
import { sendCartInterest } from '@/services/whatsapp';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import { CatalogProductImage } from '@/components/ui/CatalogProductImage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { useZodForm, flattenFormErrors } from '@/hooks/useZodForm';
import { cartQuoteFormSchema, reconcileCartQuote } from '@/features/products/cart-quote';
import { supabase } from '@/lib/supabase/client';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';

export function CartDrawer({ children }: { children: React.ReactNode }) {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, refreshPrices } = useCart();
  const [checking, setChecking] = useState(false), [checkoutError, setCheckoutError] = useState('');
  const form = useZodForm(cartQuoteFormSchema, { items });

  const handleCheckout = async () => {
    if (checking) return;
    setChecking(true); setCheckoutError('');
    try {
      await form.validateAndRun({ items }, async (values) => {
        const { data, error } = await withAbortTimeout(supabase.rpc('catalog_cart_quote', { p_item_ids: values.items.map((item) => item.id) }), 'catalogo:conferir-carrinho', 15_000);
        if (error) throw error;
        if (!Array.isArray(data)) throw new Error('Não foi possível conferir o carrinho. Tente novamente.');
        const quoted = reconcileCartQuote(values.items, data);
        refreshPrices(quoted);
        if (quoted.some((item, index) => item.price !== values.items[index].price)) {
          setCheckoutError('Os preços foram atualizados. Confira o subtotal e finalize novamente.');
          return;
        }
        sendCartInterest(quoted, quoted.reduce((total, item) => total + item.price * item.quantity, 0));
      }, (errors) => setCheckoutError(Object.values(flattenFormErrors(errors))[0] || 'Confira o carrinho.'));
    } catch (cause) { setCheckoutError(cause instanceof Error ? cause.message : 'Não foi possível conferir o carrinho. Tente novamente.'); }
    finally { setChecking(false); }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
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
                      <CatalogProductImage src={item.image} alt={item.name} size="thumbnail" fill className="object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm line-clamp-2">{item.name}</h4>
                        <p className="text-primary font-bold text-sm">
                          {formatCurrency(item.price)}
                        </p>
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
                <span className="font-bold text-xl text-primary">
                  {formatCurrency(totalPrice())}
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O fechamento do pedido será realizado via WhatsApp.
              </p>
              {checkoutError && <p role="alert" className="text-sm text-destructive">{checkoutError}</p>}
              <Button
                className="w-full gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white py-6 text-lg font-bold"
                onClick={handleCheckout}
                disabled={checking}
              >
                <WhatsAppIcon className="h-6 w-6" />
                {checking ? 'Conferindo carrinho…' : 'Finalizar Pedido'}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
