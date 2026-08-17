import React from 'react';

export const CatalogDigitalIcon: React.FC<{ className?: string; size?: number; style?: React.CSSProperties }> = ({ 
    className = "w-3.5 h-3.5 text-purple-600 dark:text-purple-400 inline-block shrink-0", 
    size,
    style 
}) => (
    <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={className} 
        style={size ? { width: size, height: size, ...style } : style}
    >
        {/* Catálogo de Produtos: Livro/Brochura Aberta com Itens */}
        <path d="M4 3H11V21H4C2.9 21 2 20.1 2 19V5C2 3.9 2.9 3 4 3Z" opacity="0.3" />
        <path d="M3 4C3 2.9 3.9 2 5 2H19C20.1 2 21 2.9 21 4V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V4ZM5 4V20H11V4H5ZM13 4V20H19V4H13ZM6 6H10V10H6V6ZM14 6H18V14V6ZM14 10H18V12H14V10ZM6 12H10V16H6V12ZM14 14H18V16H14V14Z" />
    </svg>
);

export default CatalogDigitalIcon;
