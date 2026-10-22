import React from 'react';

interface ReturnIconProps {
  className?: string;
  white?: boolean;
}

const ReturnIcon = ({ className = '', white = false }: ReturnIconProps) => {
  const hasTextColor = /text-/.test(className);
  const colorClass = white ? 'text-white' : hasTextColor ? '' : 'text-slate-950 dark:text-white';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`${colorClass} ${className}`.trim()}
    >
      <g
        stroke={white ? '#FFFFFF' : 'currentColor'}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 25L32 18L44 25L32 32L20 25Z" />
        <path d="M20 25V40L32 47V32" />
        <path d="M44 25V40L32 47" />
      </g>
      <g
        stroke={white ? '#FFFFFF' : 'currentColor'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.32 49.68A25 25 0 1 0 9.34 21.43" />
        <path d="M8.03 14.76L9.34 21.43L15.30 18.14" />
      </g>
    </svg>
  );
};

export default ReturnIcon;
