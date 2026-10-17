import React from 'react';

export interface DeliveryFlowIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Ícone composto exclusivo do Fluxo de Entrega do MoranteHub (Web / ERP):
 * Caminhão outline com linha de progresso e 3 marcadores amarelos (#EAB308) na base.
 */
export const DeliveryFlowIcon: React.FC<DeliveryFlowIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  style,
  ...props
}) => {
  const height = Math.round((size * 64) / 80);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 64"
      width={size}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      {...props}
    >
      <path d="M9 25V15a5 5 0 0 1 5-5h29a5 5 0 0 1 5 5v28H9V25Z" />
      <path d="M48 22h10l12 13v8H48" />
      <circle cx={22} cy={44} r={5} />
      <circle cx={58} cy={44} r={5} />
      <path d="M16 21l3 3 5-6" />
      <path d="M28 22h14" />
      <rect x={16} y={28} width={7} height={7} rx={1} />
      <path d="M28 31.5h14" />
      <path d="M13 56h50" />
      {/* 3 pontos circulares sequenciais do fluxo de entrega em amarelo */}
      <circle cx={13} cy={56} r={3} fill="#EAB308" stroke="#EAB308" />
      <circle cx={39} cy={56} r={3} fill="#EAB308" stroke="#EAB308" />
      <circle cx={63} cy={56} r={3} fill="#EAB308" stroke="#EAB308" />
    </svg>
  );
};

export default DeliveryFlowIcon;
