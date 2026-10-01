'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';

interface FilterContentProps {
  filters: any;
  onApply: (filters: any) => void;
  onClose?: () => void;
}

export function FilterContent({
  filters,
  onApply,
  onClose,
}: FilterContentProps) {
  const [localPrice, setLocalPrice] = useState([filters.minPrice, filters.maxPrice]);

  useEffect(() => {
    setLocalPrice([filters.minPrice, filters.maxPrice]);
  }, [filters]);

  const resetPriceRange = () => {
    setLocalPrice([0, 10000]);
    onApply({ minPrice: 0, maxPrice: 10000 });
  };

  return (
    <div className="bg-white rounded-3xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full max-h-[100dvh] overflow-hidden">
      {/* Título e Botão Reset Fixo no Topo */}
      <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4 shrink-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h3 className="font-black text-lg text-primary">Filtros</h3>
        </div>
        <div className="flex items-center gap-2">
          {(localPrice[0] > 0 ||
            localPrice[1] < 10000) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetPriceRange}
              className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-bold h-8 px-2 rounded-lg"
            >
              Limpar
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo Rolável */}
      <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6 overscroll-contain">
        {/* Faixa de Preço */}
        <div className="space-y-4">
          <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Faixa de Preço
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Mínimo</span>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  R$
                </span>
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  value={localPrice[0]}
                  onChange={(e) => {
                    const val = Math.min(10000, Math.max(0, parseInt(e.target.value) || 0));
                    const next = [val, Math.max(val, localPrice[1])];
                    setLocalPrice(next);
                    onApply({
                      minPrice: next[0],
                      maxPrice: next[1],
                    });
                  }}
                  className="pl-8 h-9 text-xs font-bold"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Máximo</span>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  R$
                </span>
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  value={localPrice[1]}
                  onChange={(e) => {
                    const val = Math.min(10000, Math.max(0, parseInt(e.target.value) || 0));
                    const next = [Math.min(val, localPrice[0]), val];
                    setLocalPrice(next);
                    onApply({
                      minPrice: next[0],
                      maxPrice: next[1],
                    });
                  }}
                  className="pl-8 h-9 text-xs font-bold"
                />
              </div>
            </div>
          </div>
          <Slider
            min={0}
            max={10000}
            step={100}
            value={localPrice}
            onValueChange={setLocalPrice}
            onValueCommit={(val) => {
              onApply({
                minPrice: val[0],
                maxPrice: val[1],
              });
            }}
            className="py-4"
          />
        </div>

      </div>

      <div className="lg:hidden border-t border-gray-100 p-4 bg-white flex items-center justify-between gap-4 shrink-0">
        <Button
          variant="outline"
          onClick={resetPriceRange}
          className="flex-1 h-12 rounded-xl text-sm font-bold text-gray-700 border-gray-200 hover:bg-gray-50"
        >
          Limpar faixa
        </Button>
        <Button
          onClick={onClose}
          className="flex-1 h-12 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-white"
        >
          Ver resultados
        </Button>
      </div>
    </div>
  );
}

interface FilterSidebarProps {
  filters: any;
  onApply: (filters: any) => void;
}

export function FilterSidebar({ filters, onApply }: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 h-14 px-6 rounded-full border-2 hover:bg-gray-50 shrink-0 shadow-sm"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filtros</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-full sm:max-w-md p-0 border-none bg-transparent h-full max-h-[100dvh] flex flex-col"
        >
          <FilterContent
            filters={filters}
            onApply={onApply}
            onClose={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
