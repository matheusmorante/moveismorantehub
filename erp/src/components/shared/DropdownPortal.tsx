import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
    anchorRef: React.RefObject<HTMLElement>;
    children: React.ReactNode;
    isOpen: boolean;
    className?: string;
    onClose?: () => void;
}

const DropdownPortal: React.FC<DropdownPortalProps> = ({ 
    anchorRef, 
    children, 
    isOpen, 
    className = "",
    onClose 
}) => {
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const portalRef = useRef<HTMLDivElement>(null);

    const updateCoords = useCallback(() => {
        if (anchorRef?.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    }, [anchorRef]);

    useLayoutEffect(() => {
        if (isOpen) {
            updateCoords();
        } else {
            setCoords(null);
        }
    }, [isOpen, updateCoords]);

    useEffect(() => {
        if (!isOpen) return;

        updateCoords();
        window.addEventListener('scroll', updateCoords, true);
        window.addEventListener('resize', updateCoords);

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (portalRef.current && portalRef.current.contains(target)) return;
            if (anchorRef?.current && anchorRef.current.contains(target)) return;
            onClose?.();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, updateCoords, onClose, anchorRef]);

    // Se o portal não estiver aberto ou as coordenadas ainda não foram lidas, NÃO renderiza nada no DOM
    if (!isOpen || !coords) {
        return null;
    }

    // Se o className define min-w ou w específico (ex: menu de opções de 180px), alinha o menu à direita da âncora se necessário
    const isExplicitWidth = className.includes('min-w-') || className.includes('w-');
    const calculatedWidth = isExplicitWidth ? undefined : Math.max(coords.width, 380);
    const maxViewportWidth = typeof window !== 'undefined' ? window.innerWidth - 32 : 380;
    const finalWidth = calculatedWidth ? Math.min(calculatedWidth, maxViewportWidth) : undefined;

    // Se for menu explícito e estiver perto da borda direita da tela, alinha pela borda direita da âncora
    let adjustedLeft = coords.left;
    if (typeof window !== 'undefined') {
        const estimatedWidth = finalWidth || 200;
        if (coords.left + estimatedWidth > window.innerWidth - 16) {
            adjustedLeft = Math.max(16, window.innerWidth - estimatedWidth - 16);
        }
    }

    return createPortal(
        <div 
            ref={portalRef}
            className={`fixed z-[99999999] pointer-events-auto ${className}`}
            style={{
                top: coords.top + 4,
                left: adjustedLeft,
                ...(finalWidth ? { width: finalWidth, minWidth: coords.width } : {}),
                maxHeight: `calc(100vh - ${coords.top + 12}px)`,
                overflowY: 'auto',
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {children}
        </div>,
        document.body
    );
};

export { DropdownPortal };
export default DropdownPortal;
