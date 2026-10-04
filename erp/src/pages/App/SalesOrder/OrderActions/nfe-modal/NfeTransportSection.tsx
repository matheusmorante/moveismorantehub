import type React from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  type DeliveryMethod,
  type FiscalModel,
  type FreightContractResponsible,
  resolveTransport,
  type TransportResponsible,
} from '../../../../../../../shared-utils/fiscalTransportModel';

const TRANSPORT_SCENARIOS: ReadonlyArray<{
  model: FiscalModel;
  delivery: DeliveryMethod;
  on: boolean;
  title: string;
  text: string;
}> = [
  {
    model: '55',
    delivery: 'pickup',
    on: true,
    title: 'NF-e 55 + Retirada',
    text: 'O cliente retira e transporta por meios próprios: transporte ligado com "Próprio cliente" obrigatório (modalidade 4). Própria empresa e transportador ficam indisponíveis.',
  },
  {
    model: '55',
    delivery: 'delivery',
    on: true,
    title: 'NF-e 55 + Entrega',
    text: 'Há circulação até o cliente: transporte ligado. Escolha "Própria empresa" (modalidade 3) ou "Transportador terceirizado" (modalidades 0, 1 ou 2). "Próprio cliente" fica indisponível.',
  },
  {
    model: '65',
    delivery: 'delivery',
    on: true,
    title: 'NFC-e 65 + Entrega',
    text: 'Entrega em domicílio: transporte ligado pela própria empresa (modalidade 3). "Próprio cliente" não se aplica à NFC-e.',
  },
  {
    model: '65',
    delivery: 'pickup',
    on: false,
    title: 'NFC-e 65 + Retirada',
    text: 'Venda presencial no balcão: transporte desligado, modalidade 9 (sem ocorrência de transporte). A SEFAZ rejeita transporte nesse caso (Rejeições 753/754).',
  },
];

export interface ThirdPartyTransporterForm {
  personType: 'PJ' | 'PF';
  cnpjCpf: string;
  name: string;
  ie?: string;
  isIeExempt?: boolean;
  address?: string;
  city?: string;
  uf?: string;
}

interface NfeTransportSectionProps {
  fiscalModel: FiscalModel;
  deliveryMethod: DeliveryMethod;
  hasTransport: boolean;
  onHasTransportChange: (hasTransport: boolean) => void;
  transportResponsible: TransportResponsible | 'NONE';
  onTransportResponsibleChange: (responsible: TransportResponsible) => void;
  freightContractResponsible: FreightContractResponsible;
  onFreightContractResponsibleChange: (contract: FreightContractResponsible) => void;
  thirdPartyTransporter: ThirdPartyTransporterForm;
  onThirdPartyTransporterChange: (
    updater: (prev: ThirdPartyTransporterForm) => ThirdPartyTransporterForm
  ) => void;
  disabled?: boolean;
}

