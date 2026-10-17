import type { PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';

export interface PriceLabelLayerDefinition {
  key: NonNullable<PriceLabelLayerKey>;
  label: string;
  icon: string;
  isVisible: boolean;
  toggleVisibility: () => void;
  pos: { x: number; y: number };
  resetPos: () => void;
  desc: string;
}

export interface BuildPriceLabelLayersParams {
  showTitle: boolean;
  setShowTitle: (val: boolean) => void;
  titlePos: { x: number; y: number };
  setTitlePos: (pos: { x: number; y: number }) => void;
  setTitleRotation: (rot: number) => void;

  showDe: boolean;
  setShowDe: (val: boolean) => void;
  dePos: { x: number; y: number };
  setDePos: (pos: { x: number; y: number }) => void;
  setDeRotation: (rot: number) => void;

  showNormalPrice: boolean;
  setShowNormalPrice: (val: boolean) => void;
  normalPricePos: { x: number; y: number };
  setNormalPricePos: (pos: { x: number; y: number }) => void;
  setNormalPriceRotation: (rot: number) => void;

  showPor: boolean;
  setShowPor: (val: boolean) => void;
  porPos: { x: number; y: number };
  setPorPos: (pos: { x: number; y: number }) => void;
  setPorRotation: (rot: number) => void;

  showCurrency: boolean;
  setShowCurrency: (val: boolean) => void;
  currencyPos: { x: number; y: number };
  setCurrencyPos: (pos: { x: number; y: number }) => void;
  setCurrencyRotation: (rot: number) => void;

  showPromoPrice: boolean;
  setShowPromoPrice: (val: boolean) => void;
  promoPricePos: { x: number; y: number };
  setPromoPricePos: (pos: { x: number; y: number }) => void;
  setPromoPriceRotation: (rot: number) => void;

  showCents: boolean;
  setShowCents: (val: boolean) => void;
  centsPos: { x: number; y: number };
  setCentsPos: (pos: { x: number; y: number }) => void;
  setCentsRotation: (rot: number) => void;

  showInstallments: boolean;
  setShowInstallments: (val: boolean) => void;
  installmentsPos: { x: number; y: number };
  setInstallmentsPos: (pos: { x: number; y: number }) => void;
  setInstallmentsRotation: (rot: number) => void;
}

export function buildPriceLabelLayers(params: BuildPriceLabelLayersParams): PriceLabelLayerDefinition[] {
  return [
    {
      key: 'title',
      label: 'NOME DO PRODUTO',
      icon: 'bi-fonts',
      isVisible: params.showTitle,
      toggleVisibility: () => params.setShowTitle(!params.showTitle),
      pos: params.titlePos,
      resetPos: () => {
        params.setTitlePos({ x: 0, y: 0 });
        params.setTitleRotation(0);
      },
      desc: 'Cabeçalho superior',
    },
    {
      key: 'deText',
      label: 'TEXTO "DE"',
      icon: 'bi-type',
      isVisible: params.showDe,
      toggleVisibility: () => params.setShowDe(!params.showDe),
      pos: params.dePos,
      resetPos: () => {
        params.setDePos({ x: 0, y: 0 });
        params.setDeRotation(0);
      },
      desc: 'Prefixo do preço original',
    },
    {
      key: 'normalPrice',
      label: 'PREÇO ORIGINAL (DE:)',
      icon: 'bi-type-strikethrough',
      isVisible: params.showNormalPrice,
      toggleVisibility: () => params.setShowNormalPrice(!params.showNormalPrice),
      pos: params.normalPricePos,
      resetPos: () => {
        params.setNormalPricePos({ x: 0, y: 0 });
        params.setNormalPriceRotation(0);
      },
      desc: 'Valor riscado horizontalmente',
    },
    {
      key: 'porText',
      label: 'TEXTO "POR:"',
      icon: 'bi-type',
      isVisible: params.showPor,
      toggleVisibility: () => params.setShowPor(!params.showPor),
      pos: params.porPos,
      resetPos: () => {
        params.setPorPos({ x: 0, y: 0 });
        params.setPorRotation(0);
      },
      desc: 'Sufixo do preço original',
    },
    {
      key: 'currencySymbol',
      label: 'SÍMBOLO MOEDA (R$)',
      icon: 'bi-currency-dollar',
      isVisible: params.showCurrency,
      toggleVisibility: () => params.setShowCurrency(!params.showCurrency),
      pos: params.currencyPos,
      resetPos: () => {
        params.setCurrencyPos({ x: 0, y: 0 });
        params.setCurrencyRotation(0);
      },
      desc: 'Símbolo R$ à esquerda',
    },
    {
      key: 'promoPrice',
      label: 'PREÇO PRINCIPAL (POR:)',
      icon: 'bi-tag-fill',
      isVisible: params.showPromoPrice,
      toggleVisibility: () => params.setShowPromoPrice(!params.showPromoPrice),
      pos: params.promoPricePos,
      resetPos: () => {
        params.setPromoPricePos({ x: 0, y: 0 });
        params.setPromoPriceRotation(0);
      },
      desc: 'Valor em destaque grande',
    },
    {
      key: 'cents',
      label: 'CENTAVOS (,00)',
      icon: 'bi-superscript',
      isVisible: params.showCents,
      toggleVisibility: () => params.setShowCents(!params.showCents),
      pos: params.centsPos,
      resetPos: () => {
        params.setCentsPos({ x: 0, y: 0 });
        params.setCentsRotation(0);
      },
      desc: 'Dígitos centavos à direita',
    },
    {
      key: 'installments',
      label: 'PARCELAMENTO',
      icon: 'bi-credit-card-2-front-fill',
      isVisible: params.showInstallments,
      toggleVisibility: () => params.setShowInstallments(!params.showInstallments),
      pos: params.installmentsPos,
      resetPos: () => {
        params.setInstallmentsPos({ x: 0, y: 0 });
        params.setInstallmentsRotation(0);
      },
      desc: 'Condições de pagamento',
    },
    {
      key: 'background',
      label: 'FUNDO DA ETIQUETA',
      icon: 'bi-palette-fill',
      isVisible: true,
      toggleVisibility: () => {},
      pos: { x: 0, y: 0 },
      resetPos: () => {},
      desc: 'Cor de fundo da etiqueta',
    },
  ];
}
