import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export interface MobileDrillProps {
  size?: number;
  color?: string;
}

/**
 * Ícone de Parafusadeira / Furadeira (Drill) com estilo preenchido (Filled) para React Native.
 * Idêntico ao ícone Drill do ERP (@/components/shared/DrillIcon).
 */
export const MobileDrill: React.FC<MobileDrillProps> = ({
  size = 12,
  color = '#ffffff',
}) => {
  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
    >
      {/* Corpo principal superior e motor da parafusadeira */}
      <Path d="M4 2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill={color} />
      
      {/* Mandril dianteiro */}
      <Path d="M15 4h3a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3V4z" fill={color} />
      
      {/* Broca / Ponta da parafusadeira */}
      <Rect x="19" y="5.5" width="4" height="3" rx="1" fill={color} />
      
      {/* Empunhadura / Cabo ergonômico conectado ao corpo */}
      <Path d="M5.5 11h4.8l-1.6 6.8H4L5.5 11z" fill={color} />
      
      {/* Gatilho da ferramenta */}
      <Path d="M10.2 12.8c.8 0 1.3.5 1.3 1.2s-.5 1.2-1.3 1.2h-.6v-2.4h.6z" fill={color} />
      
      {/* Base / Bateria inferior preenchida */}
      <Path d="M2.5 17.8h8.5a1.2 1.2 0 0 1 1.2 1.2v1.5a1.5 1.5 0 0 1-1.5 1.5H3a2 2 0 0 1-2-2 1 1 0 0 1 1-1l.5-.2z" fill={color} />
    </Svg>
  );
};

export default MobileDrill;
