import React from 'react';
import type { WhatsAppMessage } from '../../types';
import type { CatalogInteractiveProductCard } from '../../catalogInteractiveProducts';
import { useInteractiveCatalogProductCards } from '../../hooks/useInteractiveCatalogProductCards';

interface CatalogProductCardsBoundaryProps {
  messages: readonly WhatsAppMessage[];
  children: (
    cardsByRetailerId: Record<string, CatalogInteractiveProductCard>,
    loadingRetailerIds: ReadonlySet<string>
  ) => React.ReactNode;
}

export const CatalogProductCardsBoundary: React.FC<CatalogProductCardsBoundaryProps> = ({
  messages,
  children,
}) => {
  const { cardsByRetailerId, loadingRetailerIds } = useInteractiveCatalogProductCards(messages);
  return <>{children(cardsByRetailerId, loadingRetailerIds)}</>;
};
