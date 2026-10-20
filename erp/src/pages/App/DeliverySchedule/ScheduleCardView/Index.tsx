import React from 'react';
import Order from '../../../types/order.type';
import { CardPendingSection } from './components/CardPendingSection';
import { CardDateSection } from './components/CardDateSection';

interface Props {
  schedule: Record<string, Order[]>;
  onOrderClick: (order: Order) => void;
  isReadOnly?: boolean;
  hasInitialScrolled?: React.MutableRefObject<boolean>;
  pendingOrders?: Order[];
}

/**
 * Main component for the Card Visualization of the Delivery Schedule
 *
 * Princípios aplicados:
 * - SRP: Decomposto em componentes especializados em ./components/
 * - CardPendingSection: Seção colapsável de entregas a agendar
 * - CardDateSection: Seção colapsável com sticky header por data
 * - DeliveryOrderCard: Card do pedido com badges operacionais, horários, endereço e itens
 */
const ScheduleCardView: React.FC<Props> = ({
  schedule,
  onOrderClick,
  isReadOnly,
  hasInitialScrolled,
  pendingOrders = [],
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isPendingOpen, setIsPendingOpen] = React.useState(false);
  const [collapsedDates, setCollapsedDates] = React.useState<Record<string, boolean>>({});

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  React.useEffect(() => {
    if (hasInitialScrolled?.current) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;

    // Find the closest date (today or future)
    const availableDates = Object.keys(schedule).sort();
    const targetDate = availableDates.find((d) => d >= todayStr) || availableDates[0];

    if (!targetDate) return;

    setTimeout(() => {
      const element = document.getElementById(`date-${targetDate}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (hasInitialScrolled) hasInitialScrolled.current = true;
      }
    }, 300);
  }, [schedule, hasInitialScrolled]);

  return (
    <div ref={scrollContainerRef} className="flex flex-col gap-6 w-full custom-scrollbar">
      {pendingOrders.length > 0 && (
        <CardPendingSection
          pendingOrders={pendingOrders}
          isPendingOpen={isPendingOpen}
          onTogglePending={() => setIsPendingOpen(!isPendingOpen)}
          onOrderClick={onOrderClick}
          isReadOnly={isReadOnly}
        />
      )}

      {Object.entries(schedule).map(([date, orders]) => (
        <CardDateSection
          key={date}
          date={date}
          orders={orders}
          isCollapsed={Boolean(collapsedDates[date])}
          onToggleCollapse={toggleDateCollapse}
          onOrderClick={onOrderClick}
          isReadOnly={isReadOnly}
        />
      ))}
    </div>
  );
};

export default ScheduleCardView;
