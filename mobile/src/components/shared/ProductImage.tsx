import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ImageSourcePropType, View, StyleSheet } from 'react-native';
import { getDerivedImageUrl, ImageSize } from '../../utils/imageUrlUtils';

export type { ImageSize };

export interface ProductImageProps extends Omit<ImageProps, 'source'> {
    src?: string | null;
    size?: ImageSize;
    fallbackSrc?: ImageSourcePropType; // No mobile, fallback pode ser require()
}

// Fallback genérico para o app mobile
const defaultFallback = require('../../../assets/icon.png'); // Ou qualquer ícone padrão

export const ProductImage: React.FC<ProductImageProps> = ({ 
    src, 
    size = 'medium', 
    fallbackSrc = defaultFallback, 
    style,
    ...props 
}) => {
    const [currentSrc, setCurrentSrc] = useState<string>('');
    const [fallbackLevel, setFallbackLevel] = useState<number>(0);
    const [hasError, setHasError] = useState<boolean>(false);

    useEffect(() => {
        if (src) {
            setCurrentSrc(getDerivedImageUrl(src, size));
            setFallbackLevel(0);
            setHasError(false);
        } else {
            setHasError(true);
        }
    }, [src, size]);

    const handleError = () => {
        if (!src) return;

        if (fallbackLevel === 0) {
            if (size === 'thumbnail') {
                setCurrentSrc(getDerivedImageUrl(src, 'medium'));
                setFallbackLevel(1);
            } else if (size === 'medium') {
                setCurrentSrc(src);
                setFallbackLevel(2);
            } else {
                setHasError(true);
            }
        } else if (fallbackLevel === 1) {
            setCurrentSrc(src);
            setFallbackLevel(2);
        } else if (fallbackLevel === 2) {
            setHasError(true);
        }
    };

    if (hasError || !currentSrc) {
        return (
            <Image 
                source={fallbackSrc as any} 
                style={[styles.fallback, style]} 
                {...props} 
            />
        );
    }

    return (
        <Image 
            source={{ uri: currentSrc }} 
            onError={handleError}
            style={style}
            {...props} 
        />
    );
};

const styles = StyleSheet.create({
    fallback: {
        opacity: 0.5,
        backgroundColor: '#f0f0f0'
    }
});

export default ProductImage;
