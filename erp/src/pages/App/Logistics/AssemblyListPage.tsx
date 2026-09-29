import React, { useEffect, useRef, useState } from 'react';
import Order from '@/pages/types/order.type';
import { toast } from 'react-toastify';
import ShowcaseAssemblyModal from './components/ShowcaseAssemblyModal';
import {
  ShowcaseAssembly,
  deleteShowcaseAssembly,
} from '@/pages/utils/showcaseAssemblyService';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import { useAssemblyListQuery } from './hooks/useAssemblyListQuery';
import AssemblyCard from './components/AssemblyCard';
import OrderDetailsModal from '../DeliverySchedule/OrderDetailsModal';

const getLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatUpcomingDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).toLocaleUpperCase('pt-BR');
  return `AGENDADO PARA ${weekday}, ${day}/${String(month).padStart(2, '0')}`;
};

const AssemblyListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const isStandalone = window.location.pathname.includes('/assembly-schedule');
  const hasInitialScrolled = useRef(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssembly, setSelectedAssembly] = useState<ShowcaseAssembly | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { assemblies, loading, refetchAssemblies } = useAssemblyListQuery();

  const handleDeleteShowcase = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta montagem de mostruário?')) return;
    try {
      await deleteShowcaseAssembly(id);
      toast.success('Montagem excluída!');
      refetchAssemblies();
    } catch {
      toast.error('Erro ao excluir montagem.');
    }
  };

  const handleEditShowcase = (item: ShowcaseAssembly) => {
    setSelectedAssembly(item);
    setIsModalOpen(true);
  };

  const handleAddShowcase = () => {
    setSelectedAssembly(null);
    setIsModalOpen(true);
  };

  const handleShareWhatsApp = () => {
    const REAL_URL = 'https://morantehub.vercel.app';
    const url = `${REAL_URL}/assembly-schedule`;
    const message = `🛠️ *Móveis Morante - Agenda de Montagens*\n\nOlá! Segue o link para *visualização em tempo real* da lista de montagens atualizada:\n\n🔗 ${url}\n\n_Favor conferir os itens e horários no link antes de iniciar os serviços._`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const todayKey = getLocalDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
  const filteredAssemblies = assemblies.filter((item) => {
    if (isStandalone && item.origin === 'order' && item.isOutside) return false;
    if (isStandalone && item.date && item.date < yesterdayKey) return false;

    const searchableText = [
      item.title,
      item.customerName,
      item.subtitle,
      item.id,
      item.item?.description,
    ]
      .filter(Boolean)
      .join(' ');
    return normalizeSearchTerm(searchableText).includes(normalizedSearchTerm);
  });

  useEffect(() => {
    if (!isStandalone || loading || filteredAssemblies.length === 0 || hasInitialScrolled.current) return;

    // Find the closest date (today or future)
    const availableDates = filteredAssemblies
      .map((a) => a.date)
      .filter(Boolean)
      .sort();
    const targetDate = availableDates.find((d) => d >= todayKey) || availableDates[0];

    if (!targetDate) return;

    setTimeout(() => {
      const element = document.getElementById(`timeline-date-${targetDate}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        hasInitialScrolled.current = true;
      }
    }, 500);
  }, [filteredAssemblies, isStandalone, loading, todayKey]);

  // ─── Header ───────────────────────────────────────────────────
  const renderHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          {isStandalone ? 'Montagem no Depósito' : 'Lista de Montagens'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
          {isStandalone
            ? 'Visualização em Tempo Real'
            : 'Montagens agendadas para hoje e próximos dias'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 md:flex-none">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all w-full md:w-60 outline-none"
          />
        </div>
        {isStandalone && (
          <button
            onClick={() => refetchAssemblies()}
            className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-95"
            title="Recarregar lista"
          >
            <i className="bi bi-arrow-clockwise text-lg" />
          </button>
        )}
        {!isStandalone && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#128C7E] active:scale-95 transition-all outline-none"
            >
              <i className="bi bi-whatsapp" />
              WhatsApp
            </button>
            <button
              onClick={() => window.open('/logistics/assembly-print', '_blank')}
              className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all outline-none"
            >
              <i className="bi bi-printer text-lg" />
            </button>
            <button
              onClick={handleAddShowcase}
              className="p-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 active:scale-95 transition-all"
            >
              <i className="bi bi-plus-lg text-lg" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderAssemblyList = () => {
    const scopedAssemblies = filteredAssemblies.filter((item) => {
      if (item.origin === 'order') {
        const status = String(item.status || '').trim().toLowerCase();
        if (
          item.pendingScheduling ||
          status === 'draft' ||
          status === 'rascunho' ||
          !item.date ||
          item.date < todayKey
        ) {
          return false;
        }
      } else if (!item.date || item.date < todayKey) {
        return false;
      }
      return true;
    });

    const grouped = scopedAssemblies.reduce(
      (groups, item) => {
        groups[item.date] ||= [];
        groups[item.date].push(item);
        return groups;
      },
      {} as Record<string, any[]>
    );
    const dateKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    const sections = dateKeys.map((dateKey) => ({
      key: dateKey,
      title: dateKey === todayKey ? `PARA HOJE · ${grouped[dateKey].length}` : formatUpcomingDate(dateKey),
      count: grouped[dateKey].length,
      items: grouped[dateKey],
    }));

    const toggleSection = (key: string) => {
      setCollapsedSections((previous) => ({
        ...previous,
        [key]: !(previous[key] ?? key !== todayKey),
      }));
    };

    return (
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <i className="bi bi-tools" /> Montagem no depósito
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
            <i className="bi bi-tools" /> Montagem fora
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Carregando montagens...
          </div>
        ) : sections.length === 0 ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Nenhuma montagem agendada para hoje ou próximos dias.
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => {
              const isCollapsed = collapsedSections[section.key] ?? section.key !== todayKey;
              return (
                <section key={section.key} className="space-y-2">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleSection(section.key)}
                    className="sticky top-0 z-10 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-left shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      <i className="bi bi-calendar3 text-blue-600 dark:text-blue-400" />
                      <span className="truncate">{section.title}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {section.count} {section.count === 1 ? 'montagem' : 'montagens'}
                      </span>
                      <i
                        className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-blue-600 dark:text-blue-400`}
                      />
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2">
                      {section.items.map((item: any) => {
                        if (item.origin === 'order') {
                          const quantity = Number(item.item?.quantity || item.item?.qty || 1);
                          const productName = `${quantity > 1 ? `${quantity}x ` : ''}${item.title}`;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedOrder(item.fullData as Order)}
                              aria-label={`Abrir pedido: ${productName} — ${item.customerName}`}
                              className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-opacity hover:opacity-80 ${
                                item.isOutside
                                  ? 'border-red-300 bg-red-100 text-red-950 dark:border-red-800 dark:bg-red-950/60 dark:text-red-100'
                                  : 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100'
                              }`}
                            >
                              <span className="min-w-0 flex-1 text-sm leading-5">
                                <span className="font-extrabold">{productName}</span>
                                <span className="font-semibold text-slate-600 dark:text-slate-300">
                                  {' '}— {item.customerName}
                                </span>
                              </span>
                              <i className="bi bi-chevron-right shrink-0 text-sm text-slate-500 dark:text-slate-400" />
                            </button>
                          );
                        }

                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-900 dark:bg-rose-950/40"
                          >
                            <button
                              type="button"
                              onClick={() => handleEditShowcase(item.fullData)}
                              className="min-w-0 flex-1 text-left text-sm text-slate-800 dark:text-slate-100"
                            >
                              <span className="font-extrabold">
                                {Number(item.items?.[0]?.quantity || 1) > 1
                                  ? `${item.items[0].quantity}x `
                                  : ''}
                                {item.title}
                              </span>
                              <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                — Mostruário
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditShowcase(item.fullData)}
                              aria-label="Editar montagem de mostruário"
                              className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-blue-600 dark:hover:bg-slate-800"
                            >
                              <i className="bi bi-pencil-square" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShowcase(item.id)}
                              aria-label="Excluir montagem de mostruário"
                              className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600 dark:hover:bg-slate-800"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── Timeline View ────────────────────────────────────────────
  const renderTimelineView = () => {
    if (loading) {
      return (
        <div className="space-y-12 max-w-[95%] mx-auto py-6">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="space-y-6">
                <div className="h-16 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 animate-pulse" />
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-12 space-y-8">
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 h-48 animate-pulse relative">
                    <div className="absolute -left-[59px] top-8 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-white dark:border-slate-900" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      );
    }

    if (filteredAssemblies.length === 0) {
      return (
        <div className="py-24 text-center flex flex-col items-center justify-center">
          <i className="bi bi-calendar-x text-5xl mb-4 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-300 dark:text-slate-700">
            Nenhuma montagem agendada
          </p>
          <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-300 dark:text-slate-700 mt-1">
            Todas as tarefas de montagem foram concluídas ou não há agendamentos.
          </p>
        </div>
      );
    }

    const grouped = filteredAssemblies.reduce(
      (acc, item) => {
        const key = item.date || 'sem-data';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, any[]>
    );

    const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    return (
      <div className="max-w-[95%] mx-auto py-2 space-y-12">
        {sortedKeys.map((dateKey) => (
          <div key={dateKey} id={`timeline-date-${dateKey}`} className="space-y-8">
            {/* ── Cabeçalho de Data (igual à Agenda) ── */}
            <div className="sticky top-0 z-20 flex items-center gap-6 mb-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-8 py-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">
                  {dateKey === 'sem-data'
                    ? 'Sem data'
                    : new Date(dateKey + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long',
                      })}
                </span>
                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  {dateKey === 'sem-data'
                    ? 'Data não definida'
                    : (() => {
                        const firstItem = grouped[dateKey][0];
                        const isRange =
                          firstItem?.timeInfo?.dateType === 'range' && firstItem?.timeInfo?.endDate;
                        if (isRange) {
                          return `De ${new Date(dateKey + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(firstItem.timeInfo.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
                        }
                        return new Date(dateKey + 'T00:00:00').toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                        });
                      })()}
                </h3>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800" />
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {grouped[dateKey].length} {grouped[dateKey].length === 1 ? 'Montagem' : 'Montagens'}
              </div>
            </div>

            {/* ── Linha vertical da timeline ── */}
            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3">
              {grouped[dateKey].map((item: any, idx: number) => (
                  <AssemblyCard
                    key={item.id + idx}
                    item={item}
                    idx={idx}
                    isStandalone={isStandalone}
                    handleEditShowcase={handleEditShowcase}
                    handleDeleteShowcase={handleDeleteShowcase}
                  />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="p-2 md:p-6 space-y-8 animate-fade-in pb-20 w-full">
      {renderHeader()}

      <style
        dangerouslySetInnerHTML={{
          __html: `.capitalize::first-letter { text-transform: uppercase; }`,
        }}
      />

      {isStandalone ? renderTimelineView() : renderAssemblyList()}

      <ShowcaseAssemblyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        assembly={selectedAssembly}
        onSaveSuccess={() => refetchAssemblies()}
      />

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isReadOnly
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default AssemblyListPage;
