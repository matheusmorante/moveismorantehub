import React from 'react';
import ProductImage from '@/components/ProductImage';
interface CardThumbnailProps {
    readonly images?: string[];
    readonly name?: string;
    readonly title?: string;
}

export const CardThumbnail: React.FC<CardThumbnailProps> = ({ images, name, title }) => {
    return (
        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/60 dark:border-slate-800">
            {images && images.length > 0 && images[0] ? (
                <ProductImage 
                    src={images[0]}
                    alt={name || title || ''} 
                    className="w-full h-full object-cover"
                    size="thumbnail"
                />
            ) : (
                <i className="bi bi-image text-slate-400 text-lg" />
            )}
        </div>
    );
};
