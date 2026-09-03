import React from 'react';

export interface DrillProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    className?: string;
    fill?: string;
}

/**
 * Ícone de Parafusadeira / Furadeira (Drill) com estilo preenchido (Filled).
 * Renderiza o corpo, mandril, cabo e bateria preenchidos com a cor atual (currentColor).
 */
export const Drill: React.FC<DrillProps> = ({
    size,
    className = '',
    fill = 'currentColor',
    ...props
}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill={fill}
            className={`shrink-0 ${className}`}
            {...props}
        >
            {/* Corpo principal superior e motor da parafusadeira */}
            <path d="M4 2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
            
            {/* Mandril dianteiro */}
            <path d="M15 4h3a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3V4z" />
            
            {/* Broca / Ponta da parafusadeira */}
            <rect x="19" y="5.5" width="4" height="3" rx="1" />
            
            {/* Empunhadura / Cabo ergonômico conectado ao corpo */}
            <path d="M5.5 11h4.8l-1.6 6.8H4L5.5 11z" />
            
            {/* Gatilho da ferramenta */}
            <path d="M10.2 12.8c.8 0 1.3.5 1.3 1.2s-.5 1.2-1.3 1.2h-.6v-2.4h.6z" />
            
            {/* Base / Bateria inferior preenchida */}
            <path d="M2.5 17.8h8.5a1.2 1.2 0 0 1 1.2 1.2v1.5a1.5 1.5 0 0 1-1.5 1.5H3a2 2 0 0 1-2-2 1 1 0 0 1 1-1l.5-.2z" />
        </svg>
    );
};

export default Drill;
