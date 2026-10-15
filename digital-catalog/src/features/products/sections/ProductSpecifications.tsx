'use client';

import React from 'react';
import { Layers } from 'lucide-react';

interface ProductSpecificationsProps {
  displayWidth: any;
  displayDepth: any;
  displayHeight: any;
  displayThickness?: any;
  product: any;
  technicalSpecs: any[];
}

export function ProductSpecifications({
  displayWidth,
  displayDepth,
  displayHeight,
  displayThickness,
  product,
  technicalSpecs,
}: ProductSpecificationsProps) {
  const dimensionItems: Array<{
    id: string;
    label: string;
    value: any;
    icon: React.ReactNode;
  }> = [];

  if (displayWidth) {
    dimensionItems.push({
      id: 'largura',
      label: 'Largura Total',
      value: displayWidth,
      icon: (
        <svg
          viewBox="0 0 40 24"
          className="w-10 h-6 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="2" y1="12" x2="38" y2="12" />
          <polyline points="8,6 2,12 8,18" />
          <polyline points="32,6 38,12 32,18" />
        </svg>
      ),
    });
  }

  if (displayDepth) {
    dimensionItems.push({
      id: 'profundidade',
      label: product?.depth_use_length ? 'Compr. Total' : 'Profund. Total',
      value: displayDepth,
      icon: (
        <svg
          viewBox="0 0 40 24"
          className="w-10 h-6 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="4" y1="20" x2="36" y2="4" />
          <polyline points="4,13 4,20 11,20" />
          <polyline points="29,4 36,4 36,11" />
        </svg>
      ),
    });
  }

  if (displayHeight) {
    dimensionItems.push({
      id: 'altura',
      label: 'Altura Total',
      value: displayHeight,
      icon: (
        <svg
          viewBox="0 0 24 40"
          className="w-6 h-10 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="12" y1="2" x2="12" y2="38" />
          <polyline points="6,8 12,2 18,8" />
          <polyline points="6,32 12,38 18,32" />
        </svg>
      ),
    });
  }

  if (displayThickness) {
    dimensionItems.push({
      id: 'espessura',
      label: 'Espessura',
      value: displayThickness,
      icon: (
        <svg
          viewBox="0 0 32 32"
          className="w-8 h-8 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="10" width="22" height="12" rx="2" />
          <line x1="5" y1="16" x2="27" y2="16" strokeDasharray="2 2" />
          <line x1="2" y1="6" x2="2" y2="26" />
          <polyline points="0,9 2,6 4,9" />
          <polyline points="0,23 2,26 4,23" />
        </svg>
      ),
    });
  }

  if (technicalSpecs.length === 0 && dimensionItems.length === 0) {
    return null;
  }

  const gridColsClass =
    dimensionItems.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : dimensionItems.length === 3
        ? 'grid-cols-3'
        : dimensionItems.length === 2
          ? 'grid-cols-2'
          : 'grid-cols-1';

  return (
    <div className="lg:col-span-5 space-y-6">
      {/* TABELA DE MEDIDAS TOTAIS COM ÍCONES */}
      {dimensionItems.length > 0 && (
        <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-xs uppercase tracking-wider border-b pb-2">
            <svg
              className="h-3.5 w-3.5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3h18M3 21h18M3 3v18M21 3v18" />
            </svg>
            <h3>Medidas Totais</h3>
          </div>
          <div className={`grid divide-x divide-gray-100 ${gridColsClass}`}>
            {dimensionItems.map((dim) => (
              <div key={dim.id} className="flex flex-col items-center gap-2 px-3 py-2 text-center">
                <div className="flex items-center justify-center h-10">{dim.icon}</div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {dim.label}
                </span>
                <span className="text-sm font-black text-primary">
                  {String(dim.value).replace(/\s*cm$/i, '')}{' '}
                  <span className="text-xs font-semibold text-gray-500">cm</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARACTERÍSTICAS */}
      {technicalSpecs.length > 0 && (
        <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-xs uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <h3>Características</h3>
          </div>
          <dl className="space-y-1.5 border-t pt-2 text-[11px] leading-relaxed">
            {technicalSpecs.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium text-gray-700">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
