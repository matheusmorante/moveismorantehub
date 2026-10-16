import React from 'react';

/**
 * Elementos botânicos decorativos da capa do Termo de Garantia.
 * Renderizados a partir dos vetores de alta fidelidade extraídos do asset oficial,
 * nas cores institucionais Azul Marinho Noturno (#032354) e Amarelo Ouro (#feb004).
 */

export const WarrantyTopLeftFoliage: React.FC = () => (
  <div className="absolute top-0 left-0 pointer-events-none select-none z-0">
    <img
      src="/images/warranty/foliage-top-left.png"
      alt=""
      className="w-52 sm:w-68 h-auto object-contain pointer-events-none select-none drop-shadow-sm"
      loading="eager"
    />
  </div>
);

export const WarrantyTopRightFoliage: React.FC = () => (
  <div className="absolute top-0 right-0 pointer-events-none select-none z-0">
    <img
      src="/images/warranty/foliage-top-right.png"
      alt=""
      className="w-52 sm:w-68 h-auto object-contain pointer-events-none select-none drop-shadow-sm"
      loading="eager"
    />
  </div>
);

export const WarrantyBottomLeftWaveFoliage: React.FC = () => (
  <div className="absolute bottom-0 left-0 sm:left-2 z-20 pointer-events-none select-none">
    <img
      src="/images/warranty/foliage-bottom-wave.png"
      alt=""
      className="w-32 sm:w-44 h-auto object-contain pointer-events-none select-none drop-shadow-md"
      loading="eager"
    />
  </div>
);
