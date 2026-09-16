export function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

export function extractAllXmlTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${tag}>`, "gi");
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

export function parseNfeXml(xmlString: string, nsu: string) {
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
    const valorIcms = parseFloat(extractXmlTag(icmsTot, "vICMS") || "0");
    const valorIcmsSt = parseFloat(extractXmlTag(icmsTot, "vST") || extractXmlTag(icmsTot, "vICMSST") || "0");

    // Itens
    const detBlocks = extractAllXmlTags(xmlString, "det");
    const itens = detBlocks.map((det, idx) => {
      const prod = extractXmlTag(det, "prod");
      const ipi = extractXmlTag(det, "IPI");
      const icms = extractXmlTag(det, "ICMS");
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
        icmsValue: parseFloat(extractXmlTag(icms, "vICMS") || "0"),
        icmsBaseValue: parseFloat(extractXmlTag(icms, "vBC") || "0"),
        icmsPercent: parseFloat(extractXmlTag(icms, "pICMS") || "0"),
        icmsStValue: parseFloat(extractXmlTag(icms, "vICMSST") || extractXmlTag(icms, "vST") || "0"),
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
      valor_icms: valorIcms,
      valor_icms_st: valorIcmsSt,
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
      valor_icms: 0,
      valor_icms_st: 0,
      status_sefaz: "autorizada",
      status_recebimento: "pendente",
      xml_conteudo: xmlString,
      itens: [],
      nsu,
    };
  }

  return null;
}
