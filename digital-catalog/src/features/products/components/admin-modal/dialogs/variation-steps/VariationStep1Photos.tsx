'use client';

import React from 'react';
import { Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TempVariation } from '../../types';

export interface VariationStep1PhotosProps {
  readonly images: readonly string[];
  readonly varFormState: TempVariation;
  readonly setVarFormState: React.Dispatch<React.SetStateAction<TempVariation>>;
}

export function VariationStep1Photos({
  images,
  varFormState,
  setVarFormState,
}: VariationStep1PhotosProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
        <Camera className="h-5 w-5" />
        <span>
          Vincular Foto <span className="text-red-500">*</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground bg-blue-50/50 text-blue-700 p-3 rounded-2xl border border-blue-100">
        Selecione obrigatoriamente uma das fotos adicionadas na Etapa 1 do produto principal
        para representar esta variação.
      </p>

      {images.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-2xl text-xs text-red-500 bg-red-50 font-bold">
          Nenhuma imagem disponível no produto principal. Adicione imagens na Etapa 1 primeiro!
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((url, imgIndex) => {
            const selectedUrls = varFormState.image_url
              ? varFormState.image_url.split(',').filter(Boolean)
              : [];
            const isSelected = selectedUrls.includes(url);
            const selectOrderIndex = selectedUrls.indexOf(url);

            return (
              <button
                key={imgIndex}
                type="button"
                onClick={() => {
                  let updatedUrls = [...selectedUrls];
                  if (isSelected) {
                    updatedUrls = updatedUrls.filter((u) => u !== url);
                  } else {
                    if (updatedUrls.length >= 12) {
                      toast.error('Você pode selecionar no máximo 12 fotos.');
                      return;
                    }
                    updatedUrls.push(url);
                  }
                  setVarFormState((prev) => ({
                    ...prev,
                    image_url: updatedUrls.join(','),
                  }));
                }}
                className={`relative aspect-square rounded-2xl overflow-hidden border-4 bg-gray-50 transition-all ${
                  isSelected
                    ? 'border-primary scale-[1.03] shadow-md'
                    : 'border-transparent opacity-75 hover:opacity-100'
                }`}
              >
                <img
                  src={url}
                  alt={`Foto ${imgIndex + 1}`}
                  className="object-cover h-full w-full"
                />
                {isSelected && (
                  <Badge className="absolute top-1 right-1 bg-primary text-[8px] px-1 py-0 shadow z-10">
                    #{selectOrderIndex + 1} Vinculada
                  </Badge>
                )}
                <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.2 rounded">
                  Foto {imgIndex + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
