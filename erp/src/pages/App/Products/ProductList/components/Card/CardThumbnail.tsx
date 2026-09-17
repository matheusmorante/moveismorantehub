import React from 'react';

interface CardThumbnailProps {
    readonly images?: string[];
    readonly name?: string;
    readonly title?: string;
}

export const CardThumbnail: React.FC<CardThumbnailProps> = ({ images, name, title }) => {
    return (
        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/60 dark:border-slate-800">
            {images && images.length > 0 && images[0] ? (
                <img 
                    src={images[0]}
                    alt={name || title || ''} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        if ((e.target as HTMLElement).parentElement) {
                            (e.target as HTMLElement).parentElement!.innerHTML = '<i class="bi bi-image text-slate-400 text-lg"></i>';
                        }
                    }}
                />
            ) : (
                <i className="bi bi-image text-slate-400 text-lg" />
            )}
        </div>
    );
};
