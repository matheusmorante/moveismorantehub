import { supabase } from './supabaseClient';
import { MobileAgentClient } from './aiAgent/mobileAgentClient';
import {
  buildCanonicalSummaryPayload,
  generateCanonicalFingerprint,
  CanonicalSummaryPayload,
} from './canonicalSummaryInput';
import {
  getSavedSummaryRecord,
  saveSummaryRecord,
  isLeaseExpired,
  DeliverySummaryRecord,
} from './deliverySummaryService';
import { getLocalDateString } from '../utils/orderUtils';
import { formatDistanceNatural, formatProductNameWithArticle } from '../utils/aiSummaryHelper';
import { buildDeliverySummaryPrompt } from './aiSummaryPrompt';
import { ensureSharedSummaryAudio } from './deliverySummaryAudioGenerationService';

// Camada quente da sessão: evita nova geração quando o operador alterna entre
// Hoje e Dias seguintes antes mesmo da leitura persistida terminar.
const summaryTextMemoryCache = new Map<string, string>();

export function clearSummaryTextMemoryCache() {
  summaryTextMemoryCache.clear();
}

export const generateDeliveryAISummary = async (
  mode: 'today' | 'tomorrow' | 'next_days' | 'next5days',
  forceRefresh: boolean = false,
  setAiSummaryToday?: (val: string) => void,
  setAiSummaryTomorrow?: (val: string) => void,
  setIsGeneratingAISummary?: (val: boolean) => void,
  initialOrders?: any[]
) => {
  try {
    let rawOrders = initialOrders;
    if (!rawOrders || rawOrders.length === 0) {
      const { data } = await supabase
        .from('orders')
        .select('id, status, created_at, order_data')
        .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
        .order('created_at', { ascending: false })
        .limit(300);
      rawOrders = data || [];
    }

    let settingsData: any = null;
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
      settingsData = data;
    } catch (e) {
      console.warn('Configurações de IA não carregadas:', e);
    }

    const settings = settingsData?.data || settingsData || {};
    const handlingOptions: any[] = settings.handlingOptions || settings.orderTypes || [];
    const geminiKey = await MobileAgentClient.getApiKey();

    // 1. Montar payload canônico e calcular a fingerprint determinística dos dados
    const canonicalPayload: CanonicalSummaryPayload = buildCanonicalSummaryPayload(rawOrders || [], mode, handlingOptions);
    const currentFingerprint = generateCanonicalFingerprint(canonicalPayload);
    const memoryCacheKey = `${mode}:${currentFingerprint}`;
    const memoryText = summaryTextMemoryCache.get(memoryCacheKey);

    if (!forceRefresh && memoryText) {
      if (mode === 'today' && setAiSummaryToday) setAiSummaryToday(memoryText);
      else if ((mode === 'tomorrow' || mode === 'next_days') && setAiSummaryTomorrow) setAiSummaryTomorrow(memoryText);
      return memoryText;
    }

    // 2. Verificar se já existe um resumo persistido para a mesma fingerprint
    const savedRecord = await getSavedSummaryRecord(mode, currentFingerprint);

    if (!forceRefresh && savedRecord) {
      if (savedRecord.text_status === 'READY' && savedRecord.text) {
        // REUTILIZAÇÃO PERFEITA: Mesmos dados -> Mesmo Texto + Mesmo Áudio
        // ZERO chamadas adicionais de Gemini e ZERO chamadas de TTS!
        summaryTextMemoryCache.set(memoryCacheKey, savedRecord.text);
        if (mode === 'today' && setAiSummaryToday) setAiSummaryToday(savedRecord.text);
        else if ((mode === 'tomorrow' || mode === 'next_days') && setAiSummaryTomorrow) setAiSummaryTomorrow(savedRecord.text);
        // Recuperação idempotente para versões persistidas antes de um erro ou
        // interrupção. Se o áudio já estiver READY, esta chamada não acontece.
        if (savedRecord.audio_status === 'MISSING' || savedRecord.audio_status === 'FAILED') {
          void ensureSharedSummaryAudio(mode, savedRecord.text);
        }
        return savedRecord.text;
      }

      if (savedRecord.text_status === 'GENERATING' && !isLeaseExpired(savedRecord.generation_started_at)) {
        // Geração já em andamento em outro dispositivo -> Aguarda sem duplicar requisição
        if (savedRecord.text) {
          if (mode === 'today' && setAiSummaryToday) setAiSummaryToday(savedRecord.text);
          else if ((mode === 'tomorrow' || mode === 'next_days') && setAiSummaryTomorrow) setAiSummaryTomorrow(savedRecord.text);
        }
        return savedRecord.text || '';
      }
    }

    if (setIsGeneratingAISummary) setIsGeneratingAISummary(true);

    // 3. Travar estado em GENERATING para concorrência
    await saveSummaryRecord({
      scope: mode,
      data_fingerprint: currentFingerprint,
      text: savedRecord?.text || null,
      text_status: 'GENERATING',
      audio_status: savedRecord?.audio_status || 'MISSING',
      generation_started_at: new Date().toISOString(),
    });

    // Se já tiver um texto válido prévio com apenas o áudio pendente, reutiliza o texto!
    let smartText = '';
    const shouldReuseText = savedRecord?.text_status === 'READY' && Boolean(savedRecord.text) && !forceRefresh;

    if (shouldReuseText && savedRecord?.text) {
      smartText = savedRecord.text;
    } else {
      // 4. Gerar o texto com o modelo de logística
      smartText = generateLocalSmartText(canonicalPayload);

      if (geminiKey && canonicalPayload.orders.length > 0) {
        try {
          const geminiPrompt = buildDeliverySummaryPrompt(smartText);
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: geminiPrompt }] }] }),
            }
          );
          if (res.ok) {
            const resJson = await res.json();
            const aiText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText && aiText.trim()) {
              smartText = aiText
                .trim()
                .replace(/[*#]/g, '')
                .replace(/:/g, ' ')
                .replace(/[()]/g, '')
                .replace(/\s+/g, ' ');
            }
          }
        } catch (geminiErr) {
          console.warn('Erro ao chamar Gemini Flash para resumo (usando texto estruturado local):', geminiErr);
        }
      }
    }

    // 5. Salvar o resumo gerado com sucesso com estado READY
    await saveSummaryRecord({
      scope: mode,
      data_fingerprint: currentFingerprint,
      text: smartText,
      text_status: 'READY',
      // A síntese de voz é sob demanda. O player usa cache por texto e só
      // muda de chave quando esta versão do resumo realmente mudar.
      audio_status: 'MISSING',
      generation_started_at: null,
      error_message: null,
    });

    // Só uma nova versão persistida pode pedir TTS. Montagem, refetch e troca
    // de aba retornam antes deste ponto com o resumo já salvo.
    void ensureSharedSummaryAudio(mode, smartText);

    summaryTextMemoryCache.set(memoryCacheKey, smartText);

    if (mode === 'today' && setAiSummaryToday) setAiSummaryToday(smartText);
    else if ((mode === 'tomorrow' || mode === 'next_days') && setAiSummaryTomorrow) setAiSummaryTomorrow(smartText);

    return smartText;
  } catch (err: any) {
    console.warn('Erro durante geração de resumo:', err);
    const detail = err instanceof Error ? err.message : String(err);
    const fallbackText = `Não foi possível atualizar o resumo agora. ${detail}`;

    if (mode === 'today' && setAiSummaryToday) setAiSummaryToday(fallbackText);
    else if ((mode === 'tomorrow' || mode === 'next_days') && setAiSummaryTomorrow) setAiSummaryTomorrow(fallbackText);

    return fallbackText;
  } finally {
    if (setIsGeneratingAISummary) setIsGeneratingAISummary(false);
  }
};

