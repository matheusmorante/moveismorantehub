import { supabase } from './supabaseClient';
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
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      rawOrders = data || [];
    }

    let settingsData: any = null;
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
      settingsData = data;
    } catch (e) {
      console.warn('Configurações de IA não carregadas:', e);
    }

    const handlingOptions: any[] = settingsData?.handlingOptions || settingsData?.orderTypes || [];
    const geminiKey = settingsData?.geminiApiKey || process.env.VITE_GEMINI_API_KEY || '';

    // 1. Montar payload canônico e calcular a fingerprint determinística dos dados
    const canonicalPayload: CanonicalSummaryPayload = buildCanonicalSummaryPayload(rawOrders || [], mode, handlingOptions);
    const currentFingerprint = generateCanonicalFingerprint(canonicalPayload);

    // 2. Verificar se já existe um resumo persistido para a mesma fingerprint
    const savedRecord = await getSavedSummaryRecord(mode, currentFingerprint);

    if (!forceRefresh && savedRecord) {
      if (savedRecord.text_status === 'READY' && savedRecord.text) {
        // REUTILIZAÇÃO PERFEITA: Mesmos dados -> Mesmo Texto + Mesmo Áudio
        // ZERO chamadas adicionais de Gemini e ZERO chamadas de TTS!
        if (mode === 'today' && setAiSummaryToday) setAiSummaryToday(savedRecord.text);
        else if ((mode === 'tomorrow' || mode === 'next_days') && setAiSummaryTomorrow) setAiSummaryTomorrow(savedRecord.text);
        if (setIsGeneratingAISummary) setIsGeneratingAISummary(false);
        return savedRecord.text;
      }

      if (savedRecord.text_status === 'GENERATING' && !isLeaseExpired(savedRecord.generation_started_at)) {
        // Geração já em andamento em outro dispositivo -> Aguarda sem duplicar requisição
        if (savedRecord.text) {
          if (mode === 'today' && setAiSummaryToday) setAiSummaryToday(savedRecord.text);
          else if ((mode === 'tomorrow' || mode === 'next_days') && setAiSummaryTomorrow) setAiSummaryTomorrow(savedRecord.text);
        }
        if (setIsGeneratingAISummary) setIsGeneratingAISummary(false);
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
          const geminiPrompt = buildGeminiPrompt(smartText);
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
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
      audio_status: 'READY',
      generation_started_at: null,
      error_message: null,
    });

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

      let base = '';
      if (assemblyItems.length > 0) {
        base = `uma entrega${custPart}${cityPart}${distPart}, de ${itemsText}, sendo ${assemblyItems.join(' e ')}, com montagem no endereço`;
      } else {
        base = `uma entrega${custPart}${cityPart}${distPart}, de ${itemsText}`;
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
    return 'Sem entregas para hoje.';
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
    const dayBlocks: string[] = [];

    for (const dateKey of sortedDates) {
      const dayOrders = ordersByDate.get(dateKey) || [];
      if (dayOrders.length === 0) continue;

      const dateLabel = formatExtendDateLabel(dateKey, todayStr, tomorrowStr);
      const dayOverview = `${dateLabel}, temos ${dayOrders.length} ${dayOrders.length === 1 ? 'entrega programada' : 'entregas programadas'}.`;
      const dayDetails = formatOrdersGroup(dayOrders);

      dayBlocks.push(`${dayOverview} ${dayDetails}`.trim());
    }

    return dayBlocks.join(' ').trim().replace(/\s+/g, ' ');
  }

  // Escopo de Hoje ou Amanhã individual
  const periodLabel = payload.scope === 'today' ? 'para hoje' : 'para amanhã';
  const total = orders.length;
  const overview = `Para ${periodLabel === 'para today' || periodLabel === 'para hoje' ? 'hoje' : 'amanhã'}, temos ${total} ${total === 1 ? 'entrega programada' : 'entregas programadas'}.`;
  const details = formatOrdersGroup(orders);

  return `${overview} ${details}`.trim().replace(/\s+/g, ' ');
}

function buildGeminiPrompt(baseText: string): string {
  return `Você é o supervisor de logística da Móveis Morante conversando por áudio no WhatsApp com a equipe de entregas.
Sua única função é transformar o texto base fornecido em um áudio 100% natural, fluido e conversacional, perfeito para sintetizador de voz (Audio TTS).

REGRAS ABSOLUTAS:
1. Quando houver entregas em dias seguintes, SEMPRE anuncie claramente o dia e data antes de falar todas as entregas daquele respectivo dia (ex: 'Para amanhã, segunda-feira, dia 7 de setembro...', 'Para quarta-feira, dia 9 de setembro...').
2. Fale TODAS as entregas dos dias seguintes sem omitir nenhuma.
3. NUNCA mencione nome de produtos normais, A NÃO SER QUE TENHA MONTAGEM NO ENDEREÇO.
4. NUNCA diga 'sem montagem' ou 'não precisa de montagem'.
5. Mantenha a contagem de itens no MASCULINO: 'um item', 'dois itens', 'três itens'.
6. NUNCA mencione a palavra 'Colombo'. Só fale a cidade se for fora de Colombo (ex: 'em Curitiba').
7. Indique se a entrega é pertinho ou mais distante de acordo com a quilometragem quando informada.
8. Retorne APENAS o texto a ser pronunciado.

Texto base: "${baseText}"`;
}
