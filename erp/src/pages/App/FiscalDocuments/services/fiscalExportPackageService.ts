import JSZip from 'jszip';
import { format } from 'date-fns';
import { buildAuthorizedNfeDownloadXml } from '@/pages/utils/nfe/authorizedNfeXml';
import { fetchFiscalExportPage, previewFiscalExport } from './fiscalExportService';
import type {
  FiscalExportDocument,
  FiscalExportEvent,
  FiscalExportFilters,
  FiscalExportHistoryItem,
  FiscalExportPreview,
} from '../types/fiscalExport.types';

const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';

interface PackageDocument extends FiscalExportDocument {
  orderNumber?: number;
  isContextDocument: boolean;
}

export interface GeneratedFiscalPackage {
  blob: Blob;
  archiveName: string;
  exportId: string;
}

function safeFilePart(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'documento';
}

function documentTypeFolder(document: FiscalExportDocument): string {
  switch (document.document_type || 'outbound') {
    case 'estorno': return 'estornos';
    case 'return': return 'devolucoes';
    case 'inbound': return 'entradas';
    default: return 'saidas';
  }
}

function documentTypeLabel(document: FiscalExportDocument): string {
  switch (document.document_type || 'outbound') {
    case 'estorno': return 'Estorno fiscal';
    case 'return': return 'Devolução fiscal';
    case 'inbound': return 'Entrada importada';
    default: return 'Saída';
  }
}

function readOperationNature(xml: string): string {
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml)) return '';
  try {
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    if (parsed.getElementsByTagName('parsererror').length) return '';
    return parsed.getElementsByTagNameNS(NFE_NAMESPACE, 'natOp')[0]?.textContent?.trim() || '';
  } catch {
    return '';
  }
}

function xmlEscape(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function columnName(index: number): string {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function makeSpreadsheet(rows: Array<Array<string | number>>): JSZip {
  const zip = new JSZip();
  const sheetRows = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const cells = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowNumber}`;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${reference}"><v>${value}</v></c>`;
      }
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowNumber}">${cells}</row>`;
  }).join('');

  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Conferencia fiscal" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`);
  return zip;
}

