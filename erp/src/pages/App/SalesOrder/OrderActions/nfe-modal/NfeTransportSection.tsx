import type React from 'react';
import { useState, useEffect } from 'react';
import {
  type DeliveryMethod,
  type FiscalModel,
  type FreightContractResponsible,
  resolveTransport,
  type TransportResponsible,
} from '../../../../../../../shared-utils/fiscalTransportModel';
import { ThirdPartyTransporterFormFields } from './ThirdPartyTransporterFormFields';
import { TransportScenarioInfoModal } from './TransportScenarioInfoModal';

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

export const NfeTransportSection: React.FC<NfeTransportSectionProps> = ({
  fiscalModel,
  deliveryMethod,
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

  const modalInfo = (() => {
    switch (resolved.modFrete) {
      case '3':
        return {
          title: 'Modalidade Fiscal: 3 — Transporte próprio por conta do remetente',
          tooltip:
            'A entrega é realizada pela própria empresa. Não é necessário cadastrar uma transportadora terceirizada.',
          description:
            'A mercadoria é entregue pela própria empresa remetente; não preencha dados de transportadora terceirizada.',
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
          tooltip: 'Venda presencial sem frete. Nenhum grupo de transportador é gerado no XML.',
          description:
            'Operação presencial no balcão sem circulação de transporte rodoviário ou entrega associada à nota fiscal.',
          sefazRule:
            'Modalidade 9 — Sem ocorrência de transporte. Exigida pela SEFAZ para NFC-e modelo 65 presencial (Rejeição 753).',
        };
      default:
        return {
          title: `Modalidade Fiscal: ${resolved.modFrete} — Transportador terceirizado`,
          tooltip: 'Transporte realizado por empresa transportadora terceirizada contratada.',
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

  const handleResponsibleSelect = (resp: TransportResponsible) => {
    if (disabled) return;
    onTransportResponsibleChange(resp);
  };

  const handleContractSelect = (contract: FreightContractResponsible) => {
    if (disabled) return;
    onFreightContractResponsibleChange(contract);
  };

  if (!resolved.hasTransport) {
    return (
      <section
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <i className="bi bi-truck" />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Pedido sem transporte</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Modalidade: {resolved.modFreteDescription}
          </p>
        </div>
      </section>
    );
  }

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
          {/* Botão/Ícone recolher/expandir (apenas o chevron, sem a palavra Recolher) */}
          <button
            type="button"
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            aria-expanded={isAccordionOpen}
            aria-label={
              isAccordionOpen
                ? 'Recolher detalhes de transporte'
                : 'Expandir detalhes de transporte'
            }
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
                  {/* Bloco Condicional: Transportador Terceirizado */}
                  <ThirdPartyTransporterFormFields
                    thirdPartyTransporter={thirdPartyTransporter}
                    onThirdPartyTransporterChange={onThirdPartyTransporterChange}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Explicativo da Modalidade Fiscal */}
      <TransportScenarioInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title={modalInfo.title}
        description={modalInfo.description}
        sefazRule={modalInfo.sefazRule}
      />
    </section>
  );
};
