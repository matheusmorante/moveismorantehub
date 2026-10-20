import { useEffect, useState } from 'react';
import type { XmlPreviewState } from './actions.types';

export function useNfeXmlPreviewState(previewContextKey: string) {
  const [xmlPreview, setXmlPreview] = useState<XmlPreviewState | null>(null);
  const [isXmlPreviewOpen, setIsXmlPreviewOpen] = useState(false);

  const hasCurrentXmlPreview = Boolean(xmlPreview && xmlPreview.contextKey === previewContextKey);

  useEffect(() => {
    if (xmlPreview && xmlPreview.contextKey !== previewContextKey) {
      setXmlPreview(null);
      setIsXmlPreviewOpen(false);
    }
  }, [previewContextKey, xmlPreview]);

  const clearXmlPreview = () => {
    setXmlPreview(null);
    setIsXmlPreviewOpen(false);
  };

  const closeXmlPreview = () => {
    setIsXmlPreviewOpen(false);
  };

  return {
    xmlPreview,
    setXmlPreview,
    isXmlPreviewOpen,
    setIsXmlPreviewOpen,
    hasCurrentXmlPreview,
    clearXmlPreview,
    closeXmlPreview,
  };
}
