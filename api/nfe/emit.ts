import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import { randomUUID } from 'node:crypto';
import { sefazTransportDiagnostic } from './sefazTransportDiagnostic';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { parseAuthorizedInvoiceLines } from '../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import { validateOrdinaryOutboundEnvelope } from '../../erp/src/pages/utils/nfe/fiscalEnvelope';
import { isNfeProductionEnabled } from './productionGuard';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { validateNfeAgainstOfficialSchema } from './schemaValidator';
import {
  emitHmlTechnical,
  recoverHmlTechnical,
  retryHmlTechnical,
  isHmlRuleSet,
} from './emitHmlTechnical';
import { embeddedNfeXml } from './xmlEnvelope';
import {
  appendResponsibleTechnician,
  getResponsibleTechnicianConfig,
  hasResponsibleTechnicianCsrt,
} from './responsibleTechnician';
import {
  parseFiscalEmissionCommand,
  resolveFiscalDocument,
  type FiscalIssuerProfileKey,
  type FiscalJsonValue,
  type FiscalSnapshotCandidate,
} from './fiscalSnapshot';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseServiceKey = getSupabaseSecretKey() || '';

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

type RetryResponseMetadata = {
  documentId: string;
  orderId: string;
  accessKey: string;
  nfeNumber: number;
  series: string;
  model: '55' | '65';
  environment: 1 | 2;
};

