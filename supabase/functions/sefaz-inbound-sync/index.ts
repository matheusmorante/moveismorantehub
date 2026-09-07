import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import forge from "https://esm.sh/node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEFAZ_DFE_URL_PROD = "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
const SEFAZ_DFE_URL_HOM = "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";

// Função para extrair texto de tags XML simples sem bibliotecas pesadas
function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function extractAllXmlTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${tag}>`, "gi");
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

// Extrair PEM (Certificado e Chave Privada) a partir de PFX Base64 em memória
function extractPemFromPfx(pfxBase64: string, password: string): { certPem: string; keyPem: string } {
  const pfxDer = forge.util.decode64(pfxBase64);
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

  let leafCertPem = "";
  let caChainPem = "";
  let keyPem = "";

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.key) {
        keyPem = forge.pki.privateKeyToPem(safeBag.key);
      }
      if (safeBag.cert) {
        const pem = forge.pki.certificateToPem(safeBag.cert);
        // O primeiro certificado associado à chave privada é o folha
        if (!leafCertPem) {
          leafCertPem = pem;
        } else {
          caChainPem += pem + "\n";
        }
      }
    }
  }

  // Se o P12 tiver a propriedade getBags
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];

  if (keyBags.length > 0 && keyBags[0].key) {
    keyPem = forge.pki.privateKeyToPem(keyBags[0].key);
  }

  if (certBags.length > 0) {
    leafCertPem = forge.pki.certificateToPem(certBags[0].cert);
    caChainPem = certBags.slice(1).map((b: any) => forge.pki.certificateToPem(b.cert)).join("\n");
  }

  if (!leafCertPem || !keyPem) {
    throw new Error("Não foi possível extrair o certificado e/ou a chave privada do arquivo .pfx com a senha fornecida.");
  }

  // Enviar apenas o certificado folha (como no Node.js que conectou perfeitamente)
  return { certPem: leafCertPem.trim(), keyPem: keyPem.trim() };
}

// Descompactar GZip Base64 usando a API de streams nativa do Deno
async function decompressGzipBase64(b64: string): Promise<string> {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }

  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();

  const response = new Response(ds.readable);
  const arrayBuffer = await response.arrayBuffer();
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(arrayBuffer);
}

// Montar Envelope SOAP oficial
function buildSoapEnvelope(cleanCnpj: string, nsu: string, tpAmb: "1" | "2"): string {
  const paddedNsu = nsu.padStart(15, "0");
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>${tpAmb}</tpAmb>
          <cUFAutor>41</cUFAutor>
          <CNPJ>${cleanCnpj}</CNPJ>
          <distNSU>
            <ultNSU>${paddedNsu}</ultNSU>
          </distNSU>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
}

// Parser de NF-e completa (resNFe ou infNFe)
function parseNfeXml(xmlString: string, nsu: string) {
  // Caso seja XML completo de NF-e
  if (xmlString.includes("<infNFe") || xmlString.includes("<nfeProc")) {
    const infNfeIdMatch = xmlString.match(/<infNFe[^>]*Id=["']([^"']+)["']/i);
    let chaveAcesso = "";
    if (infNfeIdMatch && infNfeIdMatch[1]) {
      chaveAcesso = infNfeIdMatch[1].replace(/^NFe/i, "").trim();
    } else {
      chaveAcesso = extractXmlTag(xmlString, "chNFe");
    }

    if (!chaveAcesso || chaveAcesso.length !== 44) return null;

    const ideBlock = extractXmlTag(xmlString, "ide");
    const nNF = parseInt(extractXmlTag(ideBlock, "nNF"), 10) || 0;
    const serie = extractXmlTag(ideBlock, "serie") || "1";
    const rawData = extractXmlTag(ideBlock, "dhEmi") || extractXmlTag(ideBlock, "dEmi");
    const dataEmissao = rawData ? new Date(rawData).toISOString() : new Date().toISOString();

    const emitBlock = extractXmlTag(xmlString, "emit");
    const emitCnpj = extractXmlTag(emitBlock, "CNPJ") || extractXmlTag(emitBlock, "CPF");
    const emitNome = extractXmlTag(emitBlock, "xNome") || "Fornecedor";
    const emitFantasia = extractXmlTag(emitBlock, "xFant") || null;
    const emitUf = extractXmlTag(emitBlock, "UF") || "PR";

    const destBlock = extractXmlTag(xmlString, "dest");
    const destCnpj = extractXmlTag(destBlock, "CNPJ") || extractXmlTag(destBlock, "CPF") || "44.512.248/0001-07";
    const destNome = extractXmlTag(destBlock, "xNome") || "MOVEIS MORANTE";

    const totalBlock = extractXmlTag(xmlString, "total");
    const icmsTot = extractXmlTag(totalBlock, "ICMSTot") || totalBlock;
    const valorProdutos = parseFloat(extractXmlTag(icmsTot, "vProd") || "0");
    const valorFrete = parseFloat(extractXmlTag(icmsTot, "vFrete") || "0");
    const valorIpi = parseFloat(extractXmlTag(icmsTot, "vIPI") || "0");
    const valorTotal = parseFloat(extractXmlTag(icmsTot, "vNF") || "0");

    // Itens
    const detBlocks = extractAllXmlTags(xmlString, "det");
    const itens = detBlocks.map((det, idx) => {
      const prod = extractXmlTag(det, "prod");
      const ipi = extractXmlTag(det, "IPI");
      const qCom = parseFloat(extractXmlTag(prod, "qCom") || "1");
      const vUnCom = parseFloat(extractXmlTag(prod, "vUnCom") || "0");
      const vProd = parseFloat(extractXmlTag(prod, "vProd") || `${qCom * vUnCom}`);
      return {
        itemNumber: idx + 1,
        productCode: extractXmlTag(prod, "cProd"),
        productDescription: extractXmlTag(prod, "xProd"),
        ncm: extractXmlTag(prod, "NCM"),
        cfop: extractXmlTag(prod, "CFOP"),
        unit: extractXmlTag(prod, "uCom") || "UN",
        quantity: qCom,
        unitCost: vUnCom,
        totalCost: vProd,
        freightValue: parseFloat(extractXmlTag(prod, "vFrete") || "0"),
        ipiValue: parseFloat(extractXmlTag(ipi, "vIPI") || "0"),
      };
    });

    return {
      chave_acesso: chaveAcesso,
      numero_nfe: nNF,
      serie,
      data_emissao: dataEmissao,
      emitente_cnpj: emitCnpj,
      emitente_nome: emitNome,
      emitente_fantasia: emitFantasia,
      emitente_uf: emitUf,
      destinatario_cnpj: destCnpj,
      destinatario_nome: destNome,
      valor_produtos: valorProdutos,
      valor_total: valorTotal,
      valor_frete: valorFrete,
      valor_ipi: valorIpi,
      status_sefaz: "autorizada",
      status_recebimento: "pendente",
      xml_conteudo: xmlString,
      itens,
      nsu,
    };
  }

  // Caso seja Resumo da NF-e (resNFe)
  if (xmlString.includes("<resNFe")) {
    const chaveAcesso = extractXmlTag(xmlString, "chNFe");
    if (!chaveAcesso || chaveAcesso.length !== 44) return null;

    const emitCnpj = extractXmlTag(xmlString, "CNPJ") || extractXmlTag(xmlString, "CPF");
    const emitNome = extractXmlTag(xmlString, "xNome") || "Fornecedor (Resumo DF-e)";
    const rawData = extractXmlTag(xmlString, "dhEmi");
    const valorTotal = parseFloat(extractXmlTag(xmlString, "vNF") || "0");

    // Extrai número da NF-e a partir da chave de acesso (posições 25 a 34 da chave de 44 dígitos)
    const nNF = parseInt(chaveAcesso.substring(25, 34), 10) || 0;
    const serie = chaveAcesso.substring(22, 25).replace(/^0+/, "") || "1";

    return {
      chave_acesso: chaveAcesso,
      numero_nfe: nNF,
      serie,
      data_emissao: rawData ? new Date(rawData).toISOString() : new Date().toISOString(),
      emitente_cnpj: emitCnpj,
      emitente_nome: emitNome,
      emitente_fantasia: null,
      emitente_uf: "PR",
      destinatario_cnpj: "44.512.248/0001-07",
      destinatario_nome: "MOVEIS MORANTE",
      valor_produtos: valorTotal,
      valor_total: valorTotal,
      valor_frete: 0,
      valor_ipi: 0,
      status_sefaz: "autorizada",
      status_recebimento: "pendente",
      xml_conteudo: xmlString,
      itens: [],
      nsu,
    };
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`[sefaz-inbound-sync] Iniciando ciclo de sincronização DF-e...`);

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));
    const { cnpj: requestedCnpj, environment = "production" } = body;

    // 1. Obter dados da empresa e certificado de forma segura (Prioridade: Secrets > Settings)
    let certBase64 = Deno.env.get("SEFAZ_CERTIFICATE_BASE64") || "";
    let certPassword = Deno.env.get("SEFAZ_CERTIFICATE_PASSWORD") || "";
    let cnpj = requestedCnpj || Deno.env.get("SEFAZ_CNPJ") || "";

    if (!certBase64 || !certPassword || !cnpj) {
      const { data: settingsData, error: settingsError } = await supabaseClient
        .from("settings")
        .select("data")
        .eq("id", "app")
        .single();

      if (!settingsError && settingsData?.data) {
        const d = settingsData.data;
        if (!certBase64 && d.certificateBase64) certBase64 = d.certificateBase64;
        if (!certPassword && d.certificatePassword) certPassword = d.certificatePassword;
        if (!cnpj && d.companyCnpj) cnpj = d.companyCnpj;
      }
    }

    const cleanCnpj = cnpj.replace(/\D/g, "");

    if (!cleanCnpj) {
      throw new Error("CNPJ da empresa emitente não configurado.");
    }
    if (!certBase64 || !certPassword) {
      throw new Error("Certificado digital A1 (.pfx) ou senha não configurados.");
    }

    // 2. Trava de concorrência: impedir duas sincronizações simultâneas para o mesmo CNPJ
    const { data: nsuRecord, error: nsuError } = await supabaseClient
      .from("sefaz_nsu_control")
      .select("*")
      .eq("id", "default")
      .single();

    if (nsuError && nsuError.code !== "PGRST116") {
      throw new Error("Falha ao ler controle de NSU: " + nsuError.message);
    }

    if (nsuRecord?.status === "syncing") {
      const lastSync = nsuRecord.last_sync_at ? new Date(nsuRecord.last_sync_at).getTime() : 0;
      // Se estiver sincronizando há menos de 3 minutos, evita corrida
      if (Date.now() - lastSync < 180000) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Uma sincronização já está em andamento para este CNPJ.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }
    }

    let currentUltNsu = nsuRecord?.last_nsu || "0";
    let currentMaxNsu = nsuRecord?.max_nsu || "0";

    // Marcar status como syncing
    await supabaseClient
      .from("sefaz_nsu_control")
      .upsert({
        id: "default",
        cnpj: cleanCnpj,
        status: "syncing",
        last_sync_at: new Date().toISOString(),
      });

    // 3. Extrair PEM em memória
    console.log(`[sefaz-inbound-sync] Extraindo certificados PEM em memória...`);
    const { certPem, keyPem } = extractPemFromPfx(certBase64, certPassword);

    // 4. Criar Deno HttpClient com mTLS (SEFAZ exige estritamente HTTP/1.1 e rejeita HTTP/2)
    const tpAmb = environment === "production" ? "1" : "2";
    const targetUrl = environment === "production" ? SEFAZ_DFE_URL_PROD : SEFAZ_DFE_URL_HOM;

    const httpClient = (Deno as any).createHttpClient({
      cert: certPem,
      key: keyPem,
      http2: false,
      alpnProtocols: ["http/1.1"],
    });

    let totalPersisted = 0;
    let keepConsuming = true;
    let iteration = 0;
    const MAX_ITERATIONS = 20; // limite de segurança por rodada

    let finalCStat = "";
    let finalXMotivo = "";

    console.log(`[sefaz-inbound-sync] Conectando ao NFeDistribuicaoDFe (mTLS) em ${targetUrl}. NSU inicial: ${currentUltNsu}`);

    while (keepConsuming && iteration < MAX_ITERATIONS) {
      iteration++;
      const soapEnvelope = buildSoapEnvelope(cleanCnpj, currentUltNsu, tpAmb);

      const hostHeader = environment === "production" ? "www1.nfe.fazenda.gov.br" : "hom1.nfe.fazenda.gov.br";

      const response = await fetch(targetUrl, {
        method: "POST",
        client: httpClient,
        headers: {
          "Host": hostHeader,
          "User-Agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)",
          "Content-Type": "application/soap+xml;charset=utf-8;action=\"http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse\"",
          "Accept": "application/soap+xml, multipart/related, text/html, image/gif, image/jpeg, *; q=.2, */*; q=.2",
          "Connection": "keep-alive",
        },
        body: soapEnvelope,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Erro HTTP ${response.status} retornado pelo webservice da SEFAZ: ${errText.substring(0, 300)}`);
      }

      const responseXml = await response.text();

      // Extrair retorno
      const cStat = extractXmlTag(responseXml, "cStat");
      const xMotivo = extractXmlTag(responseXml, "xMotivo");
      const ultNsuRetornado = extractXmlTag(responseXml, "ultNSU");
      const maxNsuRetornado = extractXmlTag(responseXml, "maxNSU");

      finalCStat = cStat;
      finalXMotivo = xMotivo;

      console.log(`[sefaz-inbound-sync] Iteração ${iteration}: cStat=${cStat}, xMotivo="${xMotivo}", ultNSU=${ultNsuRetornado}, maxNSU=${maxNsuRetornado}`);

      // cStat 138: Documento localizado para o NSU
      // cStat 137: Nenhum documento localizado para o NSU solicitado
      // cStat 656: Consumo indevido (deve aguardar 1 hora)
      if (cStat === "656") {
        console.warn(`[sefaz-inbound-sync] Consumo indevido detectado pela SEFAZ (cStat 656). Encerrando ciclo.`);
        keepConsuming = false;
        break;
      }

      if (cStat !== "138" && cStat !== "137") {
        console.warn(`[sefaz-inbound-sync] SEFAZ retornou cStat não usual: ${cStat} - ${xMotivo}`);
        keepConsuming = false;
        break;
      }

      // Processar os pacotes docZip
      const docZipBlocks = extractAllXmlTags(responseXml, "docZip");
      console.log(`[sefaz-inbound-sync] Lote contém ${docZipBlocks.length} documento(s) compactado(s).`);

      for (const docB64 of docZipBlocks) {
        try {
          const unzippedXml = await decompressGzipBase64(docB64);
          const parsed = parseNfeXml(unzippedXml, ultNsuRetornado);

          if (parsed && parsed.chave_acesso) {
            // Upsert seguro: nunca duplicar NF-e; chave_acesso é UNIQUE
            const { error: upsertErr } = await supabaseClient
              .from("inbound_invoices")
              .upsert(parsed, { onConflict: "chave_acesso" });

            if (!upsertErr) {
              totalPersisted++;
            } else {
              console.warn(`[sefaz-inbound-sync] Erro ao persistir nota ${parsed.chave_acesso}:`, upsertErr.message);
            }
          }
        } catch (docErr: any) {
          console.error(`[sefaz-inbound-sync] Erro ao descompactar ou processar docZip:`, docErr.message);
        }
      }

      // Atualizar NSU após persistência com sucesso
      if (ultNsuRetornado) {
        currentUltNsu = ultNsuRetornado;
      }
      if (maxNsuRetornado) {
        currentMaxNsu = maxNsuRetornado;
      }

      await supabaseClient
        .from("sefaz_nsu_control")
        .upsert({
          id: "default",
          cnpj: cleanCnpj,
          last_nsu: currentUltNsu,
          max_nsu: currentMaxNsu,
          status: "idle",
          last_sync_at: new Date().toISOString(),
          last_error: null,
        });

      // Se ultNSU chegou no maxNSU ou cStat 137, não há mais lotes imediatos
      const numUlt = BigInt(currentUltNsu || "0");
      const numMax = BigInt(currentMaxNsu || "0");
      if (cStat === "137" || numUlt >= numMax || docZipBlocks.length === 0) {
        keepConsuming = false;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[sefaz-inbound-sync] Ciclo finalizado em ${durationMs}ms. cStat=${finalCStat}, xMotivo="${finalXMotivo}", ultNSU=${currentUltNsu}, maxNSU=${currentMaxNsu}, notas_persistidas=${totalPersisted}`);

    return new Response(
      JSON.stringify({
        success: true,
        cStat: finalCStat,
        xMotivo: finalXMotivo,
        ultNSU: currentUltNsu,
        maxNSU: currentMaxNsu,
        newDocsCount: totalPersisted,
        durationMs,
        message: `Sincronização real com NFeDistribuicaoDFe concluída. cStat: ${finalCStat} (${finalXMotivo}).`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("[sefaz-inbound-sync] Falha fatal no ciclo de sincronização:", err);

    // Gravar erro no controle
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await supabaseClient
        .from("sefaz_nsu_control")
        .update({
          status: "error",
          last_error: err.message || "Erro desconhecido",
        })
        .eq("id", "default");
    } catch {}

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Erro interno na conexão com SEFAZ.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
