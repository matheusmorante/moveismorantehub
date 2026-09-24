
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

export const parseInboundNfeXml = (xmlString: string): Record<string, any> => {
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
    const items: Array<Record<string, any>> = detBlocks.map((det, index) => {
        const prodBlock = extractTag(det, 'prod');
        if (!prodBlock) return null;

        const productCode = extractTag(prodBlock, 'cProd');
        const productDescription = extractTag(prodBlock, 'xProd');
        const additionalDescription = extractTag(det, 'infAdProd') || extractTag(prodBlock, 'infAdProd') || undefined;
        const ean = extractTag(prodBlock, 'cEAN');
        const eanTrib = extractTag(prodBlock, 'cEANTrib') || undefined;
        const ncm = extractTag(prodBlock, 'NCM');
        const cest = extractTag(prodBlock, 'CEST');
        const exTipi = extractTag(prodBlock, 'EXTIPI');
        const cfop = extractTag(prodBlock, 'CFOP');
        const unit = extractTag(prodBlock, 'uCom') || 'UN';
        const quantity = parseFloat(extractTag(prodBlock, 'qCom') || '1');
        const unitCost = parseFloat(extractTag(prodBlock, 'vUnCom') || '0');
        const totalCost = parseFloat(extractTag(prodBlock, 'vProd') || `${quantity * unitCost}`);
        const tributaryUnit = extractTag(prodBlock, 'uTrib') || undefined;
        const tributaryQuantity = parseFloat(extractTag(prodBlock, 'qTrib') || '0') || undefined;
        const tributaryUnitCost = parseFloat(extractTag(prodBlock, 'vUnTrib') || '0') || undefined;
        const purchaseOrder = extractTag(prodBlock, 'xPed') || undefined;
        const purchaseOrderItem = extractTag(prodBlock, 'nItemPed') || undefined;
        
        const freightValue = parseFloat(extractTag(prodBlock, 'vFrete') || '0');
        const insuranceValue = parseFloat(extractTag(prodBlock, 'vSeg') || '0');
        const otherExpensesValue = parseFloat(extractTag(prodBlock, 'vOutro') || '0');
        const discountValue = parseFloat(extractTag(prodBlock, 'vDesc') || '0');

        const impostoBlock = extractTag(det, 'imposto');
        const totalTaxes = parseFloat(extractTag(impostoBlock, 'vTotTrib') || '0');

        const ipiBlock = extractTag(impostoBlock, 'IPI');
        const ipiValue = parseFloat(extractTag(ipiBlock, 'vIPI') || '0');
        const ipiPercent = parseFloat(extractTag(ipiBlock, 'pIPI') || '0');
        const ipiCst = extractTag(ipiBlock, 'CST') || extractTag(ipiBlock, 'cEnq');
        
        const icmsBlock = extractTag(impostoBlock, 'ICMS');
        const icmsInner = extractTag(icmsBlock, 'ICMS00') || extractTag(icmsBlock, 'ICMS10') || extractTag(icmsBlock, 'ICMS20') || extractTag(icmsBlock, 'ICMS30') || extractTag(icmsBlock, 'ICMS40') || extractTag(icmsBlock, 'ICMS51') || extractTag(icmsBlock, 'ICMS60') || extractTag(icmsBlock, 'ICMS70') || extractTag(icmsBlock, 'ICMS90') || extractTag(icmsBlock, 'ICMSSN101') || extractTag(icmsBlock, 'ICMSSN102') || extractTag(icmsBlock, 'ICMSSN201') || extractTag(icmsBlock, 'ICMSSN202') || extractTag(icmsBlock, 'ICMSSN500') || extractTag(icmsBlock, 'ICMSSN900') || icmsBlock;
        
        const icmsOrigem = extractTag(icmsInner, 'orig') || undefined;
        const icmsCst = extractTag(icmsInner, 'CST') || extractTag(icmsInner, 'CSOSN') || undefined;
        const icmsValue = parseFloat(extractTag(icmsInner, 'vICMS') || '0');
        const icmsBaseValue = parseFloat(extractTag(icmsInner, 'vBC') || '0');
        const icmsPercent = parseFloat(extractTag(icmsInner, 'pICMS') || '0');
        const icmsStValue = parseFloat(extractTag(icmsInner, 'vICMSST') || extractTag(icmsInner, 'vST') || '0');
        const icmsStBaseValue = parseFloat(extractTag(icmsInner, 'vBCST') || '0');
        const icmsStPercent = parseFloat(extractTag(icmsInner, 'pICMSST') || '0');
        const fcpValue = parseFloat(extractTag(icmsInner, 'vFCP') || '0');
        const fcpStValue = parseFloat(extractTag(icmsInner, 'vFCPST') || '0');

        const pisBlock = extractTag(impostoBlock, 'PIS');
        const pisValue = parseFloat(extractTag(pisBlock, 'vPIS') || '0');
        const pisPercent = parseFloat(extractTag(pisBlock, 'pPIS') || '0');
        const pisCst = extractTag(pisBlock, 'CST') || undefined;

        const cofinsBlock = extractTag(impostoBlock, 'COFINS');
        const cofinsValue = parseFloat(extractTag(cofinsBlock, 'vCOFINS') || '0');
        const cofinsPercent = parseFloat(extractTag(cofinsBlock, 'pCOFINS') || '0');
        const cofinsCst = extractTag(cofinsBlock, 'CST') || undefined;

        const ibsCbsBlock = extractTag(impostoBlock, 'IBSCBS');
        const ibsCst = extractTag(ibsCbsBlock, 'CST') || undefined;
        const ibsValue = parseFloat(extractTag(ibsCbsBlock, 'vIBS') || '0');
        const cbsValue = parseFloat(extractTag(ibsCbsBlock, 'vCBS') || '0');

        const itemTotal = parseFloat(extractTag(det, 'vItem') || `${totalCost}`);

        return {
            itemNumber: index + 1,
            productCode,
            productDescription,
            additionalDescription,
            ean,
            eanTrib,
            ncm,
            cest,
            exTipi,
            cfop,
            unit,
            quantity,
            unitCost,
            totalCost,
            tributaryUnit,
            tributaryQuantity,
            tributaryUnitCost,
            purchaseOrder,
            purchaseOrderItem,
            freightValue,
            insuranceValue,
            otherExpensesValue,
            discountValue,
            ipiValue, ipiPercent, ipiCst, 
            icmsValue, icmsBaseValue, icmsPercent, icmsCst, icmsOrigem,
            icmsStValue, icmsStBaseValue, icmsStPercent,
            fcpValue, fcpStValue,
            pisValue, pisPercent, pisCst,
            cofinsValue, cofinsPercent, cofinsCst,
            ibsValue, cbsValue, ibsCst, cbsCst: ibsCst,
            totalTaxes,
            vItem: itemTotal,
        };
    }).filter(Boolean) as Array<Record<string, any>>;

    const transpBlock = extractTag(xmlString, 'transp');
    const modFrete = extractTag(transpBlock, 'modFrete') || undefined;
    const transportaBlock = extractTag(transpBlock, 'transporta');
    const carrierName = extractTag(transportaBlock, 'xNome') || undefined;
    const volBlock = extractTag(transpBlock, 'vol');
    const volumes = parseInt(extractTag(volBlock, 'qVol') || '0') || undefined;
    const netWeight = parseFloat(extractTag(volBlock, 'pesoL') || '0') || undefined;
    const grossWeight = parseFloat(extractTag(volBlock, 'pesoB') || '0') || undefined;
    
    const cobrBlock = extractTag(xmlString, 'cobr');
    const dupBlocks = extractTagBlocks(cobrBlock, 'dup');
    const installments = dupBlocks.map(dup => ({
        number: extractTag(dup, 'nDup'),
        dueDate: extractTag(dup, 'dVenc'),
        value: parseFloat(extractTag(dup, 'vDup') || '0')
    })).filter(dup => dup.number && dup.dueDate);
    
    const pagBlock = extractTag(xmlString, 'pag');
    const paymentMethod = extractTag(pagBlock, 'tPag') || undefined;

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
        modFrete,
        carrierName,
        volumes,
        netWeight,
        grossWeight,
        installments: installments.length > 0 ? installments : undefined,
        paymentMethod,
        createdAt: new Date().toISOString()
    };
};

