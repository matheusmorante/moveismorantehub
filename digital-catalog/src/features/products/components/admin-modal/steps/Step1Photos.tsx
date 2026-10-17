'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Trash2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  processAndUploadProductImages,
  processAndUploadSingleProductImage,
} from '../utils/productImageUploadUtils';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  storefrontImageUploadFormSchema,
  storefrontImageUrlFormSchema,
} from '@/shared-utils/storefrontProductFormSchemas';

interface Step1PhotosProps {
  images: string[];
  setImages: (images: string[] | ((prev: string[]) => string[])) => void;
  onOpenImageAction: (index: number) => void;
  setIsSaving: (isSaving: boolean) => void;
}

export function Step1Photos({
  images,
  setImages,
  onOpenImageAction,
  setIsSaving,
}: Step1PhotosProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const uploadForm = useZodForm(storefrontImageUploadFormSchema, { files: [] });
  const imageUrlForm = useZodForm(storefrontImageUrlFormSchema, { url: '' });
  const showFormError = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    toast.error(Object.values(flattenFormErrors(errors))[0]);

  // Horizontal mouse wheel scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (container.scrollWidth > container.clientWidth) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, [images]);

  // Global Ctrl+V Paste Handler
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;

      await uploadForm.validateAndRun(
        { files: imageFiles },
        async (validated) => {
          setIsSaving(true);
          const toastId = toast.loading('Otimizando imagem colada...');

          try {
            const newUrls = await processAndUploadProductImages(validated.files, 'pasted');
            setImages((prev) => [...prev, ...newUrls]);
            toast.success('Imagem colada com sucesso!', { id: toastId });
          } catch (error: any) {
            toast.error('Erro no upload da imagem colada: ' + error.message, { id: toastId });
          } finally {
            setIsSaving(false);
          }
        },
        showFormError
      );
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [images, setIsSaving, uploadForm, setImages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const incoming = Array.from(e.target.files);
    await uploadForm.validateAndRun(
      { files: incoming },
      async (validated) => {
        setIsSaving(true);
        const toastId = toast.loading('Otimizando imagens...');

        try {
          const newUrls = await processAndUploadProductImages(validated.files);
          setImages((prev) => [...prev, ...newUrls]);
          toast.success('Imagens enviadas!', { id: toastId });
        } catch (error: any) {
          toast.error('Erro no upload: ' + error.message, { id: toastId });
        } finally {
          setIsSaving(false);
        }
      },
      showFormError
    );
  };

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files?.length) return;
    await uploadForm.validateAndRun(
      { files: [e.target.files[0]] },
      async (validated) => {
        setIsSaving(true);
        const toastId = toast.loading('Substituindo imagem...');

        try {
          const publicUrl = await processAndUploadSingleProductImage(validated.files[0]);
          setImages((prev) => {
            const newImages = [...prev];
            newImages[index] = publicUrl;
            return newImages;
          });
          toast.success('Imagem substituída!', { id: toastId });
        } catch (error: any) {
          toast.error('Erro na substituição: ' + error.message, { id: toastId });
        } finally {
          setIsSaving(false);
        }
      },
      showFormError
    );
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const setMainImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      return [item, ...updated];
    });
  };

  const handleDragOverArea = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeaveArea = () => {
    setIsDraggingOver(false);
  };

  const handleDropArea = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const incomingFiles = e.dataTransfer.files;
    if (incomingFiles && incomingFiles.length > 0) {
      await uploadForm.validateAndRun(
        { files: Array.from(incomingFiles) },
        async (validated) => {
          const files = validated.files;
          setIsSaving(true);
          const toastId = toast.loading('Otimizando imagens soltas...');
          try {
            const imageFiles = validated.files.filter((file) => file.type.startsWith('image/'));
            const newUrls = await processAndUploadProductImages(imageFiles);
            if (newUrls.length > 0) {
              setImages((prev) => [...prev, ...newUrls]);
              toast.success('Imagens adicionadas com sucesso!', { id: toastId });
            } else {
              toast.dismiss(toastId);
            }
          } catch (error: any) {
            toast.error('Erro no upload das imagens: ' + error.message, { id: toastId });
          } finally {
            setIsSaving(false);
          }
        },
        showFormError
      );
    } else {
      const imageUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('URL');
      if (imageUrl) {
        await imageUrlForm.validateAndRun(
          { url: imageUrl },
          async (validatedUrl) => {
            setIsSaving(true);
            const toastId = toast.loading('Tentando baixar imagem arrastada do site...');
            try {
              const response = await fetch(validatedUrl.url);
              if (!response.ok) throw new Error('Não foi possível baixar a imagem.');
              const blob = await response.blob();
              if (!blob.type.startsWith('image/')) {
                throw new Error('O link não corresponde a uma imagem válida.');
              }
              const file = new File([blob], `dragged-${Date.now()}.webp`, { type: blob.type });
              await uploadForm.validateAndRun(
                { files: [file] },
                async (validatedFiles) => {
                  const publicUrl = await processAndUploadSingleProductImage(
                    validatedFiles.files[0],
                    'dragged'
                  );
                  setImages((prev) => [...prev, publicUrl]);
                  toast.success('Imagem arrastada com sucesso!', { id: toastId });
                },
                showFormError
              );
            } catch (error: any) {
              toast.error(
                "Este site protege as imagens de fora. Para funcionar, clique nela com o botão direito -> 'Copiar imagem' e aperte Ctrl + V aqui!",
                { id: toastId, duration: 8000 }
              );
            } finally {
              setIsSaving(false);
            }
          },
          showFormError
        );
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 text-primary font-bold">
          <Camera className="h-5 w-5" />
          <span>Fotos do Produto ({images.length}/12)</span>
        </div>
        {images.length === 0 && (
          <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-full border border-red-200">
            ⚠ Mínimo 1 foto
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground bg-blue-50/50 text-blue-700 p-3 rounded-2xl border border-blue-100 flex items-center gap-2">
        <Info className="h-4 w-4 shrink-0 text-blue-600" />
        <span>
          <strong>Dica prática:</strong> Você pode arrastar e soltar imagens aqui ou copiar de qualquer
          site (botão direito {'->'} "Copiar imagem") e colar com <strong>Ctrl + V</strong>!
        </span>
      </p>
      <div
        className={`transition-colors rounded-3xl border-2 border-dashed p-4 md:p-8 ${
          isDraggingOver ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
        }`}
        onDragOver={handleDragOverArea}
        onDragLeave={handleDragLeaveArea}
        onDrop={handleDropArea}
      >
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto pb-2 gap-4 scrollbar-thin select-none shrink-0 min-w-0 w-full"
        >
          {images.length < 12 && (
            <label className="h-32 w-32 bg-white border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group shrink-0">
              <Plus className="h-6 w-6 text-primary group-hover:scale-125 transition-transform" />
              <span className="text-xs font-bold text-gray-500">Adicionar</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
            </label>
          )}
          {images.map((url, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedIndex === null || draggedIndex === index) return;
                const newImages = [...images];
                const item = newImages.splice(draggedIndex, 1)[0];
                newImages.splice(index, 0, item);
                setDraggedIndex(index);
                setImages(newImages);
              }}
              onDragEnd={() => setDraggedIndex(null)}
              onClick={() => {
                onOpenImageAction(index);
              }}
              className={`group relative h-32 w-32 rounded-3xl overflow-hidden border-2 cursor-move shrink-0 ${
                index === 0 ? 'border-primary' : 'border-transparent'
              }`}
              title="Arraste para reordenar ou toque para opções"
            >
              <img src={url} alt="Foto" className="object-cover w-full h-full" />
              <div className="absolute inset-0 bg-black/60 opacity-0 pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                <div className="flex gap-2">
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="bg-blue-500 text-white p-2 rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                    title="Substituir Imagem"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleReplaceImage(e, index)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                    title="Apagar Imagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMainImage(index);
                    }}
                    className="bg-white text-[10px] text-black font-bold px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    Definir Capa
                  </button>
                )}
              </div>
              {index === 0 && (
                <Badge className="absolute top-2 left-2 bg-primary pointer-events-none z-20">
                  Capa
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