const maskCnpjCpf = (value: string, personType: 'PJ' | 'PF'): string => {
  const digits = value.replace(/\D/g, '').slice(0, personType === 'PJ' ? 14 : 11);
  if (personType === 'PJ') {
    if (digits.length > 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    if (digits.length > 8)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    if (digits.length > 5) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return digits;
  }
  if (digits.length > 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return digits;
};

export const NfeTransportSection: React.FC<NfeTransportSectionProps> = ({
  fiscalModel,
  deliveryMethod,
  hasTransport,
  onHasTransportChange,
  transportResponsible,
  onTransportResponsibleChange,
  freightContractResponsible,
  onFreightContractResponsibleChange,
  thirdPartyTransporter,
  onThirdPartyTransporterChange,
  disabled = false,
}) => {
  // Resolução da regra de negócio centralizada
  const resolved = resolveTransport({
    fiscalModel,
    deliveryMethod,
    hasTransport,
    transportResponsible,
    freightContractResponsible,
  });

  // Abre se transporte estiver ligado; fecha se estiver desligado
  const [isAccordionOpen, setIsAccordionOpen] = useState(resolved.hasTransport);

  useEffect(() => {
    setIsAccordionOpen(resolved.hasTransport);
  }, [resolved.hasTransport]);

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [switchHelpPos, setSwitchHelpPos] = useState<{ top: number; right: number } | null>(null);

  const modalInfo = (() => {
    switch (resolved.modFrete) {
      case '3':
        return {
          title: 'Modalidade Fiscal: 3 — Transporte próprio por conta do remetente',
          tooltip:
            'Os dados da empresa remetente serão utilizados automaticamente no XML quando exigido, sem necessidade de digitação manual.',
          description:
            'Os dados da empresa emitente (CNPJ, Razão Social, Inscrição Estadual e endereço) serão utilizados automaticamente no XML da nota fiscal quando exigido, sem necessidade de digitação manual.',
          sefazRule:
            'Modalidade 3 — Transporte próprio por conta do remetente. Aplicável quando a entrega é realizada com veículos ou equipe próprios da empresa.',
        };
      case '4':
        return {
          title: 'Modalidade Fiscal: 4 — Transporte próprio por conta do destinatário',
          tooltip:
            'Indica transporte realizado diretamente pelo adquirente (retirada). Não gera grupo de transportadora.',
          description:
            'A retirada e o transporte da mercadoria são realizados pelo próprio cliente (destinatário). Não há contratação de transportadora terceirizada.',
          sefazRule:
            'Modalidade 4 — Transporte próprio por conta do destinatário. Exigido pela SEFAZ para retiradas presenciais formalizadas por NF-e modelo 55.',
        };
      case '9':
        return {
          title: 'Modalidade Fiscal: 9 — Sem ocorrência de transporte',
          tooltip:
            'Venda presencial sem frete. Nenhum grupo de transportador é gerado no XML.',
          description:
            'Operação presencial no balcão sem circulação de transporte rodoviário ou entrega associada à nota fiscal.',
          sefazRule:
            'Modalidade 9 — Sem ocorrência de transporte. Exigida pela SEFAZ para NFC-e modelo 65 presencial (Rejeição 753).',
        };
      default:
        return {
          title: `Modalidade Fiscal: ${resolved.modFrete} — Transportador terceirizado`,
          tooltip:
            'Transporte realizado por empresa transportadora terceirizada contratada.',
          description:
            'Frete realizado por transportadora terceirizada, exigindo preenchimento dos dados do transportador (CNPJ/CPF, razão social, IE e endereço).',
          sefazRule: `Modalidade ${resolved.modFrete} — Contratação de frete terceirizado (${
            resolved.freightContractResponsible === 'RECIPIENT'
              ? 'FOB - Destinatário'
              : resolved.freightContractResponsible === 'THIRD_PARTY'
                ? 'Terceiros'
                : 'CIF - Remetente'
          }).`,
        };
    }
  })();

  const isThirdParty = resolved.hasTransport && resolved.transportResponsible === 'THIRD_PARTY';

  const handleToggleHasTransport = (newHasTransport: boolean) => {
    if (disabled || !resolved.allowsEditHasTransport) return;
    onHasTransportChange(newHasTransport);
  };

  const handleResponsibleSelect = (resp: TransportResponsible) => {
    if (disabled) return;
    onTransportResponsibleChange(resp);
  };

  const handleContractSelect = (contract: FreightContractResponsible) => {
    if (disabled) return;
    onFreightContractResponsibleChange(contract);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all dark:border-slate-800 dark:bg-slate-900">
      {/* Cabeçalho da Sanfona / Accordion */}
      <div className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/70 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 transition-colors">
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer select-none"
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
        >
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
            <i className="bi bi-truck text-base" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Transporte
              </span>
            </div>
            {/* Subtítulo do card de transporte com informativo da modalidade fiscal e Saiba Mais */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                Modalidade Fiscal: {resolved.modFreteDescription}
              </span>
              <div className="relative inline-flex items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfoModal(true);
                  }}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  title={modalInfo.tooltip}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 transition-colors cursor-pointer inline-flex items-center gap-0.5"
                >
                  Saiba Mais
                  <i className="bi bi-info-circle text-[10px]" />
                </button>
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-150 text-center leading-relaxed">
                    {modalInfo.tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          {/* Switch de Ligar / Desligar Transporte Associado (à esquerda do chevron/recolher) */}
          <span
            className="inline-flex"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setSwitchHelpPos({ top: rect.top, right: window.innerWidth - rect.left + 10 });
            }}
            onMouseLeave={() => setSwitchHelpPos(null)}
            onClick={(e) => e.stopPropagation()}
          >
          <button
            type="button"
            role="switch"
            aria-checked={resolved.hasTransport}
            aria-label="Transporte associado a esta nota fiscal"
            aria-describedby={switchHelpPos ? 'transport-switch-help' : undefined}
            disabled={disabled || !resolved.allowsEditHasTransport}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleHasTransport(!resolved.hasTransport);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              disabled || !resolved.allowsEditHasTransport
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer'
            } ${resolved.hasTransport ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <span
              className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                resolved.hasTransport ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {!resolved.allowsEditHasTransport && (
                <i className="bi bi-lock-fill text-[8px] text-slate-400" />
              )}
            </span>
          </button>
          </span>
          {switchHelpPos &&
            createPortal(
              <div
                id="transport-switch-help"
                role="tooltip"
                style={{ top: Math.min(switchHelpPos.top, window.innerHeight - 380), right: Math.max(12, Math.min(switchHelpPos.right, window.innerWidth - 360)) }}
                className="fixed z-[1000] w-[380px] max-w-[calc(100vw-24px)] -translate-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl pointer-events-none dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Por que o transporte está {resolved.hasTransport ? 'ligado' : 'desligado'}
                  {!resolved.allowsEditHasTransport ? ' e travado' : ''}?
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  O pedido define a operação (entrega ou retirada) e o modelo fiscal define a regra
                  da SEFAZ. A nota não pode contradizer o pedido; para mudar, altere a forma de
                  entrega no pedido de venda.
                </p>
                <ul className="mt-3 space-y-2">
                  {TRANSPORT_SCENARIOS.map((scenario) => {
                    const isCurrent =
                      scenario.model === fiscalModel && scenario.delivery === deliveryMethod;
                    return (
                      <li
                        key={`${scenario.model}-${scenario.delivery}`}
                        className={`rounded-xl border p-2.5 text-[11px] leading-relaxed ${
                          isCurrent
                            ? 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100'
                            : 'border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">{scenario.title}</span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold">
                            <i className={`bi ${scenario.on ? 'bi-toggle-on' : 'bi-toggle-off'}`} />
                            {scenario.on ? 'Ligado' : 'Desligado'}
                            <i className="bi bi-lock-fill text-[9px]" />
                          </span>
                        </div>
                        <p className="mt-0.5">{scenario.text}</p>
                        {isCurrent && (
                          <span className="mt-1 inline-block text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                            Cenário desta nota
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>,
              document.body
            )}

          {/* Botão/Ícone recolher/expandir (apenas o chevron, sem a palavra Recolher) */}
          <button
            type="button"
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            aria-expanded={isAccordionOpen}
            aria-label={isAccordionOpen ? 'Recolher detalhes de transporte' : 'Expandir detalhes de transporte'}
            className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <i
              className={`bi bi-chevron-down text-xs transition-transform duration-200 block ${
                isAccordionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Conteúdo Expansível */}
      {isAccordionOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 space-y-5">

          {/* QUANDO TRANSPORTE = OFF */}
          {!resolved.hasTransport && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {resolved.modFreteDescription}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {resolved.derivedReason} Nenhum grupo de transportador será gerado no XML da nota fiscal.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">
                modFrete = 9
              </span>
            </div>
          )}

          {/* QUANDO TRANSPORTE = ON */}
          {resolved.hasTransport && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Quem realiza o transporte? */}
              <div>
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Quem realiza o transporte?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Opção 1: Própria empresa */}
                  <button
                    type="button"
                    disabled={disabled || deliveryMethod === 'pickup'}
                    title={
                      deliveryMethod === 'pickup'
                        ? 'Indisponível: pedido registrado como retirada presencial.'
                        : undefined
                    }
                    onClick={() => handleResponsibleSelect('OWN_COMPANY')}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      deliveryMethod === 'pickup' ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      resolved.transportResponsible === 'OWN_COMPANY'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">Própria empresa</span>
                      <i
                        className={`bi ${
                          resolved.transportResponsible === 'OWN_COMPANY'
                            ? 'bi-check-circle-fill text-blue-600 dark:text-blue-400'
                            : 'bi-circle text-slate-400'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Entrega realizada com veículos/equipe próprios
                    </span>
                  </button>

                  {/* Opção 2: Próprio cliente */}
                  <button
                    type="button"
                    disabled={disabled || fiscalModel === '65' || deliveryMethod === 'delivery'}
                    title={
                      deliveryMethod === 'delivery'
                        ? 'Indisponível: pedido registrado como entrega.'
                        : fiscalModel === '65'
                          ? 'Indisponível na NFC-e 65 (Rejeição SEFAZ 753).'
                          : undefined
                    }
                    onClick={() => handleResponsibleSelect('CUSTOMER')}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      fiscalModel === '65' || deliveryMethod === 'delivery'
                        ? 'opacity-40 cursor-not-allowed'
                        : ''
                    } ${
                      resolved.transportResponsible === 'CUSTOMER'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">Próprio cliente</span>
                      <i
                        className={`bi ${
                          resolved.transportResponsible === 'CUSTOMER'
                            ? 'bi-check-circle-fill text-blue-600 dark:text-blue-400'
                            : 'bi-circle text-slate-400'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Cliente retira e transporta por meios próprios
                    </span>
                  </button>

                  {/* Opção 3: Transportador terceirizado */}
                  <button
                    type="button"
                    disabled={disabled || deliveryMethod === 'pickup'}
                    title={
                      deliveryMethod === 'pickup'
                        ? 'Indisponível: pedido registrado como retirada presencial.'
                        : undefined
                    }
                    onClick={() => handleResponsibleSelect('THIRD_PARTY')}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      deliveryMethod === 'pickup' ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      resolved.transportResponsible === 'THIRD_PARTY'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">Transportador terceirizado</span>
                      <i
                        className={`bi ${
                          resolved.transportResponsible === 'THIRD_PARTY'
                            ? 'bi-check-circle-fill text-blue-600 dark:text-blue-400'
                            : 'bi-circle text-slate-400'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Transportadora contratada (CIF, FOB ou Terceiros)
                    </span>
                  </button>
                </div>
              </div>

              {/* Bloco Condicional: Transportador Terceirizado */}
              {isThirdParty && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 dark:border-blue-900/50 dark:bg-blue-950/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Quem contratou o frete? */}
                  <div>
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Responsável pela contratação do frete
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleContractSelect('SENDER')}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                          freightContractResponsible === 'SENDER'
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold dark:bg-blue-950/60 dark:text-blue-200'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <span className="block font-bold">Remetente (CIF)</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          modFrete = 0
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleContractSelect('RECIPIENT')}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                          freightContractResponsible === 'RECIPIENT'
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold dark:bg-blue-950/60 dark:text-blue-200'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <span className="block font-bold">Destinatário (FOB)</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          modFrete = 1
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleContractSelect('THIRD_PARTY')}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                          freightContractResponsible === 'THIRD_PARTY'
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold dark:bg-blue-950/60 dark:text-blue-200'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <span className="block font-bold">Terceiros</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          modFrete = 2
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Dados do Transportador */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
                      Dados do Transportador
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Tipo de Pessoa */}
                      <div className="sm:col-span-2 flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                          <input
                            type="radio"
                            name="transporter-person-type"
                            value="PJ"
                            disabled={disabled}
                            checked={thirdPartyTransporter.personType === 'PJ'}
                            onChange={() =>
                              onThirdPartyTransporterChange((prev) => ({
                                ...prev,
                                personType: 'PJ',
                                cnpjCpf: '',
                              }))
                            }
                            className="accent-blue-600"
                          />
                          Pessoa Jurídica (CNPJ)
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                          <input
                            type="radio"
                            name="transporter-person-type"
                            value="PF"
                            disabled={disabled}
                            checked={thirdPartyTransporter.personType === 'PF'}
                            onChange={() =>
                              onThirdPartyTransporterChange((prev) => ({
                                ...prev,
                                personType: 'PF',
                                cnpjCpf: '',
                              }))
                            }
                            className="accent-blue-600"
                          />
                          Pessoa Física (CPF)
                        </label>
                      </div>

                      {/* CPF / CNPJ */}
                      <div>
                        <label
                          htmlFor="transporter-cnpj-cpf"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          {thirdPartyTransporter.personType === 'PJ' ? 'CNPJ' : 'CPF'} *
                        </label>
                        <input
                          id="transporter-cnpj-cpf"
                          type="text"
                          disabled={disabled}
                          value={thirdPartyTransporter.cnpjCpf}
                          onChange={(e) =>
                            onThirdPartyTransporterChange((prev) => ({
                              ...prev,
                              cnpjCpf: maskCnpjCpf(e.target.value, prev.personType),
                            }))
                          }
                          placeholder={
                            thirdPartyTransporter.personType === 'PJ'
                              ? '00.000.000/0000-00'
                              : '000.000.000-00'
                          }
                          className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
                        />
                      </div>

                      {/* Nome / Razão Social */}
                      <div>
                        <label
                          htmlFor="transporter-name"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Nome / Razão Social *
                        </label>
                        <input
                          id="transporter-name"
                          type="text"
                          disabled={disabled}
                          value={thirdPartyTransporter.name}
                          onChange={(e) =>
                            onThirdPartyTransporterChange((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Ex: Transportadora Rápida Ltda"
                          className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
                        />
                      </div>

                      {/* Inscrição Estadual */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label
                            htmlFor="transporter-ie"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-200"
                          >
                            Inscrição Estadual
                          </label>
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={thirdPartyTransporter.isIeExempt || false}
                              onChange={(e) =>
                                onThirdPartyTransporterChange((prev) => ({
                                  ...prev,
                                  isIeExempt: e.target.checked,
                                  ie: e.target.checked ? '' : prev.ie,
                                }))
                              }
                              className="accent-blue-600"
                            />
                            Isento
                          </label>
                        </div>
                        <input
                          id="transporter-ie"
                          type="text"
                          disabled={disabled || thirdPartyTransporter.isIeExempt}
                          value={thirdPartyTransporter.ie || ''}
                          onChange={(e) =>
                            onThirdPartyTransporterChange((prev) => ({
                              ...prev,
                              ie: e.target.value.replace(/\D/g, ''),
                            }))
                          }
                          placeholder={
                            thirdPartyTransporter.isIeExempt ? 'Isento de IE' : 'Somente números'
                          }
                          className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:border-slate-200"
                        />
                      </div>

                      {/* Endereço */}
                      <div>
                        <label
                          htmlFor="transporter-address"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Endereço Completo
                        </label>
                        <input
                          id="transporter-address"
                          type="text"
                          disabled={disabled}
                          value={thirdPartyTransporter.address || ''}
                          onChange={(e) =>
                            onThirdPartyTransporterChange((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                          placeholder="Logradouro, número, bairro"
                          className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
                        />
                      </div>

                      {/* Município */}
                      <div>
                        <label
                          htmlFor="transporter-city"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Município
                        </label>
                        <input
                          id="transporter-city"
                          type="text"
                          disabled={disabled}
                          value={thirdPartyTransporter.city || ''}
                          onChange={(e) =>
                            onThirdPartyTransporterChange((prev) => ({
                              ...prev,
                              city: e.target.value,
                            }))
                          }
                          placeholder="Ex: Curitiba"
                          className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
                        />
                      </div>

                      {/* UF */}
                      <div>
                        <label
                          htmlFor="transporter-uf"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          UF
                        </label>
                        <input
                          id="transporter-uf"
                          type="text"
                          maxLength={2}
                          disabled={disabled}
                          value={thirdPartyTransporter.uf || ''}
                          onChange={(e) =>
                            onThirdPartyTransporterChange((prev) => ({
                              ...prev,
                              uf: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="PR"
                          className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs font-mono uppercase outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Explicativo da Modalidade Fiscal */}
      {showInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fiscal-transport-modal-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <i className="bi bi-truck text-base" />
                </div>
                <div>
                  <h3
                    id="fiscal-transport-modal-title"
                    className="text-sm font-bold text-slate-800 dark:text-slate-100"
                  >
                    Transporte na Nota Fiscal
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Regra fiscal aplicada
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
                aria-label="Fechar"
              >
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 block mb-1">
                  Modalidade Fiscal de Frete
                </span>
                <p className="text-xs font-bold text-blue-950 dark:text-blue-200">
                  {modalInfo.title}
                </p>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed">
                <p>{modalInfo.description}</p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <strong className="text-slate-700 dark:text-slate-200 block mb-1">
                    Diretriz SEFAZ:
                  </strong>
                  {modalInfo.sefazRule}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
