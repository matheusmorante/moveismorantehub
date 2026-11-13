import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getNextOrderIndex } from '@/pages/utils/orderCode';

export function useOrderCodeGenerator(
  currentOrderId: string | undefined,
  latestStateRef: React.MutableRefObject<any>
) {
  const [orderIndex, setOrderIndex] = useState<number | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const isGeneratingCodeRef = useRef(false);
  const orderCodeRequestRef = useRef<Promise<number> | null>(null);

  const requestOrderCode = useCallback(() => {
    if (orderCodeRequestRef.current) return orderCodeRequestRef.current;

    const request = getNextOrderIndex();
    orderCodeRequestRef.current = request;
    void request.then(
      () => {
        if (orderCodeRequestRef.current === request) orderCodeRequestRef.current = null;
      },
      () => {
        if (orderCodeRequestRef.current === request) orderCodeRequestRef.current = null;
      }
    );
    return request;
  }, []);

  // Gerar código sequencial único imediatamente ao abrir novo formulário
  useEffect(() => {
    if (!currentOrderId && orderIndex === null && !isGeneratingCodeRef.current) {
      isGeneratingCodeRef.current = true;
      setIsGeneratingCode(true);
      requestOrderCode()
        .then((code) => {
          setOrderIndex(code);
          if (latestStateRef.current) {
            latestStateRef.current.orderIndex = code;
            latestStateRef.current.orderNumber = code as any;
          }
        })
        .catch((err) => {
          console.error('[useOrderCodeGenerator] Erro ao gerar código sequencial do pedido:', err);
          toast.error(
            `Erro ao gerar código do pedido: ${err.message || 'Falha de comunicação'}. Não é permitido cadastrar sem código.`
          );
        })
        .finally(() => {
          isGeneratingCodeRef.current = false;
          setIsGeneratingCode(false);
        });
    }
  }, [currentOrderId, orderIndex, latestStateRef, requestOrderCode]);

  const generateCodeForCopyOrNew = useCallback(async (): Promise<number | null> => {
    if (isGeneratingCodeRef.current) return null;
    isGeneratingCodeRef.current = true;
    setIsGeneratingCode(true);
    try {
      const newCode = await requestOrderCode();
      setOrderIndex(newCode);
      if (latestStateRef.current) {
        latestStateRef.current.orderIndex = newCode;
        latestStateRef.current.orderNumber = newCode as any;
      }
      return newCode;
    } catch (err: any) {
      console.error('[useOrderCodeGenerator] Erro ao gerar novo código:', err);
      toast.error(
        `Erro ao gerar novo código para o pedido: ${err.message || 'Falha de comunicação'}.`
      );
      return null;
    } finally {
      isGeneratingCodeRef.current = false;
      setIsGeneratingCode(false);
    }
  }, [latestStateRef, requestOrderCode]);

  const ensureOrderCode = useCallback(async (): Promise<number | null> => {
    let currentIdx = latestStateRef.current?.orderIndex || orderIndex;
    if (!currentIdx) {
      isGeneratingCodeRef.current = true;
      try {
        setIsGeneratingCode(true);
        currentIdx = await requestOrderCode();
        setOrderIndex(currentIdx);
        if (latestStateRef.current) {
          latestStateRef.current.orderIndex = currentIdx;
          latestStateRef.current.orderNumber = currentIdx as any;
        }
      } catch (codeErr: any) {
        toast.error(
          `Não foi possível gerar um código único para o pedido: ${codeErr.message || 'Erro no banco'}. O pedido não pode ser salvo/cadastrado.`
        );
        return null;
      } finally {
        isGeneratingCodeRef.current = false;
        setIsGeneratingCode(false);
      }
    }
    return currentIdx;
  }, [orderIndex, latestStateRef, requestOrderCode]);

  return {
    orderIndex,
    setOrderIndex,
    isGeneratingCode,
    setIsGeneratingCode,
    isGeneratingCodeRef,
    generateCodeForCopyOrNew,
    ensureOrderCode,
  };
}
