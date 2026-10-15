'use client';

import React, { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { getDerivedImageUrl, ImageSize } from '@/lib/utils/imageUrlUtils';
import { ImageIcon } from 'lucide-react';

export type { ImageSize };

export interface CatalogProductImageProps extends Omit<ImageProps, 'src'> {
  src?: string | null;
  size?: ImageSize;
  fallbackSrc?: string;
}

export function CatalogProductImage({
  src,
  size = 'medium',
  alt = 'Imagem do produto',
  fallbackSrc = '',
  className,
  onError,
  ...props
}: CatalogProductImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [fallbackLevel, setFallbackLevel] = useState<number>(0);
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  useEffect(() => {
    if (src) {
      setCurrentSrc(getDerivedImageUrl(src, size));
      setFallbackLevel(0);
      setHasFailed(false);
    } else if (fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setFallbackLevel(3);
      setHasFailed(false);
    } else {
      setCurrentSrc('');
      setFallbackLevel(3);
      setHasFailed(true);
    }
  }, [src, size, fallbackSrc]);

  const handleError = (e: any) => {
    if (!src) {
      setHasFailed(true);
      setCurrentSrc('');
      onError?.(e);
      return;
    }

    // Cascade de Fallback:
    // 0: Tentou thumbnail -> tenta medium
    // 1: Tentou medium -> tenta original
    // 2: Tentou original -> desiste e mostra fallback
    if (fallbackLevel === 0) {
      if (size === 'thumbnail') {
        const mediumUrl = getDerivedImageUrl(src, 'medium');
        if (mediumUrl !== currentSrc) {
          setCurrentSrc(mediumUrl);
          setFallbackLevel(1);
          return;
        }
      }
      if (src !== currentSrc) {
        setCurrentSrc(src);
        setFallbackLevel(2);
        return;
      }
      if (fallbackSrc && fallbackSrc !== currentSrc) {
        setCurrentSrc(fallbackSrc);
        setFallbackLevel(3);
      } else {
        setHasFailed(true);
        setCurrentSrc('');
        onError?.(e);
      }
    } else if (fallbackLevel === 1) {
      if (src !== currentSrc) {
        setCurrentSrc(src);
        setFallbackLevel(2);
      } else if (fallbackSrc && fallbackSrc !== currentSrc) {
        setCurrentSrc(fallbackSrc);
        setFallbackLevel(3);
      } else {
        setHasFailed(true);
        setCurrentSrc('');
        onError?.(e);
      }
    } else if (fallbackLevel === 2) {
      if (fallbackSrc && fallbackSrc !== currentSrc) {
        setCurrentSrc(fallbackSrc);
        setFallbackLevel(3);
      } else {
        setHasFailed(true);
        setCurrentSrc('');
        onError?.(e);
      }
    } else {
      setHasFailed(true);
      setCurrentSrc('');
      onError?.(e);
    }
  };

  if (hasFailed || !currentSrc) {
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400">
        <ImageIcon className="w-8 h-8 opacity-40" />
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}

export default CatalogProductImage;
