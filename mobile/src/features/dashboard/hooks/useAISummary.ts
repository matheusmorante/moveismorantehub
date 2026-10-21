import { useState, useEffect } from 'react';
import { generateDeliveryAISummary } from '../../../services/aiSummaryService';

import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { isDateInPeriod } from '../../../utils/orderUtils';

export const useAISummary = (rawOrders: any[] = []) => {
  const [aiSummaryTab, setAiSummaryTab] = useState<'today' | 'tomorrow'>('today');
  const [hasTodayDeliveries, setHasTodayDeliveries] = useState<boolean>(true);
  const [aiSummaryToday, setAiSummaryToday] = useState<string>('');
  const [aiSummaryTomorrow, setAiSummaryTomorrow] = useState<string>('');
  const [isGeneratingAISummary, setIsGeneratingAISummary] = useState(false);

  useEffect(() => {
    if (rawOrders.length > 0) {
      const todayOrders = rawOrders.filter((o) => {
        const isExplicitlyPending =
          o.status?.toLowerCase() === 'pending' ||
          o.order_data?.status?.toLowerCase() === 'pending';
        if (isExplicitlyPending) return false;
        const rawSchedDate = getOperationalScheduleDate(o);
        if (!rawSchedDate || rawSchedDate === 'sem_data') return false;
        return isDateInPeriod(rawSchedDate, 'today');
      });
      const hasToday = todayOrders.length > 0;
      setHasTodayDeliveries(hasToday);
      if (!hasToday) setAiSummaryTab('tomorrow');

      generateDeliveryAISummary(
        'today',
        false,
        setAiSummaryToday,
        setAiSummaryTomorrow,
        setIsGeneratingAISummary,
        rawOrders
      );
      generateDeliveryAISummary(
        'tomorrow',
        false,
        setAiSummaryToday,
        setAiSummaryTomorrow,
        setIsGeneratingAISummary,
        rawOrders
      );
    }
  }, [rawOrders]);

  return {
    aiSummaryTab,
    setAiSummaryTab,
    hasTodayDeliveries,
    aiSummaryToday,
    aiSummaryTomorrow,
    isGeneratingAISummary,
  };
};
