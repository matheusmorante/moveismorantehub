import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export interface DeliveryFlowIconProps {
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Ícone composto exclusivo do Fluxo de Entrega do MoranteHub:
 * Caminhão outline com linha de progresso e 3 marcadores amarelos (#EAB308) na base.
 */
export const DeliveryFlowIcon: React.FC<DeliveryFlowIconProps> = ({
  size = 24,
  color = '#ffffff',
  style,
}) => {
  const height = Math.round((size * 64) / 80);

  return (
    <Svg
      viewBox="0 0 80 64"
      width={size}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <Path
        d="M9 25V15a5 5 0 0 1 5-5h29a5 5 0 0 1 5 5v28H9V25Z"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M48 22h10l12 13v8H48"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={22}
        cy={44}
        r={5}
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={58}
        cy={44}
        r={5}
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 21l3 3 5-6"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M28 22h14"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x={16}
        y={28}
        width={7}
        height={7}
        rx={1}
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M28 31.5h14"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 56h50"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 3 pontos circulares sequenciais do fluxo de entrega em amarelo */}
      <Circle cx={13} cy={56} r={3} fill="#EAB308" stroke="#EAB308" />
      <Circle cx={39} cy={56} r={3} fill="#EAB308" stroke="#EAB308" />
      <Circle cx={63} cy={56} r={3} fill="#EAB308" stroke="#EAB308" />
    </Svg>
  );
};

export default DeliveryFlowIcon;