async function addReport(
  zip: JSZip,
  documents: PackageDocument[],
  preview: FiscalExportPreview,
  filters: FiscalExportFilters
) {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const headers = [
    'Tipo de documento', 'Modelo', 'Número', 'Série', 'Chave de acesso', 'Data de emissão',
    'Situação fiscal', 'Ambiente', 'Valor total', 'Pedido', 'Chave referenciada', 'Natureza da operação',
  ];
  const rows: Array<Array<string | number>> = [headers];
  for (const document of documents) {
    const referencedId = document.original_document_id || document.supersedes_document_id;
    const referencedDocument = referencedId
      ? byId.get(referencedId)
      : undefined;
    rows.push([
      `${document.isContextDocument ? 'Referência · ' : ''}${documentTypeLabel(document)}`,
      document.modelo === '65' ? 'NFC-e 65' : 'NF-e 55',
      document.numero_nfe,
      document.serie,
      document.chave_acesso,
      document.created_at.slice(0, 10),
      document.status,
      document.ambiente === 1 ? 'Produção' : 'Homologação',
      Number(document.valor_total || 0),
      document.orderNumber ? `#${document.orderNumber}` : '',
      referencedDocument?.chave_acesso || '',
      readOperationNature(document.xml_nfe || ''),
    ]);
  }
  rows.push([]);
  rows.push(['Total de documentos do filtro', preview.totalCount]);
  rows.push(['Notas fiscais de entrada importadas', preview.inboundCount]);
  rows.push(['Eventos fiscais registrados', preview.eventCount]);
  rows.push(['Valor total dos documentos do filtro', Number(preview.totalValue.toFixed(2))]);
  rows.push(['Ambiente do filtro', filters.environment === 1 ? 'Produção' : 'Homologação']);
  const spreadsheet = makeSpreadsheet(rows);
  zip.file('relatorios/conferencia-fiscal.xlsx', await spreadsheet.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function generateFiscalExportPackage(
  filters: FiscalExportFilters,
  preview: FiscalExportPreview,
  onProgress?: (message: string) => void
): Promise<GeneratedFiscalPackage> {
  const primaryDocuments = new Map<string, PackageDocument>();
  const primaryDocumentIds = new Set<string>();
  const eventsById = new Map<string, FiscalExportEvent>();
  const orderNumbers: Record<string, number> = {};
  let offset = 0;
  const startedAt = Date.now();

  while (true) {
    if (Date.now() - startedAt > 120_000) {
      throw new Error('A exportação excedeu o limite de 2 minutos. Reduza o período e gere outra prévia.');
    }
    onProgress?.(`Recuperando documentos fiscais (${Math.min(offset + 1, preview.totalCount)} de ${preview.totalCount})…`);
    const page = await fetchFiscalExportPage(filters, offset);
    for (const document of page.documents) {
      primaryDocumentIds.add(document.id);
      primaryDocuments.set(document.id, { ...document, isContextDocument: false });
    }
    for (const document of page.linkedDocuments) {
      if (!primaryDocuments.has(document.id)) {
        primaryDocuments.set(document.id, { ...document, isContextDocument: true });
      }
    }
    Object.assign(orderNumbers, page.orderNumbers);
    for (const event of page.events) eventsById.set(event.id, event);
    if (page.nextOffset === null) break;
    offset = page.nextOffset;
  }

  if (primaryDocumentIds.size !== preview.totalCount) {
    throw new Error('A lista mudou durante a exportação. Gere uma nova prévia antes de baixar o pacote.');
  }
  const currentPreview = await previewFiscalExport(filters);
  if (JSON.stringify(currentPreview) !== JSON.stringify(preview)) {
    throw new Error('Os documentos ou eventos mudaram desde a prévia. Atualize a prévia antes de baixar o pacote.');
  }

  const documents = Array.from(primaryDocuments.values());
  for (const document of documents) {
    document.orderNumber = document.order_id ? orderNumbers[document.order_id] : undefined;
  }
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const zip = new JSZip();
  const readme = [
    'Exportação de documentos fiscais do MoranteHub.',
    `Ambiente: ${filters.environment === 1 ? 'Produção' : 'Homologação'}.`,
    `Período de emissão: ${filters.periodStart} a ${filters.periodEnd}.`,
    'Os XMLs foram recuperados dos documentos e eventos fiscais persistidos no ERP.',
    'Esta exportação não consultou nem transmitiu dados à SEFAZ.',
  ].join('\n');
  zip.file('LEIA-ME.txt', readme);

  for (const document of documents) {
    const sourceFolder = document.isContextDocument ? 'referencias-originais' : documentTypeFolder(document);
    const model = document.modelo === '65' ? 'NFCe' : 'NFe';
    const documentNumber = String(document.numero_nfe).padStart(6, '0');
    const filenameBase = safeFilePart(`${model}_${document.serie}_${documentNumber}_${document.chave_acesso}`);
    const xml = document.xml_nfe || '';
    if (!xml) throw new Error(`O XML da nota ${model} nº ${document.numero_nfe} não está armazenado; o pacote não foi gerado.`);

    if (document.document_type === 'inbound') {
      zip.file(`${sourceFolder}/${filenameBase}-entrada.xml`, xml);
      continue;
    }

    if (['autorizada', 'homologada', 'cancelada'].includes(document.status)) {
      if (!document.xml_protocolo || !document.numero_protocolo) {
        throw new Error(`A nota ${model} nº ${document.numero_nfe} não possui protocolo persistido; o pacote não foi gerado.`);
      }
      const processedXml = buildAuthorizedNfeDownloadXml({
        signedXml: xml,
        protocolXml: document.xml_protocolo,
        accessKey: document.chave_acesso,
        environment: document.ambiente,
        protocolNumber: document.numero_protocolo,
      });
      zip.file(`${sourceFolder}/${filenameBase}-procNFe.xml`, processedXml);
    } else {
      zip.file(`${sourceFolder}/${filenameBase}-NFe.xml`, xml);
      if (document.xml_protocolo) zip.file(`${sourceFolder}/${filenameBase}-retorno-SEFAZ.xml`, document.xml_protocolo);
    }
  }

  for (const event of eventsById.values()) {
    if (!['110111', '210210'].includes(event.event_type) || event.status !== 'registered') continue;
    const document = documentById.get(event.document_id);
    if (!document || !event.response_xml) {
      throw new Error('Um evento fiscal registrado está sem documento ou XML de protocolo persistido; o pacote não foi gerado.');
    }
    const eventFolder = event.event_type === '210210' ? 'eventos-manifestacao' : 'eventos-cancelamento';
    const folder = document.isContextDocument ? `referencias-originais/${eventFolder}` : `${document.document_type === 'inbound' ? 'entradas/' : ''}${eventFolder}`;
    const eventBase = safeFilePart(`${document.chave_acesso}_${event.event_type}_sequencia-${event.event_sequence}_tentativa-${event.attempt_number}`);
    if (event.signed_xml) zip.file(`${folder}/${eventBase}-evento.xml`, event.signed_xml);
    zip.file(`${folder}/${eventBase}-procEventoNFe.xml`, event.response_xml);
  }

  if (filters.includeReport) {
    onProgress?.('Preparando a planilha de conferência…');
    await addReport(zip, documents, preview, filters);
  }

  const createdAt = format(new Date(), 'yyyyMMdd-HHmmss');
  const environmentLabel = filters.environment === 1 ? 'Producao' : 'Homologacao';
  const archiveName = `Notas_Fiscais_${environmentLabel}_${createdAt}.zip`;
  onProgress?.('Compactando XMLs, eventos e relatório…');
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const exportId = crypto.randomUUID();
  return { blob, archiveName, exportId };
}

export function saveFiscalExportPackage(pkg: GeneratedFiscalPackage): void {
  downloadBlob(pkg.blob, pkg.archiveName);
}

export function getFiscalExportHistoryLabel(item: FiscalExportHistoryItem): string {
  return `${item.document_count} documento(s) · ${format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')} · ${item.archive_name}`;
}
