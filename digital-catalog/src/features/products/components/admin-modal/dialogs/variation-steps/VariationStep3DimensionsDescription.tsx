'use client';

import React from 'react';
import { Info, Link2, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductFormData, TempVariation } from '../../types';

export interface VariationStep3DimensionsDescriptionProps {
  readonly productFormData: ProductFormData;
  readonly varFormState: TempVariation;
  readonly setVarFormState: React.Dispatch<React.SetStateAction<TempVariation>>;
}

export function VariationStep3DimensionsDescription({
  productFormData,
  varFormState,
  setVarFormState,
}: VariationStep3DimensionsDescriptionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
        <Info className="h-5 w-5" />
        <span>Ficha Técnica da Variante</span>
      </div>

      {/* Medidas */}
      <div className="space-y-2 border-b pb-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-700">Medidas (cm)</label>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setVarFormState((prev) => ({
                ...prev,
                use_parent_dimensions: !prev.use_parent_dimensions,
                width: !prev.use_parent_dimensions ? productFormData.width : prev.width,
                depth: !prev.use_parent_dimensions ? productFormData.depth : prev.depth,
                height: !prev.use_parent_dimensions ? productFormData.height : prev.height,
              }))
            }
            className={`p-1.5 rounded-lg transition-all ${
              varFormState.use_parent_dimensions !== false
                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
            title={
              varFormState.use_parent_dimensions !== false
                ? 'Desvincular Medidas do Pai'
                : 'Sincronizar Medidas com o Pai'
            }
          >
            {varFormState.use_parent_dimensions !== false ? (
              <Link2 className="h-3.5 w-3.5" />
            ) : (
              <Link2Off className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {varFormState.use_parent_dimensions === false && (
          <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-1 duration-200">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500">Largura</span>
              <Input
                placeholder="L"
                value={varFormState.width}
                onChange={(e) =>
                  setVarFormState((prev) => ({ ...prev, width: e.target.value }))
                }
                className="h-10 text-xs text-center"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500">
                {productFormData.depth_use_length ? 'Comprimento' : 'Profundidade'}
              </span>
              <Input
                placeholder={productFormData.depth_use_length ? 'C' : 'P'}
                value={varFormState.depth}
                onChange={(e) =>
                  setVarFormState((prev) => ({ ...prev, depth: e.target.value }))
                }
                className="h-10 text-xs text-center"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500">Altura</span>
              <Input
                placeholder="A"
                value={varFormState.height}
                onChange={(e) =>
                  setVarFormState((prev) => ({ ...prev, height: e.target.value }))
                }
                className="h-10 text-xs text-center"
              />
            </div>
          </div>
        )}
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-700">Descrição</label>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setVarFormState((prev) => ({
                ...prev,
                use_parent_description: !prev.use_parent_description,
                description: !prev.use_parent_description
                  ? productFormData.description
                  : prev.description,
              }))
            }
            className={`p-1.5 rounded-lg transition-all ${
              varFormState.use_parent_description !== false
                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
            title={
              varFormState.use_parent_description !== false
                ? 'Desvincular Descrição do Pai'
                : 'Sincronizar Descrição com o Pai'
            }
          >
            {varFormState.use_parent_description !== false ? (
              <Link2 className="h-3.5 w-3.5" />
            ) : (
              <Link2Off className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {varFormState.use_parent_description === false && (
          <Textarea
            placeholder="Descrição personalizada da variação"
            value={varFormState.description}
            onChange={(e) =>
              setVarFormState((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
            className="text-xs resize-none animate-in slide-in-from-top-1 duration-200"
          />
        )}
      </div>
    </div>
  );
}
