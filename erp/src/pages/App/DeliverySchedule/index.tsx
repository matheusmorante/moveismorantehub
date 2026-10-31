import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeliverySchedule } from './useDeliverySchedule';
import OrderDetailsModal from './OrderDetailsModal';
import ScheduleCardView from './ScheduleCardView/Index';
import OrderEditModal from '../SalesOrder/modals/OrderEditModal';
import AssistanceOrderModal from '../SalesOrder/modals/AssistanceOrderModal';

const DeliverySchedule = () => {
  const navigate = useNavigate();
  const {
    schedule,
    loading,
    setFilter,
    selectedOrder,
    openOrderDetails,
    closeOrderDetails,
    handleShare,
    pendingOrders,
  } = useDeliverySchedule();

  const [orderToEdit, setOrderToEdit] = useState<any>(null);
  const hasInitialScrolledCard = React.useRef(false);
  const location = useLocation();

  const isStandalone =
    location.pathname.includes('/schedule') && !location.pathname.includes('/delivery-schedule');

  const isMobileAppView =
    isStandalone ||
    window.location.search.includes('auth_email') ||
    window.location.pathname.includes('/schedule') ||
    Boolean((window as any).ReactNativeWebView);

  const renderHeader = () => (
    <div
      className={`flex min-h-[56px] items-center gap-3 mb-3 ${isStandalone ? 'bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300' : 'py-2'}`}
    >
      <div className="bg-amber-500 p-1.5 rounded-lg shadow-sm shadow-amber-100 dark:shadow-amber-900/20 transition-all duration-500">
        <i className="bi bi-calendar-check-fill text-white text-base" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
          Agenda
        </h2>
      </div>

      {!isStandalone && (
        <button
          onClick={handleShare}
          className="ml-auto shrink-0 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest py-2.5 px-3 sm:px-4 rounded-xl shadow-md shadow-emerald-100 dark:shadow-emerald-900/20 flex items-center justify-center transition-all active:scale-95 group"
        >
          <i className="bi bi-whatsapp mr-2 text-sm group-hover:rotate-12 transition-transform" />
          Compartilhar
        </button>
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-[6px] border-slate-50 dark:border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-[6px] border-blue-600 dark:border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-8 text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
            Sincronizando Agenda...
          </p>
        </div>
      );
    }

    if (Object.keys(schedule).length === 0 && pendingOrders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] bg-slate-50/30 dark:bg-slate-950/30 mx-4 transition-colors duration-300">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-full shadow-2xl shadow-slate-100 dark:shadow-none mb-8 border border-slate-50 dark:border-slate-800">
            <i className="bi bi-calendar-x text-6xl text-slate-200 dark:text-slate-800" />
          </div>
          <h3 className="text-slate-800 dark:text-slate-100 font-black text-xl mb-2">
            Nada por aqui!
          </h3>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
            Nenhum agendamento para o período selecionado
          </p>
          <button
            onClick={() => setFilter('all')}
            className="mt-8 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest hover:underline"
          >
            Ver todos os agendamentos
          </button>
        </div>
      );
    }

    return (
      <div className="transition-all duration-500 ease-in-out">
        <ScheduleCardView
          schedule={schedule}
          onOrderClick={openOrderDetails}
          isReadOnly={isStandalone}
          hasInitialScrolled={hasInitialScrolledCard}
          pendingOrders={pendingOrders}
        />
      </div>
    );
  };

  return (
    <div
      className={`w-full mx-auto transition-all duration-300 ${isMobileAppView ? 'max-w-none p-1.5 sm:p-4 mt-0 pb-4' : 'max-w-full px-4 sm:px-6 md:px-8 pb-10'}`}
    >
      {renderHeader()}

      <div className="relative">
        {renderContent()}
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={closeOrderDetails}
          onEdit={
            isStandalone
              ? undefined
              : (ord) => {
                  closeOrderDetails();
                  if (ord.orderType === 'assistance') {
                    setOrderToEdit(ord);
                  } else {
                    navigate(`/sales-order/edit/${ord.id}`);
                  }
                }
          }
          isReadOnly={isStandalone}
        />
      )}

      {orderToEdit && orderToEdit.orderType === 'assistance' && (
        <AssistanceOrderModal
          order={orderToEdit}
          onClose={() => setOrderToEdit(null)}
          onSaveSuccess={() => setOrderToEdit(null)}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `,
        }}
      />
    </div>
  );
};

export default DeliverySchedule;
