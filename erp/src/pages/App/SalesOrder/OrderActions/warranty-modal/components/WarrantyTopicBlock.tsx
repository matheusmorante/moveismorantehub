import React from 'react';
import type { WarrantySection } from '@/pages/utils/warranty';

interface WarrantyTopicBlockProps {
  section: WarrantySection;
}

/**
 * Destaca termos jurídicos ou de salvados no texto com contraste adequado.
 */
function highlightKeywords(text: string) {
  const parts = text.split(/(SALVADOS|Salvados)/g);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (part === 'SALVADOS' || part === 'Salvados') {
      return (
        <strong
          key={idx}
          className="font-black text-[#032354] bg-[#feb004]/30 px-1 py-0.5 rounded border border-[#feb004]/60 mx-0.5"
        >
          {part}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Componente modular para renderização de uma cláusula/tópico numerado do Termo de Garantia.
 * Aplica os princípios de responsabilidade única (SRP) e DRY (Don't Repeat Yourself).
 */
export const WarrantyTopicBlock: React.FC<WarrantyTopicBlockProps> = ({ section }) => {
  return (
    <div className="space-y-2.5">
      {/* Cabeçalho do Tópico: Badge Circular Estilizado e Título */}
      <div className="flex items-start gap-3 mb-2">
        <span className="w-6 h-6 rounded-full bg-[#032354] ring-2 ring-[#feb004] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          {section.number}
        </span>
        <h3 className="flex-1 font-black text-[#032354] text-xs uppercase tracking-wide leading-relaxed">
          {section.title}
        </h3>
      </div>

      {/* Texto introdutório do tópico */}
      {section.text && <p className="pl-9 text-slate-600 leading-relaxed mb-2.5">{highlightKeywords(section.text)}</p>}

      {/* Bloco de alerta em destaque (ex.: Salvados ou Cuidados Especiais) */}
      {section.alert && (
        <div className="pl-9 my-3.5">
          <div className="bg-amber-50/95 border-l-4 border-[#feb004] border-y border-r border-amber-300/80 rounded-r-xl p-3.5 sm:p-4 text-amber-950 shadow-sm">
            <p className="font-bold text-amber-900 flex items-center gap-2 text-xs leading-snug">
              <i className="bi bi-tag-fill text-[#032354] text-sm shrink-0" />
              <span>{section.alert.title}</span>
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
              {highlightKeywords(section.alert.text)}
            </p>
          </div>
        </div>
      )}

      {/* Subparágrafos detalhados */}
      {section.paragraphs && section.paragraphs.length > 0 && (
        <div className="pl-9 space-y-2 text-slate-600 leading-relaxed">
          {section.paragraphs.map((p, pIdx) => (
            <p key={`p-${section.number}-${pIdx}`}>
              {p.subtitle && (
                <strong className="text-slate-800">
                  {highlightKeywords(p.subtitle)}{' '}
                </strong>
              )}
              {highlightKeywords(p.text)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
