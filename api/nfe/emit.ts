import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { parseAuthorizedInvoiceLines } from '../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import { validateOrdinaryOutboundEnvelope } from '../../erp/src/pages/utils/nfe/fiscalEnvelope';
import { isNfeProductionEnabled } from './productionGuard';
import type { FiscalDatabase } from './fiscalDatabaseTypes';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Endpoints Oficiais SEFAZ-PR Homologação e Produção
const SEFAZ_PR_URLS = {
  homologacao: {
    '55': 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
    '65': 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
  },
  producao: {
    '55': 'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
    '65': 'https://nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let supabase: ReturnType<typeof createClient<FiscalDatabase>> | undefined;
  let reservedDocumentId: string | undefined;
  let transmissionStarted = false;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      xml,
      environment,
      orderId,
      nfeNumber,
      series,
      model,
      accessKey,
      productionConfirmed,
      emissionRequestId,
    } = req.body;

    if (!xml && !req.body.retryDocumentId) {
      return res.status(400).json({ error: 'XML da NF-e não fornecido no payload.' });
    }

    const selectedEnvironment = Number(environment);
    if (!req.body.retryDocumentId) {
      const xmlEnvironment = String(xml).match(/<tpAmb>(\d+)<\/tpAmb>/)?.[1];
      const xmlModel = String(xml).match(/<mod>(\d+)<\/mod>/)?.[1];
      if (
        ![1, 2].includes(selectedEnvironment) ||
        !['55', '65'].includes(String(model)) ||
        xmlEnvironment !== String(selectedEnvironment) ||
        xmlModel !== String(model) ||
        !orderId ||
        !nfeNumber ||
        !/^\d{44}$/.test(String(accessKey)) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          String(emissionRequestId || '')
        )
      ) {
        return res
          .status(400)
          .json({ success: false, error: 'Dados da emissão incompletos ou ambiente inválido.' });
      }
      const envelopeError = validateOrdinaryOutboundEnvelope({
        xml: String(xml),
        accessKey: String(accessKey),
        model: String(model) as '55' | '65',
        environment: selectedEnvironment as 1 | 2,
        nfeNumber: Number(nfeNumber),
        series: String(series || '1'),
      });
      if (envelopeError) return res.status(400).json({ success: false, error: envelopeError });
    }

    // 1. Obter configurações fiscais e certificado do banco
    if (!supabaseServiceKey)
      return res
        .status(503)
        .json({ success: false, error: 'Serviço fiscal sem credencial segura do banco.' });
    supabase = createClient<FiscalDatabase>(supabaseUrl, supabaseServiceKey);
    const authorization = String(req.headers.authorization || '');
    const token = authorization.replace(/^Bearer\s+/i, '');
    if (!token)
      return res
        .status(401)
        .json({ success: false, error: 'Autenticação necessária para emitir documento fiscal.' });
    const { data: authenticated, error: authenticationError } = await supabase.auth.getUser(token);
    if (authenticationError || !authenticated.user)
      return res
        .status(401)
        .json({ success: false, error: 'Sessão inválida. Entre novamente para emitir.' });
    if (selectedEnvironment === 1 && productionConfirmed !== true)
      return res
        .status(400)
        .json({ success: false, error: 'Confirmação explícita de Produção ausente.' });
    if (selectedEnvironment === 1 && !isNfeProductionEnabled(process.env.NFE_PRODUCTION_ENABLED)) {
      return res
        .status(503)
        .json({
          success: false,
          error:
            'Transmissões em Produção estão desabilitadas neste servidor. Configure NFE_PRODUCTION_ENABLED=true somente após aprovação fiscal.',
        });
    }
    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .select('id,order_type,status')
      .eq('id', String(orderId))
      .maybeSingle();
    if (orderError || !orderRow)
      return res
        .status(404)
        .json({ success: false, error: 'Pedido não encontrado para emissão fiscal.' });
    if (
      !['sale', 'showroom'].includes(String(orderRow.order_type)) ||
      ['cancelled', 'cancelado'].includes(String(orderRow.status).toLowerCase())
    ) {
      return res
        .status(409)
        .json({
          success: false,
          error:
            'A emissão de saída só pode ser solicitada para pedido comercial válido. Devoluções e estornos usam o fluxo fiscal próprio.',
        });
    }
    let documentId: string;
    let signedXml = String(xml);

    if (req.body.retryDocumentId) {
      // Retransmissão explícita de erro 217
      const { data: retryDoc, error: retryErr } = await supabase
        .from('nfe_documents')
        .select(
          'id, status, xml_nfe, chave_acesso, numero_nfe, serie, modelo, ambiente, motivo_status'
        )
        .eq('id', req.body.retryDocumentId)
        .maybeSingle();

      if (retryErr || !retryDoc)
        return res
          .status(404)
          .json({ success: false, error: 'Documento original não encontrado para retransmissão.' });
      if (retryDoc.status !== 'erro')
        return res
          .status(400)
          .json({
            success: false,
            error: 'Apenas notas em situação de Erro (217) podem ser retransmitidas.',
          });
      if (
        ![1, 2].includes(selectedEnvironment) ||
        !['55', '65'].includes(String(model)) ||
        Number(retryDoc.ambiente) !== selectedEnvironment ||
        String(retryDoc.modelo) !== String(model)
      ) {
        return res
          .status(409)
          .json({
            success: false,
            error: 'Ambiente ou modelo da retransmissão deve corresponder ao documento original.',
          });
      }
      if (
        Number(retryDoc.ambiente) === 1 &&
        !isNfeProductionEnabled(process.env.NFE_PRODUCTION_ENABLED)
      ) {
        return res
          .status(503)
          .json({
            success: false,
            error: 'Transmissões em Produção estão desabilitadas neste servidor.',
          });
      }
      if (
        String(retryDoc.motivo_status || '').indexOf('217') === -1 &&
        String(retryDoc.motivo_status || '').indexOf('não consta') === -1
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              'Apenas notas não encontradas na SEFAZ (217) podem ser retransmitidas sem nova numeração.',
          });
      }
      const retryXml = typeof retryDoc.xml_nfe === 'string' ? retryDoc.xml_nfe : '';
      const retryEnvelopeError = validateOrdinaryOutboundEnvelope({
        xml: retryXml,
        accessKey: String(retryDoc.chave_acesso || ''),
        model: String(retryDoc.modelo) as '55' | '65',
        environment: Number(retryDoc.ambiente) as 1 | 2,
        nfeNumber: Number(retryDoc.numero_nfe),
        series: String(retryDoc.serie || ''),
      });
      if (retryEnvelopeError) {
        return res
          .status(409)
          .json({
            success: false,
            error:
              'XML persistido não confere com a chave e a numeração originais; retransmissão bloqueada.',
          });
      }

      // Reativa o documento para bloquear concorrência durante a transmissão
      const { error: reactivateErr } = await supabase
        .from('nfe_documents')
        .update({ status: 'processando', updated_at: new Date().toISOString() })
        .eq('id', retryDoc.id)
        .eq('status', 'erro');
      if (reactivateErr)
        return res
          .status(409)
          .json({
            success: false,
            error: 'A nota não pôde ser reativada. Pode já estar em processamento.',
          });

      documentId = retryDoc.id;
      signedXml = retryXml; // preserva a assinatura, chave e número da tentativa original
      reservedDocumentId = documentId;
    } else {
      // Nova Emissão
      const isHomologacao = selectedEnvironment === 2;
      const documentStatus = isHomologacao ? 'homologada' : 'autorizada';
      const { data: existingAuthorized } = await supabase
        .from('nfe_documents')
        .select('id')
        .eq('order_id', orderId)
        .eq('status', documentStatus)
        .limit(1)
        .maybeSingle();
      if (existingAuthorized) {
        // Bloqueia emissão múltipla para o mesmo pedido temporariamente caso necessário, ou ajusta regra
        // O usuário pediu: "Não bloquear múltiplas NF-e legítimas". Então não barramos aqui se a constraint não barra.
      }

      try {
        const { data: reservedId, error: rpcErr } = await supabase.rpc(
          'reserve_nfe_outbound_emission',
          {
            p_order_id: orderId,
            p_modelo: String(model),
            p_ambiente: selectedEnvironment,
            p_emission_request_id: emissionRequestId,
            p_chave_acesso: accessKey,
            p_xml_nfe: xml,
            p_numero_nfe: Number(nfeNumber),
            p_serie: String(series || '1'),
          }
        );

        if (rpcErr) {
          if (rpcErr.message.includes('ALREADY_ACTIVE')) {
            return res
              .status(409)
              .json({
                success: false,
                pending: true,
                documentId: rpcErr.message.split(':')[2],
                error:
                  'Já existe uma tentativa ativa ou em andamento para esse pedido. Consulte a situação.',
              });
          }
          if (rpcErr.message.includes('DUPLICATE_IDEMPOTENCY')) {
            return res
              .status(409)
              .json({
                success: false,
                error: 'Esta tentativa (ID de requisição) já foi registrada.',
              });
          }
          throw rpcErr;
        }

        documentId = String(reservedId);
        reservedDocumentId = documentId;
      } catch (err: any) {
        return res
          .status(503)
          .json({
            success: false,
            error: 'Não foi possível reservar a emissão de forma atômica. Tente novamente.',
          });
      }
    }

    // 2. Obter configurações fiscais e certificado do banco
    const { data: settingsRow, error: settingsErr } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'app')
      .maybeSingle();

    if (settingsErr) throw new Error('Não foi possível carregar a configuração fiscal da empresa.');
    const settings: Record<string, unknown> = settingsRow?.data || settingsRow || {};
    const pfxBase64 =
      (typeof settings.certificateBase64 === 'string' ? settings.certificateBase64 : '') ||
      process.env.NFE_CERTIFICATE_BASE64;
    const pfxPassword =
      (typeof settings.certificatePassword === 'string' ? settings.certificatePassword : '') ||
      process.env.NFE_CERTIFICATE_PASSWORD;

    if (!pfxBase64) {
      await supabase
        .from('nfe_documents')
        .update({
          status: 'erro',
          motivo_status: 'Certificado digital não configurado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      return res.status(400).json({
        success: false,
        error:
          'Certificado digital (.pfx) não encontrado nas configurações nem nas variáveis de ambiente.',
      });
    }

    // 2. Extrair chaves criptográficas do Certificado A1
    const { privateKeyPem, certPem, certDerBase64 } = extractCertificateAndKey(
      pfxBase64,
      pfxPassword || ''
    );

    // Uma retransmissão 217 usa exatamente o XML assinado e persistido da tentativa original.
    // Uma nova emissão recebe a assinatura depois de gerar sua chave e numeração próprias.
    if (!req.body.retryDocumentId) {
      signedXml = signNfeXml(String(xml), privateKeyPem, certDerBase64);
    }

    // 4. Montar o lote de envio <enviNFe>
    const idLote = String(Date.now()).slice(-15);
    const enviNfeXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${signedXml}</enviNFe>`;

    // 5. Determinar URL da SEFAZ
    const isHomologacao = selectedEnvironment === 2;
    const sefazUrl = isHomologacao
      ? SEFAZ_PR_URLS.homologacao[String(model) as '55' | '65']
      : SEFAZ_PR_URLS.producao[String(model) as '55' | '65'];

    console.log(
      `[NF-e Emit] Enviando lote ${idLote} para SEFAZ-PR (${isHomologacao ? 'Homologação' : 'Produção'})...`
    );

    // 6. Transmitir SOAP mTLS para a SEFAZ
    let sefazResponseXml: string;
    try {
      transmissionStarted = true;
      sefazResponseXml = await sendSoapToSefaz({
        url: sefazUrl,
        action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
        xmlPayload: enviNfeXml,
        certPem,
        privateKeyPem,
      });
    } catch (soapErr: any) {
      console.error('[NF-e Emit] Erro na conexão SOAP SEFAZ:', soapErr.message);
      // Falha de rede é ambígua: manter reserva pendente evita uma retransmissão duplicada.
      await supabase
        .from('nfe_documents')
        .update({
          status: 'pendente',
          motivo_status: `Resultado da transmissão não confirmado: ${soapErr.message}`,
          xml_nfe: signedXml,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      return res.status(502).json({
        success: false,
        pending: true,
        documentId,
        signedXml,
        error: `Conexão com SEFAZ-PR: ${soapErr.message}`,
      });
    }

    const parsed = parseSefazAuthorization(sefazResponseXml);
    const documentStatus = parsed.authorized
      ? isHomologacao
        ? 'homologada'
        : 'autorizada'
      : parsed.pending
        ? 'pendente'
        : 'erro';
    const { error: documentPersistError } = await supabase
      .from('nfe_documents')
      .update({
        status: documentStatus,
        motivo_status: parsed.xMotivo || `SEFAZ cStat ${parsed.cStat || 'desconhecido'}`,
        xml_nfe: signedXml,
        xml_protocolo: sefazResponseXml,
        numero_protocolo: parsed.protocolNumber || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    let fiscalSnapshotSyncError = false;
    if (parsed.authorized) {
      try {
        const invoiceLines = parseAuthorizedInvoiceLines(signedXml);
        const { error: linesError } = await supabase.from('nfe_document_items').upsert(
          invoiceLines.map((line) => ({
            document_id: documentId,
            item_number: line.invoiceItemNumber,
            product_code: line.productCode,
            description: line.description,
            billed_quantity: line.billedQuantity,
            unit_value: line.unitValue,
            gross_value: line.grossValue,
            discount_value: line.discountValue,
            product_xml: line.productXml,
            taxes_xml: line.taxesXml,
          })),
          { onConflict: 'document_id,item_number' }
        );
        if (linesError) {
          fiscalSnapshotSyncError = true;
          console.error(
            '[NF-e Emit] Nota autorizada, mas itens fiscais precisam de reconciliação:',
            linesError.message
          );
        }
      } catch (snapshotError: any) {
        fiscalSnapshotSyncError = true;
        console.error(
          '[NF-e Emit] Nota autorizada sem snapshot fiscal de itens:',
          snapshotError?.message || 'erro de leitura'
        );
      }
    }

    return res.status(200).json({
      success: parsed.authorized,
      pending: parsed.pending,
      cStat: parsed.cStat,
      xMotivo: parsed.xMotivo,
      protocolNumber: parsed.protocolNumber,
      protocolDate: parsed.protocolDate,
      reconciliationRequired: fiscalSnapshotSyncError || Boolean(documentPersistError),
      signedXml,
      sefazResponseXml,
    });
  } catch (err: any) {
    console.error('[NF-e Emit] Erro inesperado:', err);
    if (supabase && reservedDocumentId && !transmissionStarted) {
      await supabase
        .from('nfe_documents')
        .update({
          status: 'erro',
          motivo_status: 'Falha antes da transmissão à SEFAZ; nenhuma autorização foi confirmada.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservedDocumentId);
    }
    return res.status(500).json({ error: err.message || 'Erro interno ao processar NF-e.' });
  }
}
