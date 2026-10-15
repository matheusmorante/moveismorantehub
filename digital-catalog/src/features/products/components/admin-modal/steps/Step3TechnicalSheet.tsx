'use client';

import React from 'react';
import { Info, ArrowLeftRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductFormData } from '../types';

interface Step3TechnicalSheetProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
}

export function Step3TechnicalSheet({ formData, setFormData }: Step3TechnicalSheetProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
        <Info className="h-5 w-5" />
        <span>Descrição e Ficha Técnica</span>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700">
          Descrição Completa{' '}
          <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
        </label>
        <Textarea
          placeholder="Descrição completa"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={6}
          className="resize-none"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700">
            Medidas <span className="text-gray-400 font-normal text-xs">(em cm — Opcional)</span>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500">Largura</span>
              <div className="relative">
                <Input
                  placeholder="Largura"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  className="pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">
                  cm
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-500">
                  {formData.depth_use_length ? 'Comprimento' : 'Profundidade'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      depth_use_length: !prev.depth_use_length,
                    }))
                  }
                  title={
                    formData.depth_use_length
                      ? 'Alternar para Profundidade'
                      : 'Alternar para Comprimento'
                  }
                  className="p-0.5 rounded text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                </button>
              </div>
              <div className="relative">
                <Input
                  placeholder={formData.depth_use_length ? 'Compr.' : 'Profund.'}
                  value={formData.depth}
                  onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                  className="pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">
                  cm
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500">Altura</span>
              <div className="relative">
                <Input
                  placeholder="Altura"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">
                  cm
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
