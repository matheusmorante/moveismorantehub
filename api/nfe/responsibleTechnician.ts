import { createHash } from 'node:crypto';

export interface ResponsibleTechnicianConfig {
  cnpj: string;
  contact: string;
  email: string;
  phone: string;
  csrtId: string;
  csrt: string;
}

export function getResponsibleTechnicianConfig(
  env: Record<string, string | undefined> = process.env
): ResponsibleTechnicianConfig | null {
  const cnpj = String(env.NFE_RESP_TECH_CNPJ || '').replace(/\D/g, '');
  const contact = String(env.NFE_RESP_TECH_CONTACT || '').trim();
  const email = String(env.NFE_RESP_TECH_EMAIL || '').trim();
  const phone = String(env.NFE_RESP_TECH_PHONE || '').replace(/\D/g, '');
  const csrtId = String(env.NFE_CSRT_ID || '').trim();
  const csrt = String(env.NFE_CSRT_SECRET || '').trim();

  if (
    !/^\d{14}$/.test(cnpj) ||
    contact.length < 2 ||
    contact.length > 60 ||
    email.length < 6 ||
    email.length > 60 ||
    !/^\d{6,14}$/.test(phone) ||
    !/^\d{2}$/.test(csrtId) ||
    !/^[A-Za-z0-9]{16,36}$/.test(csrt)
  ) {
    return null;
  }

  return { cnpj, contact, email, phone, csrtId, csrt };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * SEFA/PR requires idCSRT/hashCSRT for NF-e. NT 2018.005 v1.52 defines
 * hashCSRT as Base64(SHA-1(CSRT + 44-digit access key)).
 */
export function appendResponsibleTechnician(
  xml: string,
  accessKey: string,
  config: ResponsibleTechnicianConfig
): string {
  if (!/^\d{44}$/.test(accessKey)) throw new Error('Chave de acesso inválida para CSRT.');
  if (/<infRespTec(?:\s|>)/.test(xml))
    throw new Error('O XML já contém infRespTec; o grupo deve ser gerado pelo servidor.');

  const infNfeCloseIndex = xml.lastIndexOf('</infNFe>');
  if (infNfeCloseIndex === -1) throw new Error('Grupo infNFe ausente no XML da NF-e.');

  const hashCSRT = createHash('sha1').update(`${config.csrt}${accessKey}`, 'utf8').digest('base64');
  const responsibleTechnicianXml =
    `<infRespTec><CNPJ>${config.cnpj}</CNPJ>` +
    `<xContato>${escapeXml(config.contact)}</xContato>` +
    `<email>${escapeXml(config.email)}</email><fone>${config.phone}</fone>` +
    `<idCSRT>${config.csrtId}</idCSRT><hashCSRT>${hashCSRT}</hashCSRT></infRespTec>`;

  return `${xml.slice(0, infNfeCloseIndex)}${responsibleTechnicianXml}${xml.slice(infNfeCloseIndex)}`;
}

export function hasResponsibleTechnicianCsrt(xml: string): boolean {
  return /<infRespTec(?:\s|>)[\s\S]*?<idCSRT>\d{2}<\/idCSRT>[\s\S]*?<hashCSRT>[A-Za-z0-9+/]{27}={0,1}<\/hashCSRT>[\s\S]*?<\/infRespTec>/.test(
    xml
  );
}
