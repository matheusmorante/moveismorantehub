import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
    anchorRef: React.RefObject<HTMLElement>;
    children: React.ReactNode;
    isOpen: boolean;
    className?: string;
    onClose?: () => void;
}

const DropdownPortal: React.FC<DropdownPortalProps> = ({ anchorRef, children, isOpen, className = "" }) => {
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const portalRef = useRef<HTMLDivElement>(null);

    const updateCoords = useCallback(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    }, [anchorRef]);

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            // Capture phase handles scroll in any parent
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isOpen, updateCoords]);

    if (!isOpen) return null;

    return createPortal(
        <div 
            ref={portalRef}
            className={`fixed z-[99999999] pointer-events-auto ${className}`}
            style={{
                top: coords.top + 4,
                left: coords.left,
                width: coords.width,
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

export default DropdownPortal;