export function formatExtendDateLabel(dateStr: string, todayStr: string, tomorrowStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return `Para a data ${dateStr}`;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day, 12, 0, 0);

  const weekDays = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ];
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];

  const weekDayName = weekDays[d.getDay()];
  const monthName = months[d.getMonth()];

  if (dateStr === tomorrowStr) {
    return `Para amanhã, ${weekDayName}, dia ${day} de ${monthName}`;
  }
  return `Para ${weekDayName}, dia ${day} de ${monthName}`;
}

function formatOrdersGroup(orders: CanonicalSummaryPayload['orders']): string {
  const morningOrders = orders.filter(
    (o) =>
      o.period.includes('manhã') ||
      o.period.includes('manha') ||
      /^(06|07|08|09|10|11):/.test(o.scheduledTime)
  );
  const afternoonOrders = orders.filter(
    (o) =>
      o.period.includes('tarde') ||
      /^(12|13|14|15|16|17|18):/.test(o.scheduledTime)
  );
  const unspecOrders = orders.filter(
    (o) => !morningOrders.includes(o) && !afternoonOrders.includes(o)
  );

  const formatList = (list: typeof orders) =>
    list.map((o) => {
      const cityPart = o.city && o.city !== 'colombo' ? ` em ${o.city}` : '';
      const custPart = o.customerName ? ` para ${o.customerName}` : '';
      const itemCount = o.items.reduce((acc, it) => acc + it.quantity, 0);
      const itemsText = itemCount === 1 ? 'um item' : `${itemCount} itens`;

      let distPart = '';
      if (typeof o.distanceKm === 'number' && !isNaN(o.distanceKm) && o.distanceKm > 0) {
        if (o.distanceKm <= 8) {
          distPart = ', pertinho';
        } else {
          distPart = `, ${formatDistanceNatural(o.distanceKm)}`;
        }
      }

      const assemblyItems = o.items
        .filter((it) => it.isAssemblyOutside)
        .map((it) => formatProductNameWithArticle(it.name, it.quantity));

      const activityName = o.activityType === 'assistance' ? 'assistência' : o.activityType === 'return' ? 'devolução' : 'entrega';
      let base = '';
      if (assemblyItems.length > 0) {
        base = `uma ${activityName}${custPart}${cityPart}${distPart}, de ${itemsText}, sendo ${assemblyItems.join(' e ')}, com montagem no endereço`;
      } else {
        base = `uma ${activityName}${custPart}${cityPart}${distPart}, de ${itemsText}`;
      }

      if (o.notices.length > 0) {
        base += `, com atenção para ${o.notices.join(' e ')}`;
      }

      return base;
    });

  const parts: string[] = [];

  if (morningOrders.length > 0) {
    parts.push(`Pela manhã, temos ${formatList(morningOrders).join(', ')}.`);
  }
  if (afternoonOrders.length > 0) {
    parts.push(`À tarde, temos ${formatList(afternoonOrders).join(', ')}.`);
  }
  if (unspecOrders.length > 0) {
    parts.push(`Também temos ${formatList(unspecOrders).join(', ')}.`);
  }

  return parts.join(' ');
}

