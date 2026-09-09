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
    const rawEntryExitAt = extractTag(ideBlock, 'dhSaiEnt') || extractTag(ideBlock, 'dSaiEnt');

    const emitBlock = extractTag(xmlString, 'emit');
    const emitterCnpj = extractTag(emitBlock, 'CNPJ') || extractTag(emitBlock, 'CPF');
    const emitterName = extractTag(emitBlock, 'xNome') || 'Fornecedor';
    const emitterTradeName = extractTag(emitBlock, 'xFant');
    const emitterIe = extractTag(emitBlock, 'IE');
    const emitterAddressBlock = extractTag(emitBlock, 'enderEmit');
    const emitterAddress = emitterAddressBlock ? {
        street: extractTag(emitterAddressBlock, 'xLgr'), number: extractTag(emitterAddressBlock, 'nro'),
        complement: extractTag(emitterAddressBlock, 'xCpl'), neighborhood: extractTag(emitterAddressBlock, 'xBairro'),
        city: extractTag(emitterAddressBlock, 'xMun'), state: extractTag(emitterAddressBlock, 'UF'),
        zipCode: extractTag(emitterAddressBlock, 'CEP'), country: extractTag(emitterAddressBlock, 'xPais'),
    } : undefined;

    const destBlock = extractTag(xmlString, 'dest');
    const recipientCnpj = extractTag(destBlock, 'CNPJ') || extractTag(destBlock, 'CPF');
    const recipientName = extractTag(destBlock, 'xNome');

    const totalBlock = extractTag(xmlString, 'total');
    const icmsTotBlock = extractTag(totalBlock, 'ICMSTot') || totalBlock;
    const totalProducts = parseFloat(extractTag(icmsTotBlock, 'vProd') || '0');
    const totalFreight = parseFloat(extractTag(icmsTotBlock, 'vFrete') || '0');
    const totalIpi = parseFloat(extractTag(icmsTotBlock, 'vIPI') || '0');
    const totalDiscount = parseFloat(extractTag(icmsTotBlock, 'vDesc') || '0');
    const totalInsurance = parseFloat(extractTag(icmsTotBlock, 'vSeg') || '0');
    const totalOtherExpenses = parseFloat(extractTag(icmsTotBlock, 'vOutro') || '0');
    const totalIcms = parseFloat(extractTag(icmsTotBlock, 'vICMS') || '0');
    const totalIcmsSt = parseFloat(extractTag(icmsTotBlock, 'vST') || extractTag(icmsTotBlock, 'vICMSST') || '0');
    const totalInvoice = parseFloat(extractTag(icmsTotBlock, 'vNF') || `${totalProducts + totalFreight + totalIpi}`);

    const detBlocks = extractTagBlocks(xmlString, 'det');
    const items: InboundInvoiceItem[] = detBlocks.map((det, index) => {
        const prodBlock = extractTag(det, 'prod');
        if (!prodBlock) return null;

        const productCode = extractTag(prodBlock, 'cProd');
        const productDescription = extractTag(prodBlock, 'xProd');
        const ean = extractTag(prodBlock, 'cEAN');
        const ncm = extractTag(prodBlock, 'NCM');
        const cest = extractTag(prodBlock, 'CEST');
        const exTipi = extractTag(prodBlock, 'EXTIPI');
        const cfop = extractTag(prodBlock, 'CFOP');
        const unit = extractTag(prodBlock, 'uCom') || 'UN';
        const quantity = parseFloat(extractTag(prodBlock, 'qCom') || '1');
        const unitCost = parseFloat(extractTag(prodBlock, 'vUnCom') || '0');
        const totalCost = parseFloat(extractTag(prodBlock, 'vProd') || `${quantity * unitCost}`);
        const freightValue = parseFloat(extractTag(prodBlock, 'vFrete') || '0');
        const insuranceValue = parseFloat(extractTag(prodBlock, 'vSeg') || '0');
        const otherExpensesValue = parseFloat(extractTag(prodBlock, 'vOutro') || '0');
        const discountValue = parseFloat(extractTag(prodBlock, 'vDesc') || '0');

        const ipiBlock = extractTag(det, 'IPI');
        const ipiValue = parseFloat(extractTag(ipiBlock, 'vIPI') || '0');
        const ipiPercent = parseFloat(extractTag(ipiBlock, 'pIPI') || '0');
        const ipiCst = extractTag(ipiBlock, 'CST') || extractTag(ipiBlock, 'cEnq');
        const icmsBlock = extractTag(det, 'ICMS');
        const icmsValue = parseFloat(extractTag(icmsBlock, 'vICMS') || '0');
        const icmsBaseValue = parseFloat(extractTag(icmsBlock, 'vBC') || '0');
        const icmsPercent = parseFloat(extractTag(icmsBlock, 'pICMS') || '0');
        const icmsStValue = parseFloat(extractTag(icmsBlock, 'vICMSST') || extractTag(icmsBlock, 'vST') || '0');
        const icmsStBaseValue = parseFloat(extractTag(icmsBlock, 'vBCST') || '0');
        const icmsStPercent = parseFloat(extractTag(icmsBlock, 'pICMSST') || '0');

        return {
            itemNumber: index + 1,
            productCode,
            productDescription,
            ean,
            ncm,
            cest,
            exTipi,
            cfop,
            unit,
            quantity,
            unitCost,
            totalCost,
            freightValue,
            insuranceValue,
            otherExpensesValue,
            discountValue,
            ipiValue, ipiPercent, ipiCst, icmsValue, icmsBaseValue, icmsPercent,
            icmsStValue, icmsStBaseValue, icmsStPercent,
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
        emitterIe,
        emitterAddress,
        recipientCnpj,
        recipientName,
        totalProducts,
        totalFreight,
        totalIpi,
        totalDiscount,
        totalInsurance,
        totalOtherExpenses,
        totalIcms,
        totalIcmsSt,
        freightPercent: totalProducts ? totalFreight / totalProducts * 100 : 0,
        ipiPercent: totalProducts ? totalIpi / totalProducts * 100 : 0,
        operationNature: extractTag(ideBlock, 'natOp'),
        entryExitAt: rawEntryExitAt ? new Date(rawEntryExitAt).toISOString() : undefined,
        protocol: extractTag(xmlString, 'nProt'),
        additionalInfo: extractTag(extractTag(xmlString, 'infAdic'), 'infCpl') || undefined,
        totalInvoice,
        status: 'pending',
        itemsCount: items.length,
        items,
        rawXml: xmlString,
        createdAt: new Date().toISOString()
    };
};
