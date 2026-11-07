import { validateOrdinaryOutboundEnvelope } from '../../../erp/src/pages/utils/nfe/fiscalEnvelope';
import { validateNfeAgainstOfficialSchema } from '../schemaValidator';
import { hasResponsibleTechnicianCsrt } from '../responsibleTechnician';

export async function validateStoredRetryDocumentXml(params: {
  xml: string;
  accessKey: string;
  model: string;
  environment: number;
  nfeNumber: number;
  series: string;
}): Promise<string | null> {
  const { xml, accessKey, model, environment, nfeNumber, series } = params;

  if (model === '55' && !hasResponsibleTechnicianCsrt(xml)) {
    return 'XML original sem CSRT exigido pela SEFA/PR; a retransmissão imutável foi bloqueada.';
  }

  const envelopeError = validateOrdinaryOutboundEnvelope({
    xml,
    accessKey,
    model: model as '55' | '65',
    environment: environment as 1 | 2,
    nfeNumber,
    series,
  });
  if (envelopeError) {
    return 'XML persistido não confere com a chave e a numeração originais; retransmissão bloqueada.';
  }

  await validateNfeAgainstOfficialSchema(xml);
  return null;
}
