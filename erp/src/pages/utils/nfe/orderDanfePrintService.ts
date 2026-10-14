import { ACCESS_KEY_PATTERN } from '../../../../../shared-utils/fiscalIdentifiers.js';
import type Order from '@/pages/types/order.type';
import { parseFiscalXmlDetails } from '@/pages/App/FiscalDocuments/utils/fiscalXmlParser';
import { openDanfePrintWindow } from './danfeGenerator';
import { type AppSettings, getSettings } from '../settingsService';
import { supabase } from '../supabaseConfig';

/**
 * Abre a janela de visualização e impressão do DANFE para um pedido que possui NF-e autorizada.
 */
export async function printOrderDanfe(order: Order): Promise<void> {
  const nfeData = (order as any).nfeData;
  if (!nfeData) {
    throw new Error('Este pedido ainda não possui NF-e emitida.');
  }
  if (
    !ACCESS_KEY_PATTERN.test(nfeData.accessKey || '') ||
    !/^\d{15}$/.test(nfeData.protocolNumber || '') ||
    !nfeData.protocolDate ||
    !nfeData.series ||
    !nfeData.nfeNumber ||
    !['55', '65'].includes(nfeData.model) ||
    ![1, 2].includes(nfeData.environment) ||
    !['autorizada', 'homologada'].includes(nfeData.status)
  )
    throw new Error(
      'Dados de autorização incompletos. Consulte o documento fiscal antes de imprimir o DANFE.'
    );

  let xml = typeof nfeData.xml === 'string' ? nfeData.xml : '';
  if (!xml && order.id) {
    const { data, error } = await supabase
      .from('nfe_documents')
      .select('xml_nfe')
      .eq('order_id', order.id)
      .eq('chave_acesso', nfeData.accessKey)
      .eq('ambiente', nfeData.environment)
      .maybeSingle();
    if (error) throw new Error('Não foi possível carregar o XML fiscal original.');
    xml = data?.xml_nfe || '';
  }
  const fiscalDetails = parseFiscalXmlDetails(xml);
  if (
    !fiscalDetails ||
    fiscalDetails.general.model !== nfeData.model ||
    Number(fiscalDetails.general.number) !== Number(nfeData.nfeNumber) ||
    fiscalDetails.general.series !== String(nfeData.series) ||
    (fiscalDetails.general.environment &&
      Number(fiscalDetails.general.environment) !== nfeData.environment)
  ) {
    throw new Error('O XML fiscal original não corresponde aos dados de autorização deste pedido.');
  }

  const settings: AppSettings = await getSettings();

  openDanfePrintWindow({
    order,
    settings,
    accessKey: nfeData.accessKey,
    nfeNumber: nfeData.nfeNumber,
    series: nfeData.series,
    protocolNumber: nfeData.protocolNumber,
    protocolDate: nfeData.protocolDate,
    model: nfeData.model,
    environment: nfeData.environment,
    status: nfeData.status,
    natOp: fiscalDetails.general.natureOperation,
    fiscalDetails,
  });
}
