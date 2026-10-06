import type { ParsedFiscalTransport } from '../types/fiscalDocuments.types';

/**
 * Mapeamento e Apresentação Humanizada de Códigos e Metadados Fiscais (NF-e/NFC-e).
 *
 * Responsabilidade única: Traduzir dados técnicos de banco, API e XML para
 * nomenclatura legível, humana e acessível na interface de usuário (UI/UX).
 */

export function getFreightModeLabel(modFrete?: string | number | null): string {
  const code = String(modFrete ?? '').trim();
  switch (code) {
    case '0':
      return 'Contratação do frete por conta do remetente (CIF)';
    case '1':
      return 'Contratação do frete por conta do destinatário (FOB)';
    case '2':
      return 'Contratação do frete por conta de terceiros';
    case '3':
      return 'Transporte próprio por conta do remetente';
    case '4':
      return 'Transporte próprio por conta do destinatário';
    case '9':
      return 'Sem ocorrência de transporte';
    default:
      return code ? `Modalidade ${code}` : 'Não informado';
  }
}

export function getFreightResponsibleLabel(modFrete?: string | number | null): string {
  const code = String(modFrete ?? '').trim();
  switch (code) {
    case '0':
      return 'Frete por conta do remetente (CIF)';
    case '1':
      return 'Frete por conta do destinatário (FOB)';
    case '2':
      return 'Transportador terceiro contratado';
    case '3':
      return 'Transporte próprio da empresa';
    case '4':
      return 'Retirada pelo próprio cliente';
    case '9':
      return 'Sem transporte nesta operação';
    default:
      return 'Responsável não informado';
  }
}

export function getFreightDetailedDescription(modFrete?: string | number | null): string {
  const code = String(modFrete ?? '').trim();
  switch (code) {
    case '0':
      return 'Transporte comercial terceirizado pago e contratado pela empresa emitente.';
    case '1':
      return 'Transporte comercial terceirizado pago e contratado pelo destinatário/cliente.';
    case '2':
      return 'Transporte contratado e custeado por um terceiro interveniente na operação.';
    case '3':
      return 'Entrega realizada com veículo e equipe própria da empresa emitente.';
    case '4':
      return 'Mercadoria retirada diretamente no estabelecimento pelo cliente.';
    case '9':
      return 'Operação presencial ou sem necessidade de movimentação de carga/frete.';
    default:
      return '';
  }
}

export function getEnvironmentLabel(environment?: string | number | null): string {
  const env = Number(environment);
  if (env === 1) return 'Produção';
  if (env === 2) return 'Homologação';
  return 'Não identificado';
}

export function getOperationTypeLabel(tpNF?: string | number | null): string {
  const code = String(tpNF ?? '').trim();
  if (code === '0') return 'Entrada';
  if (code === '1') return 'Saída';
  return '—';
}

export function getDestinationLabel(idDest?: string | number | null): string {
  const code = String(idDest ?? '').trim();
  switch (code) {
    case '1':
      return 'Operação interna (mesmo estado)';
    case '2':
      return 'Operação interestadual';
    case '3':
      return 'Operação com o exterior';
    default:
      return '—';
  }
}

export function getFinalConsumerLabel(indFinal?: string | number | null): string {
  const code = String(indFinal ?? '').trim();
  if (code === '1') return 'Sim';
  if (code === '0') return 'Não';
  return '—';
}

export function getPresenceLabel(indPres?: string | number | null): string {
  const code = String(indPres ?? '').trim();
  const presenceMap: Record<string, string> = {
    '0': 'Não se aplica',
    '1': 'Presencial',
    '2': 'Não presencial — internet',
    '3': 'Não presencial — teleatendimento',
    '4': 'Entrega em domicílio',
    '5': 'Presencial fora do estabelecimento',
    '9': 'Não presencial — outros',
  };
  return presenceMap[code] || '—';
}

export function getStateRegistrationIndicatorLabel(indicator?: string | number | null): string {
  const code = String(indicator ?? '').trim();
  switch (code) {
    case '1':
      return 'Contribuinte do ICMS';
    case '2':
      return 'Contribuinte isento';
    case '9':
      return 'Não contribuinte';
    default:
      return code || '—';
  }
}

export function getItemOriginLabel(orig?: string | number | null): string {
  const code = String(orig ?? '').trim();
  const origins: Record<string, string> = {
    '0': 'Nacional',
    '1': 'Estrangeira — Importação direta',
    '2': 'Estrangeira — Mercado interno',
    '3': 'Nacional — Importação > 40%',
    '4': 'Nacional — Processo Produtivo Básico',
    '5': 'Nacional — Importação ≤ 40%',
    '6': 'Estrangeira — Importação sem similar',
    '7': 'Estrangeira — Mercado interno sem similar',
    '8': 'Nacional — Importação > 70%',
  };
  return origins[code] || (code ? `Origem ${code}` : '');
}

export function getPaymentMethodLabel(tPag?: string | number | null): string {
  const code = String(tPag ?? '').trim();
  const paymentMethods: Record<string, string> = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de crédito',
    '04': 'Cartão de débito',
    '05': 'Crédito loja',
    '10': 'Vale alimentação',
    '11': 'Vale refeição',
    '12': 'Vale presente',
    '13': 'Vale combustível',
    '14': 'Duplicata mercantil',
    '15': 'Boleto bancário',
    '16': 'Depósito bancário',
    '17': 'PIX',
    '18': 'Transferência bancária',
    '19': 'Programa de fidelidade',
    '90': 'Sem pagamento',
    '99': 'Outros',
  };
  return paymentMethods[code] || code || 'Pagamento';
}

