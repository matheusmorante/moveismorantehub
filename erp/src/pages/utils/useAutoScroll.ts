import { useRef } from 'react';

interface AutoScrollOptions {
    threshold?: number;
    maxSpeed?: number;
    direction?: 'horizontal' | 'vertical' | 'both';
    enabled?: boolean;
}

/**
 * useAutoScroll Hook (Desativado globalmente)
 */
export const useAutoScroll = (
    _containerRef: React.RefObject<HTMLElement | null>,
    _options: AutoScrollOptions = {}
) => {
    // Retorno sem anexar listeners nem animar scroll
    return;
};
