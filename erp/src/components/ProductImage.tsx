import React, { useState, useEffect } from 'react';

import { getDerivedImageUrl } from '../utils/imageUrlUtils';

export type ImageSize = 'thumbnail' | 'medium' | 'original';

export interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string | null;
    size?: ImageSize;
    alt?: string;
    fallbackSrc?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({ 
    src, 
    size = 'medium', 
    alt = 'Imagem do produto', 
    fallbackSrc = '/placeholder-image.png', // Fallback caso tudo falhe
    ...props 
}) => {
    const [currentSrc, setCurrentSrc] = useState<string>('');
    const [fallbackLevel, setFallbackLevel] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        if (src) {
            setCurrentSrc(getDerivedImageUrl(src, size));
            setFallbackLevel(0);
            setIsLoading(true);
        } else {
            setCurrentSrc(fallbackSrc);
            setIsLoading(false);
        }
    }, [src, size, fallbackSrc]);

    const handleError = () => {
        if (!src) return;

        // Cascade de Fallback
        // 0: Tentou o size solicitado (ex: thumbnail)
        // 1: Se falhou thumbnail, tenta medium
        // 2: Se falhou medium, tenta original
        // 3: Se falhou original, tenta fallback genérico

        if (fallbackLevel === 0) {
            if (size === 'thumbnail') {
                setCurrentSrc(getDerivedImageUrl(src, 'medium'));
                setFallbackLevel(1);
            } else if (size === 'medium') {
                setCurrentSrc(src); // Tenta original direto
                setFallbackLevel(2);
            } else {
                setCurrentSrc(fallbackSrc);
                setFallbackLevel(3);
            }
        } else if (fallbackLevel === 1) {
            // Estava tentando medium (veio do thumbnail falho), tenta original
            setCurrentSrc(src);
            setFallbackLevel(2);
        } else if (fallbackLevel === 2) {
            // Estava tentando original (veio do medium), desiste e vai pro genérico
            setCurrentSrc(fallbackSrc);
            setFallbackLevel(3);
        }
    };

    const { className, style, ...restProps } = props;

    return (
        <div className={`relative overflow-hidden flex-shrink-0 ${className || ''}`} style={style}>
            {isLoading && currentSrc && (
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-10">
                    <div className="absolute inset-0 animate-pulse bg-slate-200/50 dark:bg-slate-700/50"></div>
                    <i className="bi bi-arrow-repeat animate-spin text-slate-400 dark:text-slate-500 text-lg relative z-20"></i>
                </div>
            )}
            {currentSrc && (
                <img 
                    src={currentSrc} 
                    alt={alt} 
                    onLoad={() => setIsLoading(false)}
                    onError={(e) => {
                        setIsLoading(false);
                        handleError();
                    }}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    {...restProps} 
                />
            )}
            {!currentSrc && (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <i className="bi bi-image text-slate-400 text-lg"></i>
                </div>
            )}
        </div>
    );
};

export default ProductImage;