export function getPaymentIndicatorLabel(indPag?: string | number | null): string {
  const code = String(indPag ?? '').trim();
  if (code === '0') return 'Pagamento à vista';
  if (code === '1') return 'Pagamento a prazo';
  return '';
}

export function getFiscalModelLabel(model?: string | null): string {
  const code = String(model ?? '').trim();
  if (code === '65') return 'NFC-e · modelo 65';
  return 'NF-e · modelo 55';
}

export function formatFiscalTaxId(taxId?: string | null): string {
  if (!taxId) return '—';
  const clean = taxId.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return taxId;
}

export function formatFiscalPostalCode(postalCode?: string | null): string {
  if (!postalCode) return '—';
  const digits = postalCode.replace(/\D/g, '');
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : postalCode;
}

export function formatFiscalPhone(phone?: string | null): string {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function normalizeFiscalTransport(
  raw?: ParsedFiscalTransport | string[] | null
): ParsedFiscalTransport | null {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    const normalized: ParsedFiscalTransport = {};
    for (const line of raw) {
      const separator = line.indexOf(':');
      if (separator === -1) continue;
      const key = line.slice(0, separator).trim();
      const val = line.slice(separator + 1).trim();
      if (!val) continue;

      if (key === 'modFrete') normalized.modFrete = val;
      else if (key === 'xNome') normalized.carrierName = val;
      else if (key === 'CNPJ' || key === 'CPF') normalized.carrierTaxId = val;
      else if (key === 'IE') normalized.carrierStateRegistration = val;
      else if (key === 'placa') normalized.vehiclePlate = val;
      else if (key === 'UF') normalized.vehicleState = val;
      else if (key === 'qVol') normalized.volumeQuantity = val;
      else if (key === 'esp') normalized.volumeSpecies = val;
      else if (key === 'pesoL') normalized.netWeight = val;
      else if (key === 'pesoB') normalized.grossWeight = val;
    }
    const hasAnyField = Object.values(normalized).some((v) => Boolean(v));
    return hasAnyField ? normalized : null;
  }

  const hasAnyField = Object.values(raw).some((v) => Boolean(v));
  return hasAnyField ? raw : null;
}

export function getFiscalTransportSummary(
  raw?: ParsedFiscalTransport | string[] | null
): string {
  const transport = normalizeFiscalTransport(raw);
  if (!transport) return 'Não informado';

  const parts: string[] = [];
  const responsible = getFreightResponsibleLabel(transport.modFrete);
  if (responsible && responsible !== 'Responsável não informado') {
    parts.push(responsible);
  }

  if (transport.carrierName) {
    parts.push(transport.carrierName);
  }
  if (transport.vehiclePlate) {
    parts.push(`Placa ${transport.vehiclePlate}${transport.vehicleState ? `/${transport.vehicleState}` : ''}`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Não informado';
}

export function getInvoicePurposeLabel(purpose?: string | number | null): string {
  const code = String(purpose ?? '').trim();
  switch (code) {
    case '1':
      return 'Venda normal';
    case '2':
      return 'NF-e complementar';
    case '3':
      return 'NF-e de ajuste';
    case '4':
      return 'Devolução de mercadoria';
    default:
      return code ? `Finalidade ${code}` : 'Normal';
  }
}

export function getCardBrandLabel(brand?: string | number | null): string {
  const code = String(brand ?? '').trim();
  const brands: Record<string, string> = {
    '01': 'Visa',
    '02': 'Mastercard',
    '03': 'American Express',
    '04': 'Sorocred',
    '05': 'Diners Club',
    '06': 'Elo',
    '07': 'Hipercard',
    '08': 'Aura',
    '09': 'Cabal',
    '99': 'Outros',
  };
  return brands[code] || (code ? `Bandeira ${code}` : '');
}

export function getCardIntegrationLabel(integration?: string | number | null): string {
  const code = String(integration ?? '').trim();
  if (code === '1') return 'TEF / Integrado';
  if (code === '2') return 'Maquininha (POS manual)';
  return '';
}

export function formatFiscalDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

export function getFiscalEventLabel(eventType?: string | null): string {
  const code = String(eventType ?? '').trim();
  const eventMap: Record<string, string> = {
    '110110': 'Carta de Correção Eletrônica (CC-e)',
    '110111': 'Cancelamento de NF-e',
    '110112': 'Cancelamento por substituição',
    '110130': 'Comprovante de Entrega',
    '110131': 'Cancelamento de Comprovante de Entrega',
    '210200': 'Confirmação da Operação',
    '210210': 'Ciência da Emissão',
    '210220': 'Desconhecimento da Operação',
    '210240': 'Operação não Realizada',
    cce: 'Carta de Correção Eletrônica (CC-e)',
    cancel: 'Cancelamento de NF-e',
    cancellation: 'Cancelamento de NF-e',
  };
  return eventMap[code] || (code ? `Evento fiscal (${code})` : 'Evento fiscal');
}

