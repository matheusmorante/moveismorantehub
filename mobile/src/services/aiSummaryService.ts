import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import {
  formatTimeNatural,
  formatDistanceNatural,
  formatProductNameWithArticle,
  isAssemblyOutsideType
} from '../utils/aiSummaryHelper';

export const generateDeliveryAISummary = async (
  mode: 'today' | 'tomorrow' | 'next5days',
  forceRefresh: boolean = false,
  setAiSummaryToday: (val: string) => void,
  setAiSummaryTomorrow: (val: string) => void,
  setIsGeneratingAISummary: (val: boolean) => void
) => {
  try {
    const { data: rawOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

    const currentFingerprint = (rawOrders || []).map((o: any) =>
      `${o.id}_${o.updated_at || o.created_at || ''}_${o.status || ''}_${o.deleted ? '1' : '0'}`
    ).join('|');

    const cacheKey = mode === 'today' ? '@morante_ai_summary_today' : '@morante_ai_summary_tomorrow';
    const fpKey = `@morante_ai_summary_fingerprint_${mode}`;

    if (!forceRefresh) {
      const [cachedText, storedFp] = await Promise.all([
        AsyncStorage.getItem(cacheKey),
        AsyncStorage.getItem(fpKey)
      ]);

      if (cachedText && storedFp === currentFingerprint) {
        if (mode === 'today') setAiSummaryToday(cachedText);
        else if (mode === 'tomorrow') setAiSummaryTomorrow(cachedText);
        return;
      }
    }

    setIsGeneratingAISummary(true);

    const getLocalDateString = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const parseOrderDateStr = (rawDate: any): string => {
      if (!rawDate) return '';
      const str = String(rawDate).trim();
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return str.split('T')[0];
    };

    const now = new Date();
    const todayStr = getLocalDateString(now);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    let targetDates: string[] = [todayStr];
    let periodLabel = 'para hoje';

    if (mode === 'today') {
      targetDates = [todayStr];
      periodLabel = 'para hoje';
    } else if (mode === 'tomorrow') {
      targetDates = [tomorrowStr];
      periodLabel = 'para amanhã';
    }

    let geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    try {
      const { data: storeSettings } = await supabase.from('store_settings').select('value').eq('key', 'gemini_api_key').maybeSingle();
      if (storeSettings?.value) {
        geminiKey = storeSettings.value.apiKey || storeSettings.value;
      }
    } catch (e) {}

    const deliveryOrders = (rawOrders || []).filter((o: any) => {
      const oData = o.order_data || {};
      if (oData.deleted || o.deleted) return false;
      const orderStatus = (o.status || oData.status || '').toLowerCase();
      if (orderStatus === 'draft' || orderStatus === 'rascunho') return false;

      const shipping = oData.shipping || {};
      const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
      const rawSchedDate = sched.date || sched.startDate || o.scheduled_date || o.date || '';
      const schedDate = parseOrderDateStr(rawSchedDate);

      return targetDates.includes(schedDate);
    });

    const morningDeliveries: any[] = [];
    const afternoonDeliveries: any[] = [];
    const unspecifiedDeliveries: any[] = [];
    let hasShowroomDisassembly = false;

    deliveryOrders.forEach((o: any) => {
      const oData = o.order_data || {};
      const shipping = oData.shipping || {};
      const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
      const deliveryAddr = shipping.deliveryAddress || shipping.address || {};
      const custData = oData.customerData || oData.customer || {};
      const custAddr = custData.address || custData.fullAddress || {};

      const rawCity = (deliveryAddr.city || shipping.city || custAddr.city || custData.city || o.city || '').trim();
      const rawNeighborhood = (deliveryAddr.neighborhood || shipping.neighborhood || custAddr.neighborhood || custData.neighborhood || '').trim();
      const city = rawCity || rawNeighborhood || 'Colombo';

      const items = oData.items || o.items || [];
      const allProductsWithArticles: string[] = [];
      let hasAssembly = false;

      const orderHandling = (oData.handlingType || oData.handling || oData.deliveryType || shipping.handlingType || shipping.handling || o.handling || o.handlingType || '').toString();
      const isOrderAssemblyOutside = isAssemblyOutsideType(orderHandling);

      items.forEach((item: any) => {
        const rawName = item.description || item.name || item.title || 'móvel';
        const itemQty = item.quantity || item.qty || 1;
        const itemHandling = (item.handlingType || item.handling || '').toString();
        const productWithArticle = formatProductNameWithArticle(rawName, itemQty);
        allProductsWithArticles.push(productWithArticle);

        const isItemAssembly = itemHandling ? isAssemblyOutsideType(itemHandling) : isOrderAssemblyOutside;
        if (isItemAssembly) hasAssembly = true;
      });

      const timeVal = (sched.startTime || sched.time || '').trim();
      const endTimeVal = (sched.endTime || '').trim();
      const timeValLower = timeVal.toLowerCase();
      const periodVal = (sched.period || sched.shift || sched.turn || '').toLowerCase();
      const combinedVal = `${timeValLower} ${periodVal}`.trim();

      let timeNatural = '';
      if (timeVal || endTimeVal) {
        timeNatural = formatTimeNatural(timeVal, endTimeVal);
      }

      const distRaw = shipping.distance ?? shipping.distanceKm ?? o.distance ?? o.distanceKm;
      const distNum = typeof distRaw === 'number' ? distRaw : (parseFloat(distRaw) || null);
      const distCategory: 'close' | 'far' = (distNum !== null && distNum > 8) || (city.toLowerCase() !== 'colombo') ? 'far' : 'close';
      const distNatural = formatDistanceNatural(distNum);

      const obsText = ((oData.observation || '') + ' ' + (o.observation || '') + ' ' + (oData.notes || '') + ' ' + (oData.notice || '')).trim();
      const notices: string[] = [];
      const obsLower = obsText.toLowerCase();

      const locationInfoText = ((deliveryAddr.complement || '') + ' ' + (deliveryAddr.address || '') + ' ' + (deliveryAddr.street || '') + ' ' + (deliveryAddr.type || '') + ' ' + (shipping.addressType || '') + ' ' + (custAddr.complement || '') + ' ' + (custAddr.address || '') + ' ' + obsText).toLowerCase();

      const isApartmentOrKitnetOrFundos = locationInfoText.includes('apto') || locationInfoText.includes('apartamento') || locationInfoText.includes('apt') || locationInfoText.includes('kitnet') || locationInfoText.includes('kit') || locationInfoText.includes('quitinete') || locationInfoText.includes('fundos') || locationInfoText.includes('nos fundos');

      if (isApartmentOrKitnetOrFundos) {
        if (locationInfoText.includes('apto') || locationInfoText.includes('apartamento') || locationInfoText.includes('apt')) {
          notices.push('ligar quando chegar (apartamento)');
        } else if (locationInfoText.includes('kitnet') || locationInfoText.includes('kit') || locationInfoText.includes('quitinete')) {
          notices.push('ligar quando chegar (kitnet)');
        } else {
          notices.push('ligar quando chegar (casa nos fundos)');
        }
      }

      if (obsLower.includes('ligar antes') || obsLower.includes('avisar antes') || obsLower.includes('chamar antes') || obsLower.includes('whatsapp antes') || obsLower.includes('avisar quando estiver indo')) {
        notices.push('ligar antes de ir');
      }

      const payments = oData.payments || o.payments || (oData.payment ? [oData.payment] : []);
      const isPendingCardPayment = payments.some((p: any) => {
        const method = (p.method || p.paymentMethod || p.type || '').toLowerCase();
        const status = (p.status || p.paymentStatus || oData.paymentStatus || o.payment_status || '').toLowerCase();
        const isCard = method.includes('card') || method.includes('cartao') || method.includes('cartão') || method.includes('debito') || method.includes('débito') || method.includes('credito') || method.includes('crédito');
        const isPending = status.includes('pend') || status.includes('receber') || status.includes('entrega') || status === 'unpaid';
        return isCard && isPending;
      }) || (oData.balanceDue && oData.balanceDue > 0 && ((oData.paymentMethod || '').toLowerCase().includes('cart') || (oData.paymentMethod || '').toLowerCase().includes('deb') || (oData.paymentMethod || '').toLowerCase().includes('cred')));

      if (isPendingCardPayment || obsLower.includes('maquina') || obsLower.includes('máquina') || obsLower.includes('maquininha')) {
        notices.push('levar máquina de cartão');
      }

      if (obsLower.includes('troco')) {
        const trocoMatch = obsLower.match(/troco\s+(?:para|de)?\s*R?\$?\s*(\d+)/i);
        if (trocoMatch && trocoMatch[1]) {
          notices.push(`levar troco para ${trocoMatch[1]} reais`);
        } else {
          notices.push('levar troco');
        }
      }

      if (obsLower.includes('cooktop') || obsLower.includes('recorte')) notices.push('fazer recorte para cooktop');
      if (obsLower.includes('forro') || obsLower.includes('furo') || obsLower.includes('serra copo') || obsLower.includes('cerra copo')) notices.push('fazer furo no forro e lembrar de levar serra copo');
      if (obsLower.includes('nota fiscal') || obsLower.includes('levar nota') || /\bnf\b/.test(obsLower)) notices.push('levar nota fiscal');

      const hasWallMountService = items.some((item: any) => {
        const n = (item.description || item.name || item.title || '').toLowerCase();
        return n.includes('instalação') || n.includes('instalacao') || n.includes('parede') || n.includes('fixação') || n.includes('fixacao');
      });
      if (hasWallMountService || obsLower.includes('instalação na parede') || obsLower.includes('instalacao na parede') || obsLower.includes('fixar na parede')) notices.push('fazer instalação na parede');
      if (obsLower.includes('desmontagem') || obsLower.includes('mostruário') || obsLower.includes('mostruario')) {
        notices.push('fazer desmontagem no mostruário');
        hasShowroomDisassembly = true;
      }

      const deliveryInfo = {
        city,
        isColombo: city.toLowerCase() === 'colombo',
        distNum,
        distCategory,
        distNatural,
        hasAssembly,
        allProductsWithArticles,
        timeNatural,
        notices
      };

      const isMorning = combinedVal.includes('manhã') || combinedVal.includes('manha') || combinedVal.includes('morning') || /^(06|07|08|09|10|11):/.test(timeValLower);
      const isAfternoon = combinedVal.includes('tarde') || combinedVal.includes('afternoon') || /^(12|13|14|15|16|17|18):/.test(timeValLower);

      if (isMorning) morningDeliveries.push(deliveryInfo);
      else if (isAfternoon) afternoonDeliveries.push(deliveryInfo);
      else unspecifiedDeliveries.push(deliveryInfo);
    });

    const totalDeliveries = deliveryOrders.length;
    let smartText = '';

    if (totalDeliveries === 0) {
      smartText = `Não há entregas agendadas ${periodLabel}. Operação e frota disponíveis para novos lançamentos.`;
    } else {
      const buildShiftData = (shiftTitle: string, deliveries: any[]) => {
        if (deliveries.length === 0) return null;
        const count = deliveries.length;

        const standardDeliveries = deliveries.filter(d => d.distCategory === 'close' && !d.hasAssembly && !d.timeNatural && d.notices.length === 0);
        const allProducts = deliveries.flatMap(d => d.allProductsWithArticles);
        const exceptionDeliveries = deliveries.filter(d => !standardDeliveries.includes(d));

        const productGroupMap: Record<string, number> = {};
        allProducts.forEach(p => {
          productGroupMap[p] = (productGroupMap[p] || 0) + 1;
        });

        const groupedProductsList = Object.entries(productGroupMap).map(([pName, pQty]) => {
          if (pQty > 1 && !pName.startsWith('dois') && !pName.startsWith('duas')) {
            return `${pQty} ${pName.replace(/^(um|uma)\s+/i, '')}s`;
          }
          return pName;
        });

        return {
          shiftTitle,
          count,
          groupedProductsList,
          exceptionsCount: exceptionDeliveries.length,
          exceptions: exceptionDeliveries.map(e => ({
            location: e.isColombo ? 'na região próxima' : `em ${e.city}`,
            distance: e.distNatural,
            hasAssembly: e.hasAssembly ? 'com montagem no endereço' : 'sem montagem',
            time: e.timeNatural || 'horário padrão do turno',
            products: e.allProductsWithArticles,
            actions: e.notices
          })),
          shiftActions: Array.from(new Set(deliveries.flatMap(d => d.notices)))
        };
      };

      const morningShift = buildShiftData('manhã', morningDeliveries);
      const afternoonShift = buildShiftData('tarde', afternoonDeliveries);
      const unspecShift = buildShiftData('sem horário definido', unspecifiedDeliveries);

      const allDayNotices = Array.from(new Set([
        ...morningDeliveries.flatMap(d => d.notices),
        ...afternoonDeliveries.flatMap(d => d.notices),
        ...unspecifiedDeliveries.flatMap(d => d.notices)
      ]));

      const structuredPayload = {
        period: periodLabel === 'para hoje' ? 'hoje' : 'amanhã',
        totalDeliveries,
        morningCount: morningDeliveries.length,
        afternoonCount: afternoonDeliveries.length,
        unspecifiedCount: unspecifiedDeliveries.length,
        hasShowroomDisassembly,
        shifts: [morningShift, afternoonShift, unspecShift].filter(Boolean),
        allDayActionableNotices: allDayNotices
      };

      const geminiPrompt = `Você é o supervisor de logística da Móveis Morante conversando em áudio no WhatsApp com a equipe de motoristas e montadores.
Sua missão é transformar os dados estruturados das entregas abaixo em um resumo falado EXTREMAMENTE NATURAL, AGRADÁVEL, DIRETO E FLUIDO para conversão em sintetizador de voz (Audio TTS).

REGRAS OBRIGATÓRIAS DO RESUMO:
1. COMECE COM O TOTAL E A DIVISÃO DOS TURNOS: Exemplo: "Hoje temos nove entregas, sendo seis pela manhã e três à tarde."
2. ORGANIZE O CONTEÚDO POR PERÍODO ("Pela manhã...", "À tarde...").
3. REGRA CRÍTICA DE PRODUTOS: NAS ENTREGAS NORMAIS, PROIBIDO CITAR O NOME DOS PRODUTOS! Fale apenas a quantidade de itens (ex: "uma entrega com 3 itens", "duas entregas com 1 item cada").
4. MONTAGEM NO LOCAL: CITAR O NOME DO PRODUTO SOMENTE QUANDO HOUVER MONTAGEM NO LOCAL DA ENTREGA (ex: "com montagem no local do guarda-roupa e da cozinha").
5. DESTACAR EXCEÇÕES INDIVIDUALMENTE. NUNCA fale "entrega em próxima". Fale "entrega próxima" ou "entrega em Curitiba".
6. REGRAS RÍGIDAS DE LIGAÇÕES E AÇÕES OPERACIONAIS (ligar antes de ir, ligar quando chegar em apto/kitnet/fundos, levar máquina de cartão, levar troco, serra copo, recorte cooktop, parede, mostruário).
7. HORÁRIOS EM LINGUAGEM NATURAL FALADA.
8. DISTÂNCIAS NATURAIS. NUNCA fale a palavra "Colombo".
9. SEÇÃO FINAL OBRIGATÓRIA DE CUIDADOS E AÇÕES: PROIBIDO USAR A PALAVRA "ATENÇÃO". Diga diretamente: "Para hoje, lembrar de...".
10. REGRAS DE AUDIO TTS: PROIBIDO markdown, emojis, parênteses, dois-pontos, tabelas, SKUs.
11. RETORNE APENAS O TEXTO A SER PRONUNCIADO.

DADOS ESTRUTURADOS DA OPERAÇÃO:
${JSON.stringify(structuredPayload, null, 2)}`;

      const generateLocalFallbackSummary = (payload: any): string => {
        if (!payload || payload.totalDeliveries === 0) {
          return `Não há entregas agendadas para ${payload?.period || 'hoje'}. Operação e frota disponíveis.`;
        }
        const periodText = payload.period === 'hoje' ? 'Hoje' : 'Para amanhã';
        let text = `${periodText} temos ${payload.totalDeliveries} entregas`;

        if (payload.morningCount > 0 && payload.afternoonCount > 0) {
          text += `, sendo ${payload.morningCount} pela manhã e ${payload.afternoonCount} à tarde.`;
        } else if (payload.morningCount > 0) {
          text += ` todas pela manhã.`;
        } else if (payload.afternoonCount > 0) {
          text += ` todas à tarde.`;
        } else {
          text += `.`;
        }

        (payload.shifts || []).forEach((shift: any) => {
          if (!shift) return;
          text += ` Pela ${shift.shiftTitle}, temos ${shift.count} entregas.`;
          if (shift.exceptions && shift.exceptions.length > 0) {
            shift.exceptions.forEach((e: any) => {
              text += ` Entrega ${e.location || (e.isColombo ? 'na região próxima' : `em ${e.city}`)}`;
              if (e.distance && e.distance !== 'próxima') text += `, ${e.distance}`;
              if (e.hasAssembly && e.hasAssembly !== 'sem montagem') {
                text += `, com montagem no local ${e.products ? `do ${e.products.join(' e ')}` : ''}`;
              }
              if (e.time && e.time !== 'horário padrão do turno') text += `, agendada ${e.time}`;
              if (e.actions && e.actions.length > 0) text += `. Lembrar de: ${e.actions.join(', ')}.`;
              else text += `.`;
            });
          }
        });

        if (payload.allDayActionableNotices && payload.allDayActionableNotices.length > 0) {
          text += ` Para ${payload.period}, lembrar de: ${payload.allDayActionableNotices.join(', ')}.`;
        } else {
          text += ` Para ${payload.period}, operação normal, sem observações especiais.`;
        }

        return text;
      };

      try {
        if (geminiKey) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: geminiPrompt }] }] }),
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId));

          if (res.ok) {
            const resJson = await res.json();
            const aiText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText && aiText.trim()) {
              smartText = aiText.trim()
                .replace(/[*#]/g, '')
                .replace(/:/g, ' ')
                .replace(/[()]/g, '')
                .replace(/\s+/g, ' ');
            }
          }
        }
      } catch (fetchErr) {
        console.warn('Erro/Timeout ao chamar API do Gemini para o resumo:', fetchErr);
      }

      if (!smartText || !smartText.trim()) {
        smartText = generateLocalFallbackSummary(structuredPayload);
      }
    }

    try {
      if (mode === 'today') {
        setAiSummaryToday(smartText);
        await AsyncStorage.setItem('@morante_ai_summary_today', smartText).catch(() => {});
        await AsyncStorage.setItem('@morante_ai_summary_fingerprint_today', currentFingerprint).catch(() => {});
      } else if (mode === 'tomorrow') {
        setAiSummaryTomorrow(smartText);
        await AsyncStorage.setItem('@morante_ai_summary_tomorrow', smartText).catch(() => {});
        await AsyncStorage.setItem('@morante_ai_summary_fingerprint_tomorrow', currentFingerprint).catch(() => {});
      }
    } catch (storageErr) {
      console.warn('Cota de armazenamento excedida para AsyncStorage:', storageErr);
    }
  } catch (err) {
    console.warn('Erro ao gerar resumo de entregas com IA:', err);
    const fallbackText = mode === 'today'
      ? 'Não há entregas agendadas para hoje. Operação e frota disponíveis.'
      : 'Não há entregas agendadas para amanhã. Operação e frota disponíveis.';
    if (mode === 'today') setAiSummaryToday(fallbackText);
    else if (mode === 'tomorrow') setAiSummaryTomorrow(fallbackText);
  } finally {
    setIsGeneratingAISummary(false);
  }
};