export function generateLocalSmartText(payload: CanonicalSummaryPayload): string {
  const orders = payload.orders || [];

  if (orders.length === 0) {
    return payload.scope === 'next_days'
      ? 'Não há atividades operacionais agendadas para os próximos dias. Operação e frota disponíveis para novos lançamentos.'
      : 'Sem atividades operacionais para hoje.';
  }

  if (payload.scope === 'next_days') {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    // Agrupar todos os pedidos agendados para os dias seguintes cronologicamente por data
    const ordersByDate = new Map<string, typeof orders>();
    for (const order of orders) {
      const dateKey = order.scheduledDate || 'sem_data';
      if (!ordersByDate.has(dateKey)) {
        ordersByDate.set(dateKey, []);
      }
      ordersByDate.get(dateKey)!.push(order);
    }

    const sortedDates = Array.from(ordersByDate.keys()).sort();
    const firstScheduledDate = sortedDates[0];
    const dayBlocks: string[] = [];

    for (const dateKey of sortedDates) {
      const dayOrders = ordersByDate.get(dateKey) || [];
      if (dayOrders.length === 0) continue;

      const dateLabel = formatExtendDateLabel(dateKey, todayStr, firstScheduledDate || tomorrowStr);
      const countByType = (type: string) => dayOrders.filter(order => (order.activityType || 'delivery') === type).length;
      const describe = (count: number, singular: string, plural: string) => count ? `${count} ${count === 1 ? singular : plural}` : '';
      const dayActivities = [
        describe(countByType('delivery'), 'entrega', 'entregas'),
        describe(countByType('assistance'), 'assistência', 'assistências'),
        describe(countByType('return'), 'devolução', 'devoluções'),
      ].filter(Boolean).join(', ');
      const dayOverview = `${dateLabel}, temos ${dayActivities}.`;
      const dayDetails = formatOrdersGroup(dayOrders);

      dayBlocks.push(`${dayOverview} ${dayDetails}`.trim());
    }

    return dayBlocks.join(' ').trim().replace(/\s+/g, ' ');
  }

  // Escopo de Hoje ou Amanhã individual
  const isToday = payload.scope === 'today';
  const countByType = (type: string) => orders.filter(order => (order.activityType || 'delivery') === type).length;
  const describe = (count: number, singular: string, plural: string) => count ? `${count} ${count === 1 ? singular : plural}` : '';
  const activities = [
    describe(countByType('delivery'), 'entrega', 'entregas'),
    describe(countByType('assistance'), 'assistência', 'assistências'),
    describe(countByType('return'), 'devolução', 'devoluções'),
  ].filter(Boolean).join(', ');
  const overview = `Para ${isToday ? 'hoje' : 'amanhã'}, temos ${activities}.`;
  const details = formatOrdersGroup(orders);

  return `${overview} ${details}`.trim().replace(/\s+/g, ' ');
}
