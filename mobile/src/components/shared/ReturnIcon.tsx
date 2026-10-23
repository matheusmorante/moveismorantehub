import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ReturnIconProps {
  size?: number;
  color?: string;
}

const ReturnIcon: React.FC<ReturnIconProps> = ({ size = 20, color = '#ffffff' }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    accessibilityElementsHidden
    importantForAccessibility="no"
  >
    <Path
      d="M20 25L32 18L44 25L32 32L20 25Z"
      stroke={color}
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20 25V40L32 47V32"
      stroke={color}
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M44 25V40L32 47"
      stroke={color}
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14.32 49.68A25 25 0 1 0 9.34 21.43"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.03 14.76L9.34 21.43L15.30 18.14"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default ReturnIcon;
