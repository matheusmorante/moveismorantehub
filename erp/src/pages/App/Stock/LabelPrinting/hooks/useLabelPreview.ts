import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { LabelConfig } from '../utils/LabelConstants';
import { CategoryType } from './useLabelCategory';
import Product from '../../../../types/product.type';

interface UseLabelPreviewProps {
    config: LabelConfig;
    selectedCategory: CategoryType | null;
    selectedProduct?: Product | null;
}

export const useLabelPreview = ({
    config,
    selectedCategory,
    selectedProduct
}: UseLabelPreviewProps) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const previewScaleRef = useRef<HTMLDivElement>(null);
    const cellInputRef = useRef<HTMLInputElement>(null);

    const [previewZoom, setPreviewZoom] = useState(0.6);
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const [cellImages, setCellImages] = useState<Record<number, string>>({});
    const [activeCellIndex, setActiveCellIndex] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleCellClick = (index: number) => {
        if (config.preset === 'custom' && selectedCategory !== 'posts') {
            setActiveCellIndex(index);
            cellInputRef.current?.click();
        }
    };

    const handleDownloadImage = async () => {
        if (!gridRef.current) return;
        setIsDownloading(true);
        const previewScaleElement = previewScaleRef.current;
        const previousTransform = previewScaleElement?.style.transform;
        try {
            if (previewScaleElement) previewScaleElement.style.transform = 'none';
            const canvas = await html2canvas(gridRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const link = document.createElement('a');
            link.download = `etiquetas-${selectedProduct?.description || 'geral'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Imagem gerada com sucesso!');
        } catch (e) {
            console.error('Erro ao gerar imagem:', e);
            toast.error('Erro ao gerar imagem.');
        } finally {
            if (previewScaleElement) previewScaleElement.style.transform = previousTransform || '';
            setIsDownloading(false);
        }
    };

    return {
        gridRef,
        previewContainerRef,
        previewScaleRef,
        cellInputRef,
        previewZoom,
        setPreviewZoom,
        isPreviewFullscreen,
        setIsPreviewFullscreen,
        cellImages,
        setCellImages,
        activeCellIndex,
        setActiveCellIndex,
        currentPage,
        setCurrentPage,
        isDownloading,
        handleCellClick,
        handleDownloadImage
    };
};
