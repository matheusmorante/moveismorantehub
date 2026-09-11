import { aiProductCatalogService } from "./aiService/aiProductCatalogService";
import { aiFiscalClassificationService } from "./aiService/aiFiscalClassificationService";
import { aiOrderExtractionService, AIIntentResponse, AIChatResponse } from "./aiService/aiOrderExtractionService";
import { aiInboundInvoiceClassificationService, InboundSupplierClassificationResult } from "./aiService/aiInboundInvoiceClassificationService";

export type { AIIntentResponse, AIChatResponse, InboundSupplierClassificationResult };

/**
 * Fachada Canônica do aiService do Morante Hub.
 * Preserva 100% da retrocompatibilidade da API pública delegando a execução
 * para serviços altamente coesos e desacoplados por domínio.
 */
export const aiService = {
    // 1. Catálogo, Títulos, Descrições e Cores
    generateDescription: aiProductCatalogService.generateDescription.bind(aiProductCatalogService),
    generateMarketplaceTitle: aiProductCatalogService.generateMarketplaceTitle.bind(aiProductCatalogService),
    extractProductColor: aiProductCatalogService.extractProductColor.bind(aiProductCatalogService),
    generateProductDescription: aiProductCatalogService.generateProductDescription.bind(aiProductCatalogService),
    suggestCategory: aiProductCatalogService.suggestCategory.bind(aiProductCatalogService),
    generateComboName: aiProductCatalogService.generateComboName.bind(aiProductCatalogService),
    suggestPrices: aiProductCatalogService.suggestPrices.bind(aiProductCatalogService),
    improveProductDescription: aiProductCatalogService.improveProductDescription.bind(aiProductCatalogService),

    // 2. Classificação Fiscal e NCM
    findNCM: aiFiscalClassificationService.findNCM.bind(aiFiscalClassificationService),
    generateNCM: aiFiscalClassificationService.generateNCM.bind(aiFiscalClassificationService),
    generateFiscalData: aiFiscalClassificationService.generateFiscalData.bind(aiFiscalClassificationService),

    // 3. Extração de Pedidos e Intenções em Linguagem Natural
    detectIntent: aiOrderExtractionService.detectIntent.bind(aiOrderExtractionService),
    chat: aiOrderExtractionService.chat.bind(aiOrderExtractionService),
    parseOrderFreeText: aiOrderExtractionService.parseOrderFreeText.bind(aiOrderExtractionService),

    // 4. Classificação de NF de Entrada com Contexto do Fornecedor
    classifyInboundItemWithSupplierContext: aiInboundInvoiceClassificationService.classifyInboundItemWithSupplierContext.bind(aiInboundInvoiceClassificationService),
};
