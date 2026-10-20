export const EMISSION_CODE_MESSAGES: ReadonlyArray<{
  codes: readonly string[];
  message: string;
}> = [
  {
    codes: ['HML_TRANSMISSION_UNCERTAIN', 'FISCAL_TRANSMISSION_UNCERTAIN'],
    message:
      'Houve falha de conexão e a SEFAZ não respondeu. Consulte a tentativa para verificar se a nota foi autorizada.',
  },
  {
    codes: ['HML_CONFIRMED_NOT_FOUND', 'FISCAL_CONFIRMED_NOT_FOUND'],
    message:
      'A consulta retornou 217: a nota não consta na SEFAZ. Você pode retransmitir o mesmo documento.',
  },
  {
    codes: ['HML_RECONCILIATION_REQUIRED', 'FISCAL_RECONCILIATION_REQUIRED'],
    message:
      'Existe uma tentativa anterior sem confirmação da SEFAZ. Consulte a situação antes de emitir novamente.',
  },
  {
    codes: ['HML_NEW_EMISSION_REQUIRED'],
    message:
      'A NFC-e original não consta, mas seu horário de emissão expirou. Gere uma nova tentativa com horário e numeração atuais.',
  },
];

export function requiresReconciliation(
  status: number,
  result: {
    pending?: boolean;
    code?: string;
    numberReserved?: boolean;
    sefazContacted?: boolean;
  }
): boolean {
  if (
    result.pending ||
    [
      'HML_TRANSMISSION_UNCERTAIN',
      'HML_RECONCILIATION_REQUIRED',
      'SEFAZ_TRANSPORT_FAILED',
    ].includes(result.code || '')
  )
    return true;
  if (result.numberReserved === false && result.sefazContacted === false) return false;
  return status >= 500;
}

/** Resolve a mensagem exibida ao operador a partir da resposta da API interna de emissão. */
export function resolveEmissionErrorMessage(
  result: {
    code?: string;
    error?: unknown;
    xMotivo?: unknown;
    blockers?: unknown;
    reservationRecoveryRequired?: boolean;
  },
  activeAttemptConflict: boolean
): string {
  if (activeAttemptConflict) {
    return result.reservationRecoveryRequired
      ? 'Já existe uma reserva fiscal para este pedido. Retome a reserva existente para preservar a numeração.'
      : 'Já existe uma tentativa fiscal em andamento para este pedido. Consulte o status antes de emitir novamente.';
  }
  const known = EMISSION_CODE_MESSAGES.find(({ codes }) => codes.includes(result.code ?? ''));
  if (known) return known.message;

  const blockersDetail =
    Array.isArray(result.blockers) && result.blockers.length
      ? result.blockers
          .map((b: { message?: string; code?: string }) => b.message || b.code)
          .filter(Boolean)
          .join('; ')
      : undefined;
  if (blockersDetail) return blockersDetail;
  if (typeof result.error === 'string') return result.error;
  if (typeof result.xMotivo === 'string') return result.xMotivo;
  return 'A SEFAZ não confirmou a emissão fiscal.';
}
