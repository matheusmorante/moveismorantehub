import React from 'react';
import type Order from '@/pages/types/order.type';
import { formatOrderCode } from '@/pages/utils/orderCode';
import { formatDate } from '@/pages/utils/formatters';
import { useAuth } from '@/context/AuthContext';
import { useWarrantyModalState } from './warranty-modal/hooks/useWarrantyModalState';
import {
  WarrantyFloatingToolbar,
  WarrantyCoverPage,
  WarrantyClausesPage1,
  WarrantyClausesPage2,
  WarrantyReaderHeader,
  WarrantyReaderFooter,
} from './warranty-modal/components';

export interface WarrantyTermModalProps {
  order: Order;
  isOpen?: boolean;
  onClose: () => void;
  isAdministrator?: boolean;
}

export const WarrantyTermModal: React.FC<WarrantyTermModalProps> = ({
  order,
  isOpen = true,
  onClose,
  isAdministrator: propIsAdmin,
}) => {
  const auth = useAuth();
  const isAdministrator =
    propIsAdmin ?? Boolean(auth?.isAdministrator || auth?.isRealAdministrator);

  const {
    actionLoading,
    currentRecord,
    activePage,
    zoomLevel,
    setZoomLevel,
    totalPages,
    mainScrollRef,
    pageRefs,
    currentSheetWidth,
    handlePageChange,
    handlePrint,
    handleSendWhatsApp,
    handleSendDirectCloudApi,
  } = useWarrantyModalState({ order, isOpen, onClose });

  if (!isOpen) return null;

  const customer = order.customerData;
  const orderCode = formatOrderCode(order);
  const purchaseDate = order.date ? formatDate(order.date) : 'Data da compra';
  const customerName = customer?.fullName || 'Consumidor';
  const customerDoc = customer?.cpfCnpj || 'Não informado';
  const customerPhone = customer?.phone || 'Não informado';
  const items = order.items || [];
  const version = currentRecord?.document_version || 1;

  return (
    <div className="fixed inset-0 z-[9999999] flex flex-col bg-slate-950/95 text-slate-100 select-none overflow-hidden overscroll-contain animate-in fade-in duration-200">
      {/* Barra Superior do Leitor de PDF */}
      <WarrantyReaderHeader
        orderCode={orderCode}
        pdfUrl={currentRecord?.file_url}
        onClose={onClose}
      />

      {/* Alerta flutuante de progresso */}
      {actionLoading && (
        <div className="bg-[#032354] text-amber-300 border-b border-amber-500/40 text-xs font-bold py-1.5 px-4 text-center shadow-lg flex items-center justify-center gap-2 animate-pulse shrink-0">
          <i className="bi bi-arrow-repeat animate-spin text-sm" />
          <span>{actionLoading}</span>
        </div>
      )}

      {/* Palco do Visualizador — Todas as folhas renderizadas com um único scrollbar */}
      <main
        ref={mainScrollRef}
        className="flex-1 overflow-y-auto overflow-x-auto bg-slate-950 p-4 sm:p-8 flex flex-col items-center gap-10 select-text relative scroll-smooth"
      >
        {/* Barra Flutuante de Paginação e Zoom */}
        <WarrantyFloatingToolbar
          activePage={activePage}
          totalPages={totalPages}
          zoomLevel={zoomLevel}
          onPageChange={handlePageChange}
          onZoomChange={setZoomLevel}
          onResetZoom={() => setZoomLevel(100)}
        />

        {/* PÁGINA 1: CAPA MODELO 2 */}
        <WarrantyCoverPage
          sheetWidth={currentSheetWidth}
          pageRef={(el) => {
            pageRefs.current[1] = el;
          }}
          orderCode={orderCode}
          purchaseDate={purchaseDate}
          sha256={currentRecord?.file_hash_sha256}
        />

        {/* PÁGINA 2: TÓPICOS 1 A 4 + ITENS */}
        <WarrantyClausesPage1
          sheetWidth={currentSheetWidth}
          pageRef={(el) => {
            pageRefs.current[2] = el;
          }}
          orderCode={orderCode}
          customerName={customerName}
          customerDoc={customerDoc}
          customerPhone={customerPhone}
          purchaseDate={purchaseDate}
          items={items}
          version={version}
        />

        {/* PÁGINA 3: TÓPICOS 5 A 8 + CONTATO */}
        <WarrantyClausesPage2
          sheetWidth={currentSheetWidth}
          pageRef={(el) => {
            pageRefs.current[3] = el;
          }}
          orderCode={orderCode}
        />
      </main>

      {/* Barra Inferior com Ações e Metadados */}
      <WarrantyReaderFooter
        version={version}
        sha256={currentRecord?.file_hash_sha256}
        actionLoading={Boolean(actionLoading)}
        isAdministrator={isAdministrator}
        onPrint={handlePrint}
        onSendWhatsApp={handleSendWhatsApp}
        onSendDirectCloudApi={handleSendDirectCloudApi}
      />
    </div>
  );
};

export default WarrantyTermModal;
