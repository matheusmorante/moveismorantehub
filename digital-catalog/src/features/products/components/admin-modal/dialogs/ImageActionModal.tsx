'use client';

import React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Trash2 } from 'lucide-react';

interface ImageActionModalProps {
  activeImageIndex: number | null;
  images: string[];
  onClose: () => void;
  onReplaceImage: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  onRemoveImage: (index: number) => void;
  onSetMainImage: (index: number) => void;
}

export function ImageActionModal({
  activeImageIndex,
  images,
  onClose,
  onReplaceImage,
  onRemoveImage,
  onSetMainImage,
}: ImageActionModalProps) {
  const isOpen = activeImageIndex !== null;
  const currentImageUrl = activeImageIndex !== null ? images[activeImageIndex] : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[360px] p-6 rounded-[24px] bg-white border border-gray-150">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Opções da Foto</DialogTitle>
          <DialogDescription className="text-xs">
            Escolha uma das ações abaixo para gerenciar esta foto.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          {currentImageUrl && (
            <div className="relative h-40 w-full rounded-2xl overflow-hidden border mx-auto">
              <Image
                src={currentImageUrl}
                alt="Foto selecionada"
                fill
                className="object-contain bg-gray-50"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="flex items-center justify-center gap-2 bg-blue-500 text-white h-11 px-4 rounded-xl cursor-pointer hover:bg-blue-600 font-semibold text-sm transition-colors">
              <Camera className="h-4 w-4" />
              Alterar
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  if (activeImageIndex !== null) {
                    onReplaceImage(e, activeImageIndex);
                    onClose();
                  }
                }}
              />
            </label>
            <Button
              type="button"
              variant="destructive"
              className="h-11 rounded-xl font-semibold gap-2"
              onClick={() => {
                if (activeImageIndex !== null) {
                  onRemoveImage(activeImageIndex);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          </div>

          {activeImageIndex !== null && activeImageIndex !== 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl font-semibold gap-2 border-primary text-primary hover:bg-primary/5"
              onClick={() => {
                if (activeImageIndex !== null) {
                  onSetMainImage(activeImageIndex);
                  onClose();
                }
              }}
            >
              Definir como Capa
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