type RetryDocument = {
  id: string;
  order_id: string;
  status: string;
  xml_nfe: string | null;
  chave_acesso: string;
  numero_nfe: number;
  serie: string;
  modelo: string;
  ambiente: number;
  motivo_status: string | null;
  fiscal_ruleset_version?: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let supabase: ReturnType<typeof createClient<FiscalDatabase>> | undefined;
  let reservedDocumentId: string | undefined;
  let retryResponseMetadata: RetryResponseMetadata | undefined;
  let retryCertificate: ReturnType<typeof extractCertificateAndKey> | undefined;
  let transmissionStarted = false;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      xml: submittedXml,
      environment: submittedEnvironment,
      orderId: submittedOrderId,
      nfeNumber,
      series,
      model: submittedModel,
      accessKey,
      productionConfirmed,
      emissionRequestId,
      fiscalSnapshotId,
      fiscalSnapshotHash,
    } = req.body;
    let xml = typeof submittedXml === 'string' ? submittedXml : '';
    let orderId = String(submittedOrderId || '');
    let model = String(submittedModel || '');
    let selectedEnvironment = Number(submittedEnvironment);
    let retryDoc: RetryDocument | null = null;

    if (!req.body.retryDocumentId) {
      const parsedCommand = parseFiscalEmissionCommand(req.body);
      if ('error' in parsedCommand)
        return res.status(400).json({
          success: false,
          code: 'INVALID_FISCAL_EMISSION_COMMAND',
          error: parsedCommand.error,
        });
      const command = parsedCommand.command;

      if (!supabaseServiceKey)
        return res.status(503).json({
          success: false,
          error: 'Serviço fiscal sem credencial segura do banco.',
        });
      supabase = createClient<FiscalDatabase>(supabaseUrl, supabaseServiceKey);
      const fiscalAuthorization = await authorizeFiscalOperator(
        supabase,
        req.headers.authorization
      );
      if (!fiscalAuthorization.ok)
        return res.status(fiscalAuthorization.status).json({
          success: false,
          error: fiscalAuthorization.message,
        });

      if (command.environment === 1)
        return res.status(503).json({
          success: false,
          code: 'PRODUCTION_FISCAL_RULESET_REQUIRED',
          error: 'Produção exige uma matriz fiscal aprovada e um pipeline próprio.',
        });

      const recovered = await recoverHmlTechnical(supabase, command);
      if (recovered) return res.status(recovered.status).json(recovered.body);

      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .select('id,order_type,status,deleted,order_data,version,updated_at')
        .eq('id', command.orderId)
        .maybeSingle();
      if (orderError)
        return res.status(503).json({
          success: false,
          code: 'FISCAL_ORDER_SNAPSHOT_UNAVAILABLE',
          error: 'Não foi possível carregar a revisão fiscal do pedido no servidor.',
        });
      if (!orderRow)
        return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
      if (
        !['sale', 'showroom'].includes(String(orderRow.order_type)) ||
        ['cancelled', 'cancelado'].includes(String(orderRow.status || '').toLowerCase())
      )
        return res.status(409).json({
          success: false,
          code: 'ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL',
          error: 'Pedido não elegível para emissão fiscal de saída.',
        });
      if (
        !orderRow.order_data ||
        typeof orderRow.order_data !== 'object' ||
        Array.isArray(orderRow.order_data) ||
        !Number.isInteger(orderRow.version) ||
        !orderRow.updated_at
      )
        return res.status(409).json({
          success: false,
          code: 'ORDER_FISCAL_SNAPSHOT_INCOMPLETE',
          error: 'Pedido sem dados ou revisão necessários para snapshot fiscal.',
        });

      const { data: settingsRow, error: settingsError } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'app')
        .maybeSingle();
      if (
        settingsError ||
        !settingsRow?.data ||
        typeof settingsRow.data !== 'object' ||
        Array.isArray(settingsRow.data)
      )
        return res.status(503).json({
          success: false,
          code: 'ISSUER_PROFILE_UNAVAILABLE',
          error: 'Perfil do emitente indisponível para preparar o snapshot fiscal.',
        });

      const issuerKeys: FiscalIssuerProfileKey[] = [
        'companyName',
        'companyAddress',
        'companyCnpj',
        'companyIE',
        'companyIM',
        'companyCRT',
        'companyLogradouro',
        'companyNumero',
        'companyBairro',
        'companyCEP',
        'companyCMun',
        'companyXMun',
        'companyUF',
        'companyPhone',
        'cscId',
      ];
      const issuerSettings = settingsRow.data as Record<string, unknown>;
      const issuerProfile = Object.fromEntries(
        issuerKeys.flatMap((key) =>
          issuerSettings[key] === null || issuerSettings[key] === undefined
            ? []
            : [[key, issuerSettings[key] as FiscalJsonValue]]
        )
      );
      const candidate: FiscalSnapshotCandidate = {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        order: {
          id: String(orderRow.id),
          type: String(orderRow.order_type),
          status: String(orderRow.status || ''),
          deleted: orderRow.deleted === true,
          version: Number(orderRow.version),
          updatedAt: String(orderRow.updated_at),
          data: orderRow.order_data as Record<string, FiscalJsonValue>,
        },
        issuerProfile,
        emissionRequest: {
          id: command.emissionRequestId,
          environment: command.environment,
          itemCsosnOverrides: command.itemCsosnOverrides,
          itemFiscalSelections: command.itemFiscalSelections,
          recipientTaxId: command.recipientTaxId,
          finalConsumer: command.finalConsumer,
          deliveryByIssuer: command.deliveryByIssuer,
          cardNotIntegrated: command.cardNotIntegrated,
          hasTransport: command.hasTransport,
          transportResponsible: command.transportResponsible,
          freightContractResponsible: command.freightContractResponsible,
          transporter: command.transporter,
          freightMode: command.freightMode,
        },
      };
      if (command.environment === 2) {
        const result = await emitHmlTechnical(supabase, command, candidate, issuerSettings);
        return res.status(result.status).json(result.body);
      }
      const determination = resolveFiscalDocument(candidate);
      if (determination.status === 'blocked')
        return res.status(422).json({
          success: false,
          code: 'FISCAL_DETERMINATION_REQUIRED',
          error: 'A emissão está bloqueada até existir matriz fiscal aprovada e ativa.',
          blockers: determination.blockers,
          numberReserved: false,
          sefazContacted: false,
        });

      // No serializer/transmission path may proceed from a client-supplied XML.
      return res.status(503).json({
        success: false,
        code: 'FISCAL_DOCUMENT_SERIALIZER_UNAVAILABLE',
        error: 'O serializador fiscal server-side ainda não está configurado.',
        numberReserved: false,
        sefazContacted: false,
      });
    }

    if (!xml && !req.body.retryDocumentId) {
      return res.status(400).json({ error: 'XML da NF-e não fornecido no payload.' });
    }

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
          String(fiscalSnapshotId || '')
        ) ||
        !/^[0-9a-f]{64}$/.test(String(fiscalSnapshotHash || '')) ||
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
      // Compatibility guard for the retired browser-built XML flow. New
      // requests return through the Fiscal Core gate above before reaching it.
      await validateNfeAgainstOfficialSchema(String(xml));
    }

    // 1. Obter configurações fiscais e certificado do banco
    if (!supabaseServiceKey)
      return res
        .status(503)
        .json({ success: false, error: 'Serviço fiscal sem credencial segura do banco.' });
    supabase = createClient<FiscalDatabase>(supabaseUrl, supabaseServiceKey);
    const fiscalAuthorization = await authorizeFiscalOperator(supabase, req.headers.authorization);
    if (!fiscalAuthorization.ok)
      return res.status(fiscalAuthorization.status).json({
        success: false,
        error: fiscalAuthorization.message,
      });

    if (req.body.retryDocumentId) {
      const { data, error } = await supabase
        .from('nfe_documents')
        .select('*')
        .eq('id', String(req.body.retryDocumentId))
        .maybeSingle();

      if (error || !data)
        return res.status(404).json({
          success: false,
          error: 'Documento original não encontrado para retransmissão.',
        });

      retryDoc = data as RetryDocument;
      orderId = String(retryDoc.order_id || '');
      model = String(retryDoc.modelo || '');
      selectedEnvironment = Number(retryDoc.ambiente);

      if (selectedEnvironment === 1)
        return res.status(503).json({
          success: false,
          code: 'PRODUCTION_FISCAL_RULESET_REQUIRED',
          error: 'Produção exige uma matriz fiscal aprovada e um pipeline próprio.',
        });

      if (!orderId || ![1, 2].includes(selectedEnvironment) || !['55', '65'].includes(model))
        return res.status(409).json({
          success: false,
          error: 'Documento original sem pedido, modelo ou ambiente fiscal válido.',
        });

      retryResponseMetadata = {
        documentId: retryDoc.id,
        orderId,
        accessKey: String(retryDoc.chave_acesso || ''),
        nfeNumber: Number(retryDoc.numero_nfe),
        series: String(retryDoc.serie || ''),
        model: model as '55' | '65',
        environment: selectedEnvironment as 1 | 2,
      };

      if (isHmlRuleSet(retryDoc.fiscal_ruleset_version)) {
        const result = await retryHmlTechnical(supabase, retryDoc.id);
        return res.status(result.status).json(result.body);
      }

      if (retryDoc.status !== 'erro')
        return res.status(409).json({
          success: false,
          ...retryResponseMetadata,
          error: 'Apenas notas em situação de Erro (217) podem ser retransmitidas.',
        });

      if (
        String(retryDoc.motivo_status || '').indexOf('217') === -1 &&
        String(retryDoc.motivo_status || '')
          .toLowerCase()
          .indexOf('não consta') === -1
      )
        return res.status(400).json({
          success: false,
          ...retryResponseMetadata,
          error:
            'Apenas notas não encontradas na SEFAZ (217) podem ser retransmitidas sem nova numeração.',
        });
    }

    if (selectedEnvironment === 1 && productionConfirmed !== true)
      return res.status(400).json({
        success: false,
        ...retryResponseMetadata,
        error: 'Confirmação explícita de Produção ausente.',
      });
    if (selectedEnvironment === 1 && !isNfeProductionEnabled(process.env.NFE_PRODUCTION_ENABLED)) {
      return res.status(503).json({
        success: false,
        ...retryResponseMetadata,
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
      return res.status(404).json({
        success: false,
        ...retryResponseMetadata,
        error: 'Pedido não encontrado para emissão fiscal.',
      });
    if (
      !['sale', 'showroom'].includes(String(orderRow.order_type)) ||
      ['cancelled', 'cancelado'].includes(String(orderRow.status).toLowerCase())
    ) {
      return res.status(409).json({
        success: false,
        ...retryResponseMetadata,
        error:
          'A emissão de saída só pode ser solicitada para pedido comercial válido. Devoluções e estornos usam o fluxo fiscal próprio.',
      });
    }

    if (!req.body.retryDocumentId) {
      const { data: fiscalSnapshot, error: snapshotError } = await supabase
        .from('nfe_fiscal_snapshots')
        .select(
          'id,emission_request_id,order_id,requested_model,environment,series,reserved_number,snapshot_sha256'
        )
        .eq('id', String(fiscalSnapshotId))
        .maybeSingle();

      if (
        snapshotError ||
        !fiscalSnapshot ||
        fiscalSnapshot.emission_request_id !== String(emissionRequestId) ||
        fiscalSnapshot.order_id !== String(orderId) ||
        fiscalSnapshot.requested_model !== String(model) ||
        Number(fiscalSnapshot.environment) !== selectedEnvironment ||
        fiscalSnapshot.series !== String(series || '1') ||
        Number(fiscalSnapshot.reserved_number) !== Number(nfeNumber) ||
        fiscalSnapshot.snapshot_sha256 !== String(fiscalSnapshotHash)
      ) {
        return res.status(409).json({
          success: false,
          error: 'O snapshot fiscal não corresponde a esta tentativa de emissão.',
        });
      }
    }

    let settings: Record<string, unknown> = {};
    if (!req.body.retryDocumentId) {
      const { data: settingsRow, error: settingsErr } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'app')
        .maybeSingle();
      if (settingsErr || !settingsRow?.data)
        return res.status(503).json({
          success: false,
          error: 'Configuração fiscal indisponível para validar o estabelecimento.',
        });
      settings = settingsRow.data as Record<string, unknown>;
    }

    if (!req.body.retryDocumentId) {
      const configuredMunicipality = String(settings.companyCMun || '');
      const xmlMunicipality = String(xml).match(/<cMunFG>(\d{7})<\/cMunFG>/)?.[1];
      if (!/^\d{7}$/.test(configuredMunicipality) || xmlMunicipality !== configuredMunicipality)
        return res.status(409).json({
          success: false,
          error:
            'O município do fato gerador no XML não corresponde ao município configurado para o estabelecimento.',
        });
    }

    if (!req.body.retryDocumentId && String(model) === '55') {
      const responsibleTechnician = getResponsibleTechnicianConfig(
        process.env,
        selectedEnvironment as 1 | 2
      );
      if (!responsibleTechnician)
        return res.status(503).json({
          success: false,
          error: 'Configuração segura do responsável técnico/CSRT indisponível para NF-e.',
        });
      try {
        xml = appendResponsibleTechnician(xml, String(accessKey), responsibleTechnician);
        await validateNfeAgainstOfficialSchema(xml);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Não foi possível preparar o grupo do responsável técnico da NF-e.',
        });
      }
    }
    let documentId: string;
    let signedXml = String(xml);

    if (req.body.retryDocumentId) {
      if (!retryDoc)
        return res
          .status(404)
          .json({ success: false, error: 'Documento original não encontrado para retransmissão.' });
      const retryXml = typeof retryDoc.xml_nfe === 'string' ? retryDoc.xml_nfe : '';
      if (String(retryDoc.modelo) === '55' && !hasResponsibleTechnicianCsrt(retryXml)) {
        return res.status(409).json({
          success: false,
          ...retryResponseMetadata,
          error:
            'XML original sem CSRT exigido pela SEFA/PR; a retransmissão imutável foi bloqueada.',
        });
      }
      const retryEnvelopeError = validateOrdinaryOutboundEnvelope({
        xml: retryXml,
        accessKey: String(retryDoc.chave_acesso || ''),
        model: String(retryDoc.modelo) as '55' | '65',
        environment: Number(retryDoc.ambiente) as 1 | 2,
        nfeNumber: Number(retryDoc.numero_nfe),
        series: String(retryDoc.serie || ''),
      });
      if (retryEnvelopeError) {
        return res.status(409).json({
          success: false,
          ...retryResponseMetadata,
          error:
            'XML persistido não confere com a chave e a numeração originais; retransmissão bloqueada.',
        });
      }
      // Stored 217 retries keep the same key and XML, but must pass the local
      // schema gate again before the document is reactivated.
      await validateNfeAgainstOfficialSchema(retryXml);

      const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
      if (!pfxBase64)
        return res.status(503).json({
          success: false,
          ...retryResponseMetadata,
          error: 'Certificado digital A1 não configurado no servidor fiscal.',
        });
      retryCertificate = extractCertificateAndKey(
        pfxBase64,
        process.env.NFE_CERTIFICATE_PASSWORD || ''
      );

      // Reativa o documento para bloquear concorrência durante a transmissão
      const { data: reactivated, error: reactivateErr } = await supabase
        .from('nfe_documents')
        .update({ status: 'processando', updated_at: new Date().toISOString() })
        .eq('id', retryDoc.id)
        .eq('status', 'erro')
        .select('id')
        .maybeSingle();
      if (reactivateErr || !reactivated)
        return res.status(409).json({
          success: false,
          ...retryResponseMetadata,
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
            return res.status(409).json({
              success: false,
              pending: true,
              documentId: rpcErr.message.split(':')[2],
              error:
                'Já existe uma tentativa ativa ou em andamento para esse pedido. Consulte a situação.',
            });
          }
          if (rpcErr.message.includes('DUPLICATE_IDEMPOTENCY')) {
            return res.status(409).json({
              success: false,
              error: 'Esta tentativa (ID de requisição) já foi registrada.',
            });
          }
          throw rpcErr;
        }

        documentId = String(reservedId);
        reservedDocumentId = documentId;
      } catch {
        return res.status(503).json({
          success: false,
          error: 'Não foi possível reservar a emissão de forma atômica. Tente novamente.',
        });
      }
    }

    // 2. A1 fica apenas no servidor; o perfil fiscal já foi carregado para validar cMunFG.
    const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
    const pfxPassword = process.env.NFE_CERTIFICATE_PASSWORD;

    if (!pfxBase64) {
      if (!req.body.retryDocumentId)
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
        ...retryResponseMetadata,
        error: 'Certificado digital A1 não configurado no servidor fiscal.',
      });
    }

    // 2. Extrair chaves criptográficas do Certificado A1
    const { privateKeyPem, certPem, certDerBase64 } =
      retryCertificate || extractCertificateAndKey(pfxBase64, pfxPassword || '');

    // Uma retransmissão 217 usa exatamente o XML assinado e persistido da tentativa original.
    // Uma nova emissão recebe a assinatura depois de gerar sua chave e numeração próprias.
    if (!req.body.retryDocumentId) {
      signedXml = signNfeXml(String(xml), privateKeyPem, certDerBase64);
    }
    // New notes are checked after signing; an immutable retry was checked
    // before the status compare-and-set above.
    if (!req.body.retryDocumentId) await validateNfeAgainstOfficialSchema(signedXml);

    // 4. Montar o lote de envio <enviNFe>
    const idLote = String(Date.now()).slice(-15);
    const enviNfeXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${embeddedNfeXml(signedXml)}</enviNFe>`;

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
      const diagnosticId = randomUUID();
      const transportDiagnostic = sefazTransportDiagnostic(soapErr);
      const attemptDiagnostic = { diagnosticId, emissionRequestId, ...transportDiagnostic };
      console.error('[NF-e Emit] Falha de transporte:', { documentId, ...attemptDiagnostic });
      // Falha de rede é ambígua: manter reserva pendente evita uma retransmissão duplicada.
      await supabase
        .from('nfe_documents')
        .update({
          status: 'pendente',
          motivo_status: `Resultado da transmissão não confirmado: ${JSON.stringify(attemptDiagnostic)}`,
          xml_nfe: signedXml,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      return res.status(502).json({
        success: false,
        pending: true,
        ...retryResponseMetadata,
        documentId,
        signedXml,
        diagnosticId,
        diagnosticStage: 'sefaz-transmission',
        transportDiagnostic,
        error:
          'Transmissão sem resposta confirmada. Consulte a chave original antes de tentar novamente.',
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
      ...retryResponseMetadata,
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
          motivo_status:
            err instanceof Error &&
            err.message.startsWith('XML da NF-e não passou pelo schema oficial')
              ? `Falha de validação XSD antes da transmissão; nenhuma autorização foi confirmada. ${err.message}`
              : 'Falha antes da transmissão à SEFAZ; nenhuma autorização foi confirmada.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservedDocumentId);
    }
    const schemaFailure =
      err instanceof Error && err.message.startsWith('XML da NF-e não passou pelo schema oficial');
    return res.status(schemaFailure ? 422 : 500).json({
      success: false,
      ...retryResponseMetadata,
      ...(schemaFailure && !req.body?.retryDocumentId
        ? { numberReserved: true, reservedNumber: Number(req.body?.nfeNumber) }
        : {}),
      error:
        schemaFailure && !req.body?.retryDocumentId
          ? `${err.message} O número ${req.body?.nfeNumber} já foi consumido pela sequência; nenhuma transmissão foi feita.`
          : err.message || 'Erro interno ao processar NF-e.',
    });
  }
}
