import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { inboundInvoiceFormSchema } from '../../../../../../../shared-utils/inboundInvoiceFormSchema';
import { inboundXmlUploadFormSchema } from '../../../../../../../shared-utils/fileFormSchemas';
import { inboundXmlFormSchema } from '../../../../../../../shared-utils/lookupFormSchemas';
import { normalizeFiscalIdentifier } from '../../../../../../../shared-utils/fiscalIdentifiers';
import { assertInboundInvoiceRecipientMatchesCompany } from '../../../../../../../shared-utils/inboundInvoiceRecipient';
import { getSettings } from '@/pages/utils/settingsService';
import type { z } from 'zod';
import {
  saveInboundInvoice,
  checkInboundInvoiceKeyExists,
} from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { parseInboundNfeXml } from '@/pages/utils/inboundNfe/inboundXmlParser';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { mergeInboundInvoiceXml } from '../../../../../../../shared-utils/inboundInvoiceXmlMerge';
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
  emitterCnpj?: string
): Promise<Person | null> {
  const cleanDoc = normalizeFiscalIdentifier(emitterCnpj);
  try {
    const suppliers = await fetchPersons('suppliers');
    if (cleanDoc) {
      const matchByCnpj = suppliers.find((p) => normalizeFiscalIdentifier(p.cpfCnpj) === cleanDoc);
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
  readonly expectedAccessKey?: string;
}

export function useInboundDocumentImport({
  isOpen,
  onClose,
  onImportSuccess,
  initialFile,
  expectedAccessKey,
}: UseInboundDocumentImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const { validateAndRun } = useZodForm(inboundInvoiceFormSchema, {} as z.input<typeof inboundInvoiceFormSchema>);
  const fileForm = useZodForm(inboundXmlUploadFormSchema, { file: undefined as unknown as File });
  const xmlForm = useZodForm(inboundXmlFormSchema, { xml: '' });
  const importInFlight = useRef(false);
  const showValidationError = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    toast.error(Object.values(flattenFormErrors(errors))[0]);

  // Alerta de chave duplicada
  const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false);
  const [duplicateKey, setDuplicateKey] = useState('');
  const [duplicateExistingInvoice, setDuplicateExistingInvoice] = useState<InboundInvoice | null>(
    null
  );

  /**
   * Persiste a nota no banco de dados e aciona o callback de sucesso
   */
  const persistAndFinish = async (
    parsedInvoice: InboundInvoice,
    source: 'file' | 'sefaz' = 'file'
  ) => {
    const expectedKey = normalizeFiscalIdentifier(expectedAccessKey);
    const parsedKey = normalizeFiscalIdentifier(parsedInvoice.nfeKey);
    if (expectedAccessKey !== undefined && (expectedKey.length !== 44 || parsedKey !== expectedKey)) {
      toast.error('O XML selecionado não corresponde à chave desta nota fiscal incompleta.');
      return;
    }

    await validateAndRun({ ...parsedInvoice, items: parsedInvoice.items.map((item) => ({ ...item })) }, async (data) => {
      let validated = data as InboundInvoice;
      const cleanKey = validated.nfeKey;
      assertInboundInvoiceRecipientMatchesCompany(validated.recipientCnpj, getSettings().companyCnpj);

      // Verifica duplicidade no banco
      setStatusMessage('Verificando notas existentes...');
      const existing = await checkInboundInvoiceKeyExists(cleanKey);
      let isUpdatingExisting = false;
      let hasPreservedConflictingData = false;
      if (existing) {
        setStatusMessage('NF-e já cadastrada. Conferindo se o XML traz dados novos...');
        const merge = mergeInboundInvoiceXml(existing, validated);
        if (merge.outcome === 'conflict') {
          setDuplicateKey(cleanKey);
          setDuplicateExistingInvoice(existing);
          setDuplicateAlertOpen(true);
          return;
        }
        if (merge.outcome === 'unchanged') {
          toast.info('Esta NF-e já está cadastrada e não há dados novos no XML. Nenhuma alteração foi feita.');
          onImportSuccess(existing);
          onClose();
          return;
        }
        validated = merge.invoice;
        isUpdatingExisting = true;
        hasPreservedConflictingData = merge.hasConflicts;
        setStatusMessage('NF-e já cadastrada e desatualizada. Atualizando com os dados novos do XML...');
      }

      let supplierId = validated.supplierId;
      if (!supplierId) {
        setStatusMessage('Identificando fornecedor...');
        const supplier = await ensureSupplier(validated.emitterName, validated.emitterCnpj);
        supplierId = supplier?.id;
      }

      // Auto-match com vínculos anteriores do fornecedor
      let itemsWithMatches = validated.items;
      if (supplierId && itemsWithMatches.length > 0) {
        setStatusMessage('Consultando vínculos de produtos...');
        try {
          const mappings = await findProductSupplierCodes(
            supplierId,
            itemsWithMatches.map((i) => i.productCode)
          );
          if (mappings.size > 0) {
            itemsWithMatches = await Promise.all(
              itemsWithMatches.map(async (item) => {
                if (item.matchedProductId || item.matchedVariationId) return item;
                const map = mappings.get((item.productCode || '').trim().toLocaleUpperCase('pt-BR'));
                if (!map) return item;
                const details = await resolveLinkedProductDetails(
                  map.productId,
                  map.productVariationId
                );
                return {
                  ...item,
                  matchedProductId: map.productId,
                  matchedVariationId: map.productVariationId,
                  linkedProductCode: details?.linkedProductCode,
                  productErpName: details?.productErpName || 'Produto vinculado',
                };
              })
            );
          }
        } catch (mErr) {
          console.warn('[useInboundDocumentImport] Erro ao recuperar histórico de vínculos:', mErr);
        }
      }

      const invoiceToSave: InboundInvoice = {
        ...validated,
        nfeKey: cleanKey,
        supplierId: supplierId || validated.supplierId,
        items: itemsWithMatches,
      };

      setStatusMessage(
        isUpdatingExisting ? 'Salvando os dados novos da nota fiscal...' : 'Salvando nota fiscal no sistema...'
      );
      const saved = isUpdatingExisting
        ? await saveInboundInvoice(invoiceToSave, { requireConfirmation: true })
        : await saveInboundInvoice(invoiceToSave);
      toast.success(
        isUpdatingExisting
          ? hasPreservedConflictingData
            ? `NF-e #${saved.nfeNumber || ''} atualizada. Campos com valores divergentes foram preservados.`
            : `NF-e #${saved.nfeNumber || ''} atualizada com os dados novos do XML.`
          : source === 'sefaz'
            ? `NF-e #${saved.nfeNumber || ''} sincronizada com os itens da SEFAZ.`
            : `NF-e #${saved.nfeNumber || ''} adicionada com sucesso!`
      );
      onImportSuccess(saved);
      onClose();
    }, showValidationError);
  };

  /**
   * Processa exclusivamente o XML oficial da NF-e.
   */
  const handleFile = async (selectedFile?: File) => {
    if (!selectedFile || importInFlight.current) return;
    importInFlight.current = true;
    try {
      setIsLoading(true);
      await fileForm.validateAndRun({ file: selectedFile }, async ({ file }) => {
        setStatusMessage('Lendo e interpretando arquivo XML...');
        const xmlText = await file.text();
        await xmlForm.validateAndRun({ xml: xmlText }, async ({ xml }) => {
          await persistAndFinish(parseInboundNfeXml(xml));
        }, showValidationError);
      }, showValidationError);
    } catch (error: unknown) {
      console.error('[useInboundDocumentImport] Erro ao processar arquivo:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao processar o arquivo da nota fiscal.');
    } finally {
      importInFlight.current = false;
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  /**
   * Processa o conteúdo XML da NF-e diretamente em memória, por exemplo após selecionar um arquivo.
   */
  const handleXmlString = async (xmlText: string, source: 'file' | 'sefaz' = 'file') => {
    if (importInFlight.current) return;
    importInFlight.current = true;
    try {
      setIsLoading(true);
      await xmlForm.validateAndRun({ xml: xmlText }, async ({ xml }) => {
        setStatusMessage('Interpretando dados oficiais da SEFAZ...');
        await persistAndFinish(parseInboundNfeXml(xml), source);
      }, showValidationError);
    } catch (error: unknown) {
      console.error('[useInboundDocumentImport] Erro ao processar XML direto:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao processar nota fiscal.');
    } finally {
      importInFlight.current = false;
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
    isImportInFlight: () => importInFlight.current,
    handleFile,
    handleXmlString,
  };
}
