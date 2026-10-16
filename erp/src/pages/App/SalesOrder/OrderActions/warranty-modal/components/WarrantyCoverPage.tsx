import React from 'react';
import {
  WARRANTY_SLOGAN_LINE1,
  WARRANTY_SLOGAN_LINE2,
  WARRANTY_SLOGAN_FULL,
} from '@/pages/utils/warranty/warrantyLegalContent';
import {
  WarrantyTopLeftFoliage,
  WarrantyTopRightFoliage,
  WarrantyBottomLeftWaveFoliage,
} from './WarrantyCornerFoliage';
import { WarrantyDigitalSignatureStamp } from './WarrantyDigitalSignatureStamp';

interface WarrantyCoverPageProps {
  sheetWidth: string;
  pageRef: (el: HTMLElement | null) => void;
  orderCode?: string;
  purchaseDate?: string;
  sha256?: string;
}

export const WarrantyCoverPage: React.FC<WarrantyCoverPageProps> = ({
  sheetWidth,
  pageRef,
  orderCode,
  purchaseDate,
  sha256,
}) => {
  return (
    <article
      ref={pageRef}
      data-page="1"
      style={{ width: sheetWidth }}
      className="bg-white text-slate-800 shadow-2xl ring-1 ring-black/10 rounded-sm relative overflow-hidden transition-all duration-150 flex flex-col justify-between shrink-0 min-h-[1120px]"
    >
      {/* Folhagens decorativas no topo */}
      <WarrantyTopLeftFoliage />
      <WarrantyTopRightFoliage />

      {/* Conteúdo Central da Capa */}
      <div className="flex-1 px-4 sm:px-12 pt-8 sm:pt-12 pb-2 z-10 flex flex-col items-center justify-center my-auto w-full">
        {/* Logo Oficial Móveis Morante (Bem Maior) */}
        <div className="h-36 w-36 sm:h-48 sm:w-48 shrink-0 flex items-center justify-center">
          <img
            src="/images/logo-morante.png"
            alt="Móveis Morante"
            className="h-full w-full object-contain drop-shadow-lg"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/images/logo-morante.svg';
            }}
          />
        </div>

        {/* Linha Superior: — TERMO DE — (Bem Maior com linhas largas) */}
        <span className="sr-only">TERMO DE GARANTIA</span>
        <div className="flex items-center justify-center gap-4 sm:gap-8 mt-6 sm:mt-10 w-full max-w-4xl px-2">
          <div className="h-[3px] sm:h-[4px] flex-1 max-w-[140px] sm:max-w-[240px] bg-[#feb004] rounded-full shadow-sm" />
          <span
            className="font-serif tracking-[0.25em] sm:tracking-[0.35em] text-[#032354] font-black text-2xl sm:text-5xl uppercase shrink-0"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            TERMO DE
          </span>
          <div className="h-[3px] sm:h-[4px] flex-1 max-w-[140px] sm:max-w-[240px] bg-[#feb004] rounded-full shadow-sm" />
        </div>

        {/* Título Principal em Destaque Gigante: GARANTIA (ocupando quase toda a largura da capa) */}
        <h1
          className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-serif font-black tracking-[0.06em] sm:tracking-[0.1em] text-[#032354] uppercase text-center leading-none mt-2 sm:mt-4 w-full select-text drop-shadow-sm px-2"
          style={{ fontFamily: '"Playfair Display", "Times New Roman", Georgia, serif' }}
        >
          GARANTIA
        </h1>

        {/* Barra Destaque Amarelo Ouro Larga */}
        <div className="h-2 sm:h-3 w-5/6 max-w-2xl bg-[#feb004] rounded-full mt-4 sm:mt-6 mb-8 sm:mb-10 mx-auto shadow-md" />

        {/* Slogan Oficial Caligráfico / Escrito à Mão (No lugar dos rótulos, bem maior) */}
        <div className="my-2 sm:my-4 flex flex-col items-center justify-center text-center">
          <span className="sr-only">{WARRANTY_SLOGAN_FULL}</span>
          <p
            className="text-3xl sm:text-5xl md:text-6xl text-[#032354] font-bold italic tracking-wide leading-tight select-text"
            style={{
              fontFamily: '"Caveat", "Dancing Script", cursive, "Brush Script MT", sans-serif',
            }}
          >
            {WARRANTY_SLOGAN_LINE1}
          </p>
          <p
            className="text-3xl sm:text-5xl md:text-6xl text-[#b45309] font-black italic tracking-wide leading-tight select-text mt-1 sm:mt-2"
            style={{
              fontFamily: '"Caveat", "Dancing Script", cursive, "Brush Script MT", sans-serif',
            }}
          >
            {WARRANTY_SLOGAN_LINE2}
          </p>
          {/* Friso Ouro Centralizado */}
          <div className="h-1.5 w-24 sm:w-40 bg-[#feb004] rounded-full mt-3 sm:mt-5 shadow-sm" />
        </div>

        {/* Carimbo Oficial do Certificado Digital / Assinatura Digital ICP-Brasil */}
        <WarrantyDigitalSignatureStamp
          orderCode={orderCode}
          purchaseDate={purchaseDate}
          sha256={sha256}
        />
      </div>

      {/* Rodapé Artístico Curvado com Ondas Orgânicas, Folhas e Slogan Caligráfico */}
      <div className="relative mt-auto z-10 overflow-hidden">
        <WarrantyBottomLeftWaveFoliage />

        {/* Onda Artística em Dupla Camada */}
        <div className="relative w-full">
          <svg
            className="w-full h-28 sm:h-36 block text-[#032354]"
            viewBox="0 0 1200 240"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="waveGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e59b04" />
                <stop offset="50%" stopColor="#feb004" />
                <stop offset="100%" stopColor="#ffd369" />
              </linearGradient>
              <linearGradient id="waveNavyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#032354" />
                <stop offset="100%" stopColor="#001226" />
              </linearGradient>
            </defs>
            <path
              d="M 0,90 C 220,160 480,30 760,110 C 940,160 1080,110 1200,60 L 1200,240 L 0,240 Z"
              fill="url(#waveGoldGrad)"
            />
            <path
              d="M 0,115 C 240,175 490,55 770,130 C 950,175 1085,130 1200,85 L 1200,240 L 0,240 Z"
              fill="url(#waveNavyGrad)"
            />
          </svg>

          {/* Conteúdo Central Sobreposto na Onda */}
          <div className="absolute inset-x-0 bottom-4 sm:bottom-6 flex flex-col items-center justify-center text-center z-30 px-6">
            <div className="h-1 w-12 sm:w-16 bg-[#feb004] rounded-full mb-2 shadow-sm" />
            <p className="text-xs sm:text-sm text-white font-bold tracking-wider uppercase drop-shadow-sm">
              Móveis Morante Comércio de Móveis Ltda
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-300 font-normal tracking-wider uppercase mt-1">
              CNPJ: 44.512.248/0001-07 • WhatsApp: (41) 99749-3547 • Colombo - PR
            </p>
          </div>
        </div>
      </div>
    </article>
  );
};
