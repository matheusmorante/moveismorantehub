import React from 'react';
/** Displays only the existing card marks from the registered payment artwork. */
export function PaymentBrands() {
  return <div aria-label="Visa, Mastercard, Elo e Hipercard" style={{ width: '100%', aspectRatio: '815 / 175',
    overflow: 'hidden', position: 'relative', flexShrink: 0, background: '#ffffff', borderRadius: 5 }}>
    <img src="/images/installment-badge-10x-transparent.png" alt="Visa, Mastercard, Elo e Hipercard" draggable={false}
      style={{ position: 'absolute', maxWidth: 'none', width: '217.67%', height: '506.86%', left: '-108.59%', top: '-240%' }} />
  </div>;
}
