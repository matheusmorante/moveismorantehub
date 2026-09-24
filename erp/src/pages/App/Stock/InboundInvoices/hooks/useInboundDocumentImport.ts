import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    saveInboundInvoice,
    checkInboundInvoiceKeyExists,
} from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { parseInboundNfeXml } from '@/pages/utils/inboundNfe/inboundXmlParser';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchPersons } from '@/pages/utils/personService';
import { findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import { resolveLinkedProductDetails } from '@/pages/utils/inboundNfe/inboundItemProductResolver';
import Person from '@/pages/types/person.type';

/**
 * Localiza o fornecedor já cadastrado para vincular à nota de entrada.
 * A importação não cria fornecedores: a confirmação do cadastro é sempre manual.
 */
async function ensureSupplier(
    emitterName?: string,
    emitterTradeName?: string,
    emitterCnpj?: string
): Promise<Person | null> {
    const cleanDoc = (emitterCnpj || '').replace(/\D/g, '');
    try {
        const suppliers = await fetchPersons('suppliers');
        if (cleanDoc) {
            const matchByCnpj = suppliers.find((p) => (p.cpfCnpj || '').replace(/\D/g, '') === cleanDoc);
            if (matchByCnpj) return matchByCnpj;
        }

        if (emitterName?.trim()) {
            const matchByName = suppliers.find(
                (p) => (p.fullName || '').trim().toLowerCase() === emitterName.trim().toLowerCase()
            );
            if (matchByName) return matchByName;
        }
    } catch (err) {
        console.warn('[useInboundDocumentImport] Aviso ao localizar fornecedor:', err);
    }
    return null;
}

export interface UseInboundDocumentImportProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onImportSuccess: (invoice: InboundInvoice) => void;
    readonly initialFile?: File | null;
}

export function useInboundDocumentImport({ isOpen, onClose, onImportSuccess, initialFile }: UseInboundDocumentImportProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    // Alerta de chave duplicada
    const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false);
    const [duplicateKey, setDuplicateKey] = useState('');
    const [duplicateExistingInvoice, setDuplicateExistingInvoice] = useState<InboundInvoice | null>(null);

    /**
     * Persiste a nota no banco de dados e aciona o callback de sucesso
     */
    const persistAndFinish = async (parsedInvoice: InboundInvoice) => {
        if (String(parsedInvoice.model || '').replace(/\D/g, '') === '65') {
            throw new Error('NFC-e (modelo 65) não pode ser cadastrada como NF de Entrada.');
        }

        const cleanKey = (parsedInvoice.nfeKey || '').replace(/\D/g, '');
        if (!cleanKey || cleanKey.length !== 44) {
            throw new Error('A chave de acesso da nota fiscal deve conter exatamente 44 dígitos.');
        }

        // Verifica duplicidade no banco
        setStatusMessage('Verificando notas existentes...');
        const existing = await checkInboundInvoiceKeyExists(cleanKey);
        if (existing) {
            setDuplicateKey(cleanKey);
            setDuplicateExistingInvoice(existing);
            setDuplicateAlertOpen(true);
            return;
        }

        // Localiza ou cadastra fornecedor
        setStatusMessage('Identificando fornecedor...');
        const supplier = await ensureSupplier(
            parsedInvoice.emitterName,
            parsedInvoice.emitterTradeName,
            parsedInvoice.emitterCnpj
        );
        const supplierId = supplier?.id;

        // Auto-match com vínculos anteriores do fornecedor
        let itemsWithMatches = parsedInvoice.items || [];
        if (supplierId && itemsWithMatches.length > 0) {
            setStatusMessage('Consultando vínculos de produtos...');
            try {
                const mappings = await findProductSupplierCodes(
                    supplierId,
                    itemsWithMatches.map((i) => i.productCode)
                );
                if (mappings.size > 0) {
                    itemsWithMatches = await Promise.all(itemsWithMatches.map(async (item) => {
                        const map = mappings.get((item.productCode || '').trim().toLocaleUpperCase('pt-BR'));
                        if (!map) return item;
                        const details = await resolveLinkedProductDetails(map.productId, map.productVariationId);
                        return {
                            ...item,
                            matchedProductId: map.productId,
                            matchedVariationId: map.productVariationId,
                            linkedProductCode: details?.linkedProductCode,
                            productErpName: details?.productErpName || 'Produto vinculado',
                        };
                    }));
                }
            } catch (mErr) {
                console.warn('[useInboundDocumentImport] Erro ao recuperar histórico de vínculos:', mErr);
            }
        }

        const invoiceToSave: InboundInvoice = {
            ...parsedInvoice,
            nfeKey: cleanKey,
            supplierId: supplierId || parsedInvoice.supplierId,
            items: itemsWithMatches,
        };

        setStatusMessage('Salvando nota fiscal no sistema...');
        const saved = await saveInboundInvoice(invoiceToSave);
        toast.success(`NF-e #${saved.nfeNumber || ''} adicionada com sucesso!`);
        onImportSuccess(saved);
        onClose();
    };

    /**
     * Processa exclusivamente o XML oficial da NF-e.
     */
    const handleFile = async (selectedFile?: File) => {
        if (!selectedFile || isLoading) return;

        const isXml = selectedFile.name.toLowerCase().endsWith('.xml') || selectedFile.type.includes('xml');
        try {
            setIsLoading(true);

            if (!isXml) throw new Error('Envie somente o arquivo XML oficial da NF-e.');

            setStatusMessage('Lendo e interpretando arquivo XML...');
            const xmlText = await selectedFile.text();
            const parsed = parseInboundNfeXml(xmlText);
            await persistAndFinish(parsed);
        } catch (error: any) {
            console.error('[useInboundDocumentImport] Erro ao processar arquivo:', error);
            toast.error(error.message || 'Falha ao processar o arquivo da nota fiscal.');
        } finally {
            setIsLoading(false);
            setStatusMessage('');
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setIsLoading(false);
            setStatusMessage('');
            setIsDraggingFile(false);
            setDuplicateAlertOpen(false);
            setDuplicateKey('');
            setDuplicateExistingInvoice(null);
        } else if (initialFile) {
            // Process the dropped file automatically when the modal opens
            void handleFile(initialFile);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialFile]);

    return {
        isLoading,
        statusMessage,
        isDraggingFile,
        setIsDraggingFile,
        duplicateAlertOpen,
        setDuplicateAlertOpen,
        duplicateKey,
        duplicateExistingInvoice,
        handleFile,
    };
}
