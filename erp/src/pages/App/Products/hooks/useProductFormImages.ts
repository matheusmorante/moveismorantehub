import { useState } from 'react';
import Product from '../../../types/product.type';
import { toast } from 'react-toastify';
import { compressImageToFile } from '@/pages/utils/imageUtils';
import { uploadFile } from '@/pages/utils/storageService';
import { MAX_PARENT_PRODUCT_IMAGES } from '@/pages/utils/productImageLimits';

export function useProductFormImages(
    formData: Partial<Product>,
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
    setLoading: (loading: boolean) => void
) {
    const [isDraggingPhoto, setIsDraggingPhoto] = useState(0);
    const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent | { files: File[] }) => {
        let files: File[] = [];
        if ('files' in e && Array.isArray((e as any).files)) {
            files = (e as any).files;
        } else if ('target' in e && (e.target as HTMLInputElement).files) {
            files = Array.from((e.target as HTMLInputElement).files || []);
        } else if ('dataTransfer' in e && e.dataTransfer.files) {
            files = Array.from(e.dataTransfer.files);
        }

        if (files.length === 0) return;

        const MAX_PHOTOS = MAX_PARENT_PRODUCT_IMAGES;
        const currentCount = (formData.images || []).length;

        if (currentCount >= MAX_PHOTOS) {
            toast.warning(`Limite máximo de ${MAX_PHOTOS} fotos atingido!`);
            return;
        }

        const availableSlots = MAX_PHOTOS - currentCount;
        let filesToProcess = files;

        if (files.length > availableSlots) {
            toast.info(`Apenas as primeiras ${availableSlots} foto(s) serão adicionadas (limite máximo de ${MAX_PHOTOS} fotos).`);
            filesToProcess = files.slice(0, availableSlots);
        }

        setLoading(true);
        setIsDraggingPhoto(filesToProcess.length);
        try {
            const uploadPromises = filesToProcess.map(async (file) => {
                const compressed = await compressImageToFile(file, { maxMB: 0.1, maxWidth: 1200 });
                const fileExt = file.name.split('.').pop() || 'jpg';
                const fileName = `${crypto.randomUUID()}_${Date.now()}.${fileExt}`;
                const path = `products/${fileName}`;
                return uploadFile(compressed, path);
            });

            const urls = await Promise.all(uploadPromises);
            setFormData((prev: Partial<Product>) => ({
                ...prev,
                images: [...(prev.images || []), ...urls]
            }));
            toast.success(`${urls.length} foto(s) otimizada(s) e enviada(s) com sucesso!`);
        } catch (error) {
            toast.error('Erro no upload e otimização das imagens.');
            console.error(error);
        } finally {
            setLoading(false);
            setIsDraggingPhoto(0);
        }
    };

    const removePhoto = (url: string) => {
        setRemovingPhoto(url);
        setFormData((prev: Partial<Product>) => ({
            ...prev,
            images: prev.images?.filter((i: string) => i !== url)
        }));
        setRemovingPhoto(null);
        toast.info('Foto removida localmente');
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
            const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                e.preventDefault();
                await handleFileChange({ files: imageFiles } as any);
            }
        }
    };

    return {
        isDraggingPhoto,
        setIsDraggingPhoto,
        removingPhoto,
        handleFileChange,
        removePhoto,
        handlePaste
    };
}
