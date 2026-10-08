import { supabase } from '@/pages/utils/supabaseConfig';
import { formatToBRDate } from '@/pages/utils/formatters';
import {
  generateDanfeHtml,
  openDanfePrintWindow,
  type DanfeData,
} from '@/pages/utils/nfe/danfeGenerator';
import { getSettings } from '@/pages/utils/settingsService';
import { parseSefazAuthorization } from '@/pages/utils/nfe/sefazResponseParser';
import type Order from '@/pages/types/order.type';
import { parseFiscalXmlDetails } from '../utils/fiscalXmlParser';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';

function createDanfeFallbackOrder(document: NfeDocumentRecord): Order {
  const total = document.valor_total || 0;

  return {
    id: document.order_id || undefined,
    orderType: 'sale',
    status: document.status,
    orderIndex: document.numero_nfe,
    items: [
      {
        description: 'VENDA DE MERCADORIAS (CONFORME PEDIDO)',
        quantity: 1,
        unitPrice: total,
        unitDiscount: 0,
        discountType: 'fixed',
        handlingType: 'product',
      },
    ],
    itemsSummary: {
      totalQuantity: 1,
      itemsSubtotal: total,
      totalFixedDiscount: 0,
      itemsTotalValue: total,
      totalItemsCost: 0,
    },
    shipping: {
      value: 0,
      deliveryMethod: 'pickup',
      orderType: 'sale',
      scheduling: { date: document.created_at, time: '', type: 'fixed' },
    },
    seller: '',
    payments: [],
    paymentsSummary: {
      totalPaymentsFee: 0,
      totalOrderValue: total,
      totalAmountPaid: total,
      amountRemaining: 0,
    },
    customerData: {
      fullName: document.destinatario_nome || 'Consumidor final',
      phone: '',
      cpfCnpj: document.destinatario_documento,
      fullAddress: {
        cep: '',
        street: '',
        number: '',
        complement: '',
        observation: '',
        neighborhood: '',
        city: '',
      },
    },
    observation: '',
    date: document.created_at,
  };
}

async function buildDanfeData(doc: NfeDocumentRecord): Promise<DanfeData> {
  const settings = await getSettings();
  let xml = doc.xml_nfe || '';
  let protocolXml = doc.xml_protocolo || '';
  let protocolNumber = doc.numero_protocolo || '';

  if (!xml || !protocolXml || !protocolNumber) {
    const { data, error } = await supabase
      .from('nfe_documents')
      .select('xml_nfe,xml_protocolo,numero_protocolo')
      .eq('id', doc.id)
      .maybeSingle();
    if (error) throw new Error('Não foi possível carregar o XML autorizado para impressão.');
    xml ||= data?.xml_nfe || '';
    protocolXml ||= data?.xml_protocolo || '';
    protocolNumber ||= data?.numero_protocolo || '';
  }

  const fiscalDetails = parseFiscalXmlDetails(xml);
  if (!fiscalDetails) throw new Error('O XML autorizado não está disponível para montar o DANFE.');
  if (
    fiscalDetails.general.model !== doc.modelo ||
    (fiscalDetails.general.environment && Number(fiscalDetails.general.environment) !== doc.ambiente)
  ) {
    throw new Error('O XML não corresponde ao modelo e ambiente deste documento fiscal.');
  }

  const authorization = parseSefazAuthorization(protocolXml);
  const protocolDate = authorization.protocolDate
    ? `${formatToBRDate(authorization.protocolDate)} ${authorization.protocolDate.match(/T(\d{2}:\d{2}:\d{2})/)?.[1] || ''}`.trim()
    : '';

  return {
    order: createDanfeFallbackOrder(doc),
    settings,
    accessKey: doc.chave_acesso,
    nfeNumber: Number(fiscalDetails.general.number) || doc.numero_nfe,
    series: fiscalDetails.general.series || doc.serie || '1',
    protocolNumber: authorization.protocolNumber || protocolNumber || '',
    protocolDate,
    model: doc.modelo,
    environment: doc.ambiente,
    status: doc.status === 'autorizada' ? 'autorizada' : doc.status === 'homologada' ? 'homologada' : 'pendente',
    natOp: fiscalDetails.general.natureOperation,
    fiscalDetails,
  };
}

export async function printDanfe(doc: NfeDocumentRecord): Promise<void> {
  openDanfePrintWindow(await buildDanfeData(doc));
}

export async function createDanfeShareFile(doc: NfeDocumentRecord): Promise<File> {
  const danfeData = await buildDanfeData(doc);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '900px',
    height: '1200px',
    border: '0',
    visibility: 'hidden',
  });

  try {
    const loaded = new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Tempo esgotado ao preparar o DANFE.')), 15000);
      iframe.addEventListener(
        'load',
        () => {
          window.clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    });
    document.body.appendChild(iframe);
    iframe.srcdoc = generateDanfeHtml(danfeData);
    await loaded;

    const frameDocument = iframe.contentDocument;
    const danfeElement = frameDocument?.querySelector<HTMLElement>(
      doc.modelo === '65' ? '.danfe-nfce' : '.danfe-a4'
    );
    if (!frameDocument || !danfeElement) {
      throw new Error('Não foi possível montar a imagem do DANFE.');
    }
    await frameDocument.fonts?.ready;
    await Promise.all(
      Array.from(frameDocument.images).map((image) => image.decode().catch(() => undefined))
    );

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(danfeElement, {
      backgroundColor: '#ffffff',
      logging: false,
      scale: 2,
      useCORS: true,
      width: danfeElement.scrollWidth,
      height: danfeElement.scrollHeight,
      windowWidth: iframe.contentWindow?.innerWidth || 900,
      windowHeight: Math.max(1200, danfeElement.scrollHeight),
    });
    const image = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Não foi possível gerar o arquivo do DANFE.'));
      }, 'image/png');
    });
    const modelName = doc.modelo === '65' ? 'NFCe' : 'NFe';
    return new File(
      [image],
      `DANFE_${modelName}_${String(doc.numero_nfe).padStart(6, '0')}.png`,
      { type: 'image/png' }
    );
  } finally {
    iframe.remove();
  }
}

export async function downloadXml(doc: NfeDocumentRecord): Promise<void> {
  let xml = doc.xml_nfe;
  if (!xml) {
    const { data, error } = await supabase
      .from('nfe_documents')
      .select('xml_nfe')
      .eq('id', doc.id)
      .maybeSingle();
    if (error) throw error;
    xml = data?.xml_nfe || undefined;
  }
  if (!xml) {
    throw new Error('XML não disponível para este documento.');
  }

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `NFe_${doc.chave_acesso || doc.numero_nfe}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
