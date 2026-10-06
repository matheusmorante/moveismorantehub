import React from 'react';
import { formatCurrency } from '@/pages/utils/formatters';
import type { ParsedFiscalDetails } from '../../types/fiscalDocuments.types';
import {
  formatFiscalTaxId,
  getFreightDetailedDescription,
  getFreightModeLabel,
  getFreightResponsibleLabel,
  normalizeFiscalTransport,
} from '../../utils/fiscalPresentationHelpers';
import { ReadOnlyField } from './ReadOnlyField';

interface IssuedFiscalDocumentTransportTabProps {
  parsed: ParsedFiscalDetails | null;
}

export function IssuedFiscalDocumentTransportTab({
  parsed,
}: IssuedFiscalDocumentTransportTabProps) {
  const transport = normalizeFiscalTransport(parsed?.transport);

  if (
    !transport ||
    (!transport.modFrete &&
      !transport.carrierName &&
      !transport.vehiclePlate &&
      !transport.volumeQuantity)
  ) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <i className="bi bi-truck" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Sem informações de transporte
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Este documento fiscal não possui registros de frete ou movimentação de carga.
        </p>
      </div>
    );
  }

  const responsible = getFreightResponsibleLabel(transport.modFrete);
  const modeLabel = getFreightModeLabel(transport.modFrete);
  const detailedDesc = getFreightDetailedDescription(transport.modFrete);
  const freightValue = transport.freightValue && Number(transport.freightValue) > 0 ? transport.freightValue : null;

  const hasCarrier = Boolean(
    transport.carrierName ||
      transport.carrierTaxId ||
      transport.carrierStateRegistration ||
      transport.carrierAddress ||
      transport.carrierCity ||
      transport.carrierState
  );

  const hasVehicle = Boolean(transport.vehiclePlate || transport.vehicleState || transport.vehicleRntc);

  const hasVolumes = Boolean(
    transport.volumeQuantity ||
      transport.volumeSpecies ||
      transport.volumeBrand ||
      transport.volumeNumber ||
      transport.netWeight ||
      transport.grossWeight
  );

  const hasAdditionalInfo = hasCarrier || hasVehicle || hasVolumes || freightValue;

  return (
    <div className="space-y-4">
      {/* Card em destaque da Modalidade / Responsável pelo Transporte */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 p-4 shadow-sm dark:border-blue-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-md shadow-blue-500/20 dark:bg-blue-500">
              <i className="bi bi-truck" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Responsável pelo transporte
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
                {responsible}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                Modalidade: {modeLabel}
              </p>
              {detailedDesc && (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {detailedDesc}
                </p>
              )}
            </div>
          </div>

          {freightValue && (
            <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-left dark:border-blue-900/50 dark:bg-slate-950 sm:text-right">
              <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">
                Valor do frete
              </span>
              <div className="text-base font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(Number(freightValue))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações da Transportadora (somente se houver) */}
      {hasCarrier && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <i className="bi bi-person-badge text-blue-600 dark:text-blue-400" />
            Dados da transportadora
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {transport.carrierName && (
              <ReadOnlyField
                label="Razão social / Nome"
                value={transport.carrierName}
                className="sm:col-span-2"
              />
            )}
            {transport.carrierTaxId && (
              <ReadOnlyField
                label="CPF / CNPJ"
                value={formatFiscalTaxId(transport.carrierTaxId)}
              />
            )}
            {transport.carrierStateRegistration && (
              <ReadOnlyField
                label="Inscrição estadual"
                value={transport.carrierStateRegistration}
              />
            )}
            {transport.carrierAddress && (
              <ReadOnlyField
                label="Endereço"
                value={transport.carrierAddress}
                className="sm:col-span-2"
              />
            )}
            {(transport.carrierCity || transport.carrierState) && (
              <ReadOnlyField
                label="Município / UF"
                value={[transport.carrierCity, transport.carrierState]
                  .filter(Boolean)
                  .join(' / ')}
              />
            )}
          </div>
        </div>
      )}

      {/* Veículo de Transporte (somente se houver) */}
      {hasVehicle && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <i className="bi bi-car-front text-blue-600 dark:text-blue-400" />
            Veículo de transporte
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {transport.vehiclePlate && (
              <ReadOnlyField label="Placa do veículo" value={transport.vehiclePlate} />
            )}
            {transport.vehicleState && (
              <ReadOnlyField label="UF da placa" value={transport.vehicleState} />
            )}
            {transport.vehicleRntc && (
              <ReadOnlyField label="RNTC" value={transport.vehicleRntc} />
            )}
          </div>
        </div>
      )}

      {/* Volumes e Carga (somente se houver) */}
      {hasVolumes && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <i className="bi bi-boxes text-blue-600 dark:text-blue-400" />
            Volumes e pesos
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {transport.volumeQuantity && (
              <ReadOnlyField
                label="Quantidade de volumes"
                value={`${transport.volumeQuantity} ${transport.volumeSpecies || 'volume(s)'}`.trim()}
              />
            )}
            {transport.volumeBrand && (
              <ReadOnlyField label="Marca dos volumes" value={transport.volumeBrand} />
            )}
            {transport.volumeNumber && (
              <ReadOnlyField label="Numeração" value={transport.volumeNumber} />
            )}
            {transport.grossWeight && (
              <ReadOnlyField
                label="Peso bruto"
                value={`${transport.grossWeight} kg`}
              />
            )}
            {transport.netWeight && (
              <ReadOnlyField
                label="Peso líquido"
                value={`${transport.netWeight} kg`}
              />
            )}
          </div>
        </div>
      )}

      {/* Mensagem suave caso não haja outros dados cadastrados */}
      {!hasAdditionalInfo && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-400">
          <i className="bi bi-info-circle text-blue-600 dark:text-blue-400" />
          <span>Sem informações adicionais de transportador, veículo ou volumes para esta operação.</span>
        </div>
      )}
    </div>
  );
}
