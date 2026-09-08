import { InboundInvoice, InboundInvoiceItem } from './inboundNfeTypes';

const extractTag = (xml: string, tag: string): string => {
    const regex = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
};

const extractTagBlocks = (xml: string, tag: string): string[] => {
    const regex = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${tag}>`, 'gi');
    const blocks: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
        blocks.push(match[1]);
    }
    return blocks;
};

export const parseInboundNfeXml = (xmlString: string): InboundInvoice => {
    if (!xmlString || typeof xmlString !== 'string' || !xmlString.includes('<')) {
        throw new Error('O arquivo XML enviado é inválido ou está vazio.');
    }

    // Busca o atributo Id de infNFe
    const infNfeIdMatch = xmlString.match(/<infNFe[^>]*Id=["']([^"']+)["']/i);
    let nfeKey = '';
    if (infNfeIdMatch && infNfeIdMatch[1]) {
        nfeKey = infNfeIdMatch[1].replace(/^NFe/i, '').trim();
    } else {
        // Fallback: tenta buscar chNFe se for protNFe
        const chNFe = extractTag(xmlString, 'chNFe');
        if (chNFe) nfeKey = chNFe;
    }

    if (nfeKey.length !== 44) {
        throw new Error(`Chave de acesso da NF-e inválida (encontrado ${nfeKey.length} dígitos, esperado 44 dígitos).`);
    }

    const ideBlock = extractTag(xmlString, 'ide');
    const nfeNumber = extractTag(ideBlock, 'nNF');
    const model = extractTag(ideBlock, 'mod');
    if (model === '65') {
        throw new Error('NFC-e (modelo 65) não pode ser importada como NF de Entrada. Envie uma NF-e de fornecedor, modelo 55.');
    }
    const series = extractTag(ideBlock, 'serie') || '1';
    const rawIssuedAt = extractTag(ideBlock, 'dhEmi') || extractTag(ideBlock, 'dEmi');
    const issuedAt = rawIssuedAt ? new Date(rawIssuedAt).toISOString() : new Date().toISOString();

    const emitBlock = extractTag(xmlString, 'emit');
    const emitterCnpj = extractTag(emitBlock, 'CNPJ') || extractTag(emitBlock, 'CPF');
    const emitterName = extractTag(emitBlock, 'xNome') || 'Fornecedor';
    const emitterTradeName = extractTag(emitBlock, 'xFant');

    const destBlock = extractTag(xmlString, 'dest');
    const recipientCnpj = extractTag(destBlock, 'CNPJ') || extractTag(destBlock, 'CPF');
    const recipientName = extractTag(destBlock, 'xNome');

    const totalBlock = extractTag(xmlString, 'total');
    const icmsTotBlock = extractTag(totalBlock, 'ICMSTot') || totalBlock;
    const totalProducts = parseFloat(extractTag(icmsTotBlock, 'vProd') || '0');
    const totalFreight = parseFloat(extractTag(icmsTotBlock, 'vFrete') || '0');
    const totalIpi = parseFloat(extractTag(icmsTotBlock, 'vIPI') || '0');
    const totalInvoice = parseFloat(extractTag(icmsTotBlock, 'vNF') || `${totalProducts + totalFreight + totalIpi}`);

    const detBlocks = extractTagBlocks(xmlString, 'det');
    const items: InboundInvoiceItem[] = detBlocks.map((det, index) => {
        const prodBlock = extractTag(det, 'prod');
        if (!prodBlock) return null;

        const productCode = extractTag(prodBlock, 'cProd');
        const productDescription = extractTag(prodBlock, 'xProd');
        const ncm = extractTag(prodBlock, 'NCM');
        const cfop = extractTag(prodBlock, 'CFOP');
        const unit = extractTag(prodBlock, 'uCom') || 'UN';
        const quantity = parseFloat(extractTag(prodBlock, 'qCom') || '1');
        const unitCost = parseFloat(extractTag(prodBlock, 'vUnCom') || '0');
        const totalCost = parseFloat(extractTag(prodBlock, 'vProd') || `${quantity * unitCost}`);
        const freightValue = parseFloat(extractTag(prodBlock, 'vFrete') || '0');

        const ipiBlock = extractTag(det, 'IPI');
        const ipiValue = parseFloat(extractTag(ipiBlock, 'vIPI') || '0');

        return {
            itemNumber: index + 1,
            productCode,
            productDescription,
            ncm,
            cfop,
            unit,
            quantity,
            unitCost,
            totalCost,
            freightValue,
            ipiValue
        };
    }).filter(Boolean) as InboundInvoiceItem[];

    return {
        id: `inbound_${nfeKey}`,
        nfeKey,
        nfeNumber,
        series,
        model,
        issuedAt,
        emitterCnpj,
        emitterName,
        emitterTradeName,
        recipientCnpj,
        recipientName,
        totalProducts,
        totalFreight,
        totalIpi,
        totalInvoice,
        status: 'pending',
        itemsCount: items.length,
        items,
        rawXml: xmlString,
        createdAt: new Date().toISOString()
    };
};
