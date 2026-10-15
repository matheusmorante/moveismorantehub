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
  fallbackSrc = '',
  className,
  style,
  onError,
  ...restProps
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [fallbackLevel, setFallbackLevel] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (src) {
      setCurrentSrc(getDerivedImageUrl(src, size));
      setFallbackLevel(0);
      setIsLoading(true);
    } else if (fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setFallbackLevel(3);
      setIsLoading(true);
    } else {
      setCurrentSrc('');
      setFallbackLevel(3);
      setIsLoading(false);
    }
  }, [src, size, fallbackSrc]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!src) {
      setIsLoading(false);
      setCurrentSrc('');
      onError?.(e);
      return;
    }

    // Cascade de Fallback
    // 0: Tentou o size solicitado (ex: thumbnail)
    // 1: Se falhou thumbnail, tenta medium
    // 2: Se falhou medium, tenta original
    // 3: Se falhou original, tenta fallback genérico (ou encerra com onError)

    if (fallbackLevel === 0) {
      if (size === 'thumbnail') {
        const mediumUrl = getDerivedImageUrl(src, 'medium');
        if (mediumUrl !== currentSrc) {
          setCurrentSrc(mediumUrl);
          setFallbackLevel(1);
          setIsLoading(true);
          return;
        }
      }
      if (size === 'thumbnail' || size === 'medium') {
        if (src !== currentSrc) {
          setCurrentSrc(src); // Tenta original direto
          setFallbackLevel(2);
          setIsLoading(true);
          return;
        }
      }
      if (fallbackSrc && fallbackSrc !== currentSrc) {
        setCurrentSrc(fallbackSrc);
        setFallbackLevel(3);
        setIsLoading(true);
      } else {
        setCurrentSrc('');
        setFallbackLevel(3);
        setIsLoading(false);
        onError?.(e);
      }
    } else if (fallbackLevel === 1) {
      // Estava tentando medium (veio do thumbnail falho), tenta original
      if (src !== currentSrc) {
        setCurrentSrc(src);
        setFallbackLevel(2);
        setIsLoading(true);
      } else if (fallbackSrc && fallbackSrc !== currentSrc) {
        setCurrentSrc(fallbackSrc);
        setFallbackLevel(3);
        setIsLoading(true);
      } else {
        setCurrentSrc('');
        setFallbackLevel(3);
        setIsLoading(false);
        onError?.(e);
      }
    } else if (fallbackLevel === 2) {
      // Estava tentando original (veio do medium), desiste e vai pro fallbackSrc ou encerra
      if (fallbackSrc && fallbackSrc !== currentSrc) {
        setCurrentSrc(fallbackSrc);
        setFallbackLevel(3);
        setIsLoading(true);
      } else {
        setCurrentSrc('');
        setFallbackLevel(3);
        setIsLoading(false);
        onError?.(e);
      }
    } else {
      setCurrentSrc('');
      setIsLoading(false);
      onError?.(e);
    }
  };

  return (
    <div className={`relative overflow-hidden flex-shrink-0 ${className || ''}`} style={style}>
      {isLoading && currentSrc && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-10">
          <div className="absolute inset-0 animate-pulse bg-slate-200/50 dark:bg-slate-700/50"></div>
          <i className="bi bi-arrow-repeat animate-spin text-slate-400 dark:text-slate-500 text-lg relative z-20"></i>
        </div>
      )}
      {currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          onError={handleError}
          loading="lazy"
          className="w-full h-full object-cover"
          {...restProps}
        />
      ) : (
        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <i className="bi bi-image text-slate-400 text-lg"></i>
        </div>
      )}
    </div>
  );
};

export default ProductImage;
