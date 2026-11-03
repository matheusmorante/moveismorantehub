import { useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { LabelConfig } from '../utils/LabelConstants';
import { getLabelPaperDimensions } from '../utils/labelGridLayout';
import { buildMobileLabelPrintHtml, hasMobileLabelBridge, requestMobileLabelAction } from '../services/mobileLabelBridge';

const PRINT_PAGE_CLASS = 'label-printing-page';
export type LabelPrintMethod = 'advanced' | 'standard' | 'check';

async function sendLabelJob(category: 'identificacao' | 'precos', html: string, width: number, height: number) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) throw new Error('Sua sessão expirou. Entre novamente para imprimir.');

  const response = await fetch('/api/label-print-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      category,
      html,
      assetOrigin: window.location.origin,
      paperWidthMm: width,
      paperHeightMm: height,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const created = await response.json().catch(() => ({}));
  if (!response.ok || typeof created.id !== 'string') {
    throw new Error(typeof created.error === 'string' ? created.error : 'Não foi possível enviar as etiquetas para impressão.');
  }

  const deadline = Date.now() + 20_000;
  let lastStatus: string = created.status;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 1_000));
    const statusResponse = await fetch(`/api/label-print-jobs?id=${encodeURIComponent(created.id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const status = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) throw new Error(typeof status.error === 'string' ? status.error : 'Não foi possível acompanhar a impressão.');
    lastStatus = status.status;
    if (status.status === 'printed') {
      toast.success('Etiquetas enviadas à impressora.');
      return;
    }
    if (status.status === 'failed') throw new Error(status.error || 'A estação não conseguiu imprimir as etiquetas.');
  }

  if (lastStatus === 'processing') {
    toast.warning('A estação recebeu as etiquetas, mas ainda não confirmou. Confira a impressora antes de enviar novamente.');
    return;
  }
  toast.info('Etiquetas na fila. A estação imprimirá quando estiver conectada.');
}

export const useLabelPrintMode = (config: LabelConfig, selectedCategory: string | null) => {
  useEffect(() => {
    document.body.classList.add(PRINT_PAGE_CLASS);
    return () => document.body.classList.remove(PRINT_PAGE_CLASS);
  }, []);

  return useCallback(async (method: LabelPrintMethod = 'advanced') => {
    if (method === 'check') {
      if (hasMobileLabelBridge()) {
        await requestMobileLabelAction({ action: 'check-print' });
      } else if (typeof window.print !== 'function') {
        throw new Error('A impressão não está disponível neste dispositivo.');
      }
      return;
    }

    document.body.classList.add(PRINT_PAGE_CLASS);
    await document.fonts?.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => {
      requestAnimationFrame(() => window.setTimeout(resolve, 100));
    }));
    if (method === 'advanced' && (selectedCategory === 'identificacao' || selectedCategory === 'precos')) {
      const dimensions = getLabelPaperDimensions(config);
      const html = await buildMobileLabelPrintHtml();
      await sendLabelJob(
        selectedCategory,
        html,
        Number.parseFloat(dimensions.w),
        Number.parseFloat(dimensions.h)
      );
      return;
    }
    if (hasMobileLabelBridge()) {
      const dimensions = getLabelPaperDimensions(config);
      const html = await buildMobileLabelPrintHtml();
      await requestMobileLabelAction({
        action: 'print',
        html,
        width: Number.parseFloat(dimensions.w) * 72 / 25.4,
        height: Number.parseFloat(dimensions.h) * 72 / 25.4,
      });
    } else {
      window.print();
    }
  }, [config, selectedCategory]);
};
