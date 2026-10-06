import React from 'react';
import type { ParsedFiscalDetails } from '../../types/fiscalDocuments.types';
import {
  formatFiscalPhone,
  formatFiscalPostalCode,
  formatFiscalTaxId,
  getStateRegistrationIndicatorLabel,
} from '../../utils/fiscalPresentationHelpers';

interface IssuedFiscalDocumentCustomerTabProps {
  parsed: ParsedFiscalDetails | null;
}

export function IssuedFiscalDocumentCustomerTab({
  parsed,
}: IssuedFiscalDocumentCustomerTabProps) {
  const customer = parsed?.recipient;

  if (!customer || (!customer.name && !customer.taxId)) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <i className="bi bi-person-slash" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Consumidor não identificado
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Operação emitida sem identificação do destinatário (venda rápida ao consumidor final).
        </p>
      </div>
    );
  }

  const mainAddressParts = [
    customer.street && customer.number ? `${customer.street}, ${customer.number}` : customer.street,
    customer.complement,
    customer.district,
    customer.municipality && customer.state ? `${customer.municipality} - ${customer.state}` : customer.municipality,
    customer.postalCode ? `CEP ${formatFiscalPostalCode(customer.postalCode)}` : '',
  ].filter(Boolean);

  const deliveryAddress = customer.deliveryAddress;
  const deliveryAddressParts = deliveryAddress
    ? [
        deliveryAddress.street && deliveryAddress.number
          ? `${deliveryAddress.street}, ${deliveryAddress.number}`
          : deliveryAddress.street,
        deliveryAddress.complement,
        deliveryAddress.district,
        deliveryAddress.municipality && deliveryAddress.state
          ? `${deliveryAddress.municipality} - ${deliveryAddress.state}`
          : deliveryAddress.municipality,
        deliveryAddress.postalCode ? `CEP ${formatFiscalPostalCode(deliveryAddress.postalCode)}` : '',
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-4">
      {/* Bloco 1: Identificação do Cliente */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <i className="bi bi-person text-blue-600 dark:text-blue-400" />
          Identificação do destinatário
        </h4>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Nome / Razão social
            </span>
            <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {customer.name || 'Consumidor não identificado'}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
              CPF / CNPJ
            </span>
            <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatFiscalTaxId(customer.taxId)}
            </div>
          </div>

          {customer.stateRegistration && (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Inscrição estadual
              </span>
              <div className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                {customer.stateRegistration}
              </div>
            </div>
          )}

          {customer.stateRegistrationIndicator && (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Indicador de IE
              </span>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {getStateRegistrationIndicatorLabel(customer.stateRegistrationIndicator)}
              </div>
            </div>
          )}

          {customer.phone && (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Telefone
              </span>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatFiscalPhone(customer.phone)}
              </div>
            </div>
          )}

          {customer.email && (
            <div className="sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                E-mail
              </span>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {customer.email}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bloco 2: Endereço do Destinatário */}
      {mainAddressParts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <i className="bi bi-geo-alt text-blue-600 dark:text-blue-400" />
            Endereço cadastral
          </h4>
          <div className="space-y-1 text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
            <div>
              {[customer.street, customer.number].filter(Boolean).join(', ')}
              {customer.complement ? `, ${customer.complement}` : ''}
            </div>
            {customer.district && <div className="text-slate-600 dark:text-slate-400">{customer.district}</div>}
            {(customer.municipality || customer.state) && (
              <div>
                {[customer.municipality, customer.state].filter(Boolean).join(' - ')}
              </div>
            )}
            {customer.postalCode && (
              <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                CEP {formatFiscalPostalCode(customer.postalCode)}
              </div>
            )}
          </div>
          {customer.municipalityCode && (
            <span className="mt-2 inline-block font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Código IBGE do município: {customer.municipalityCode}
            </span>
          )}
        </div>
      )}

      {/* Bloco 3: Local de Entrega Diferenciado (quando presente) */}
      {deliveryAddress && deliveryAddressParts.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm dark:border-blue-900/40 dark:bg-slate-900 sm:p-5">
          <div className="flex items-center gap-2">
            <i className="bi bi-truck text-base text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Local de entrega (endereço diferenciado)
            </h4>
          </div>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
            A entrega das mercadorias foi designada para um endereço diferente do cadastro do cliente:
          </p>
          <div className="mt-2 rounded-xl bg-white p-3 text-sm font-semibold text-slate-800 shadow-sm dark:bg-slate-950 dark:text-slate-200 space-y-1">
            <div>
              {[deliveryAddress.street, deliveryAddress.number].filter(Boolean).join(', ')}
              {deliveryAddress.complement ? `, ${deliveryAddress.complement}` : ''}
            </div>
            {deliveryAddress.district && <div className="text-slate-600 dark:text-slate-400">{deliveryAddress.district}</div>}
            {(deliveryAddress.municipality || deliveryAddress.state) && (
              <div>
                {[deliveryAddress.municipality, deliveryAddress.state].filter(Boolean).join(' - ')}
              </div>
            )}
            {deliveryAddress.postalCode && (
              <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                CEP {formatFiscalPostalCode(deliveryAddress.postalCode)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
