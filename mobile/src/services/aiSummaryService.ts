import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

export const generateDeliveryAISummary = async (
  mode: 'today' | 'tomorrow' | 'next5days',
  forceRefresh: boolean = false,
  setAiSummaryToday?: (val: string) => void,
  setAiSummaryTomorrow?: (val: string) => void,
  setIsGeneratingAISummary?: (val: boolean) => void
) => {
    try {
      // Busca dados dos pedidos e configurações do sistema de forma segura com fallback
      const { data: rawOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

      // Fingerprint dos pedidos (IDs, data de atualização/criação, status, exclusão e dados do pedido)
      const currentFingerprint = (rawOrders || []).map((o: any) => 
        `${o.id}_${o.updated_at || o.created_at || ''}_${o.status || ''}_${o.deleted || ''}_${JSON.stringify(o.order_data || {})}`
      ).join('|');

      const cacheKey = mode === 'today' ? '@morante_ai_summary_today' : '@morante_ai_summary_tomorrow';
      const fpKey = `@morante_ai_summary_fingerprint_${mode}`;

      if (!forceRefresh) {
        const [cachedText, storedFp] = await Promise.all([
          AsyncStorage.getItem(cacheKey),
          AsyncStorage.getItem(fpKey)
        ]);

        if (cachedText && storedFp === currentFingerprint) {
          if (mode === 'today' && setAiSummaryToday) setAiSummaryToday(cachedText);
          else if (mode === 'tomorrow' && setAiSummaryTomorrow) setAiSummaryTomorrow(cachedText);
          return; // Retorna imediatamente sem chamar a IA nem gastar cota!
        }
      }

      if (setIsGeneratingAISummary) setIsGeneratingAISummary(true);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      let targetDates: string[] = [todayStr];
      let periodLabel = 'para hoje';

      if (mode === 'today') {
        targetDates = [todayStr];
        periodLabel = 'para hoje';
      } else if (mode === 'tomorrow') {
        targetDates = [tomorrowStr];
        periodLabel = 'para amanhã';
      }

      let settingsData: any = null;
      try {
        const { data } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
        settingsData = data;
      } catch (e) {
        console.warn('Configurações não encontradas ou erro ao carregar:', e);
      }

      const geminiKey = settingsData?.geminiApiKey || process.env.VITE_GEMINI_API_KEY || '';
      const handlingOptions: any[] = settingsData?.handlingOptions || settingsData?.orderTypes || [];

      // Função auxiliar para verificar se a modalidade/manuseio REALMENTE é montagem fora/no local da entrega
      const isAssemblyOutsideType = (handlingTypeStr: string) => {
        if (!handlingTypeStr) return false;
        const hLower = handlingTypeStr.toLowerCase().trim();

        // 1. Verifica na configuração cadastrada de manuseio no ERP
        if (Array.isArray(handlingOptions) && handlingOptions.length > 0) {
          const matchedOpt = handlingOptions.find((opt: any) =>
            opt.label && opt.label.toLowerCase().trim() === hLower
          );
          if (matchedOpt && typeof matchedOpt.isAssemblyOutside === 'boolean') {
            return matchedOpt.isAssemblyOutside;
          }
        }

        // 2. Fallbacks de segurança: se for montagem no depósito ou por conta do cliente, NÃO é montagem fora
        if (
          hLower.includes('depósito') ||
          hLower.includes('deposito') ||
          hLower.includes('retirada') ||
          hLower.includes('cliente') ||
          hLower.includes('entregue montado')
        ) {
          return false;
        }

        // Se contiver indicação explícita de montagem no local/fora
        return (
          hLower.includes('montagem no local') ||
          hLower.includes('montagem fora') ||
          hLower.includes('montagem na entrega')
        );
      };

      // Função auxiliar para abreviar o nome do produto (máximo 1 a 3 palavras simples, removendo cores e combinações como freijó/off white, preto/branco, cinamomo, etc.)
      const simplifyProductName = (rawName: string): string => {
        if (!rawName) return 'móvel';
        let cleaned = rawName
          .replace(/\(.*?\)/g, '')
          .replace(/\[.*?\]/g, '')
          .replace(/\b[\w\u00C0-\u024F]+(?:\/[\w\u00C0-\u024F]+)+\b/g, '') // remove "preto/branco", "freijo/offwhite"
          .replace(/[-–—]/g, ' ')
          .trim();

        const colorWords = new Set([
          'freijo', 'freijó', 'off', 'white', 'offwhite', 'preto', 'preta',
          'branco', 'branca', 'cinamomo', 'grafite', 'nobre', 'imbuia', 'carvalho',
          'nogueira', 'amêndoa', 'amendoa', 'patina', 'pátina', 'cacau', 'savana',
          'nature', 'jequitiba', 'jequitibá', 'cedro', 'marrom', 'cinza', 'bege',
          'areia', 'champagne', 'champanhe', 'castanho', 'fendi', 'ébano', 'ebano',
          'mel', 'amarelo', 'azul', 'verde', 'rosa', 'vermelho', 'dourado', 'prata'
        ]);

        const words = cleaned.split(/\s+/).filter(Boolean);
        const filteredWords = words.filter(w => !colorWords.has(w.toLowerCase().trim()));

        if (filteredWords.length === 0) return 'móvel';
        return filteredWords.slice(0, 3).join(' ');
      };

      const deliveryOrders = (rawOrders || []).filter((o: any) => {
        const oData = o.order_data || {};
        if (o.deleted || o.is_deleted || o.status === 'deleted' || o.status === 'cancelled' || oData.deleted) return false;

        const shipping = oData.shipping || {};
        const isDelivery = shipping.deliveryMethod === 'delivery' || !shipping.deliveryMethod;
        const schedDate = (shipping.scheduling?.date || o.scheduled_date || o.created_at || '').split('T')[0];

        if (!isDelivery) return false;
        return targetDates.includes(schedDate);
      });

      // Helper para formatar o nome do produto com o artigo gramatical correto (um / uma / dois / duas)
      const formatProductNameWithArticle = (rawName: string, itemQty: number = 1): string => {
        const short = simplifyProductName(rawName).toLowerCase();
        // Usa apenas a PRIMEIRA palavra para determinar o gênero (evita falsos positivos como "balcão para pia")
        const firstWord = short.split(' ')[0];

        const feminineFirstWords = [
          'escrivaninha', 'cômoda', 'comoda', 'pia', 'mesa', 'cadeira',
          'poltrona', 'cozinha', 'cama', 'sapateira', 'cristaleira', 'bancada',
          'prateleira', 'estante', 'estação', 'banheira', 'penteadeira'
        ];
        const isFeminine = feminineFirstWords.some(fw => firstWord === fw || firstWord.startsWith(fw));

        if (itemQty === 1) {
          return `${isFeminine ? 'uma' : 'um'} ${short}`;
        } else if (itemQty === 2) {
          return `${isFeminine ? 'duas' : 'dois'} ${short}s`;
        } else {
          return `${itemQty} ${short}s`;
        }
      };

      // Helper para converter números cardinais por extenso (feminino para entregas)
      const numWord = (n: number): string => {
        const words: Record<number, string> = {
          0: 'zero', 1: 'uma', 2: 'duas', 3: 'três', 4: 'quatro', 5: 'cinco',
          6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez',
          11: 'onze', 12: 'doze', 13: 'treze', 14: 'quatorze', 15: 'quinze',
          16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove', 20: 'vinte',
          21: 'vinte e uma', 22: 'vinte e duas', 23: 'vinte e três', 24: 'vinte e quatro',
          25: 'vinte e cinco', 26: 'vinte e seis', 27: 'vinte e sete', 28: 'vinte e oito',
          29: 'vinte e nove', 30: 'trinta'
        };
        return words[n] ?? String(n);
      };

      // Helper para converter números cardinais masculinos por extenso (ex: "um item", "dois itens")
      const numWordMasculine = (n: number): string => {
        const words: Record<number, string> = {
          0: 'zero', 1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco',
          6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez',
          11: 'onze', 12: 'doze', 13: 'treze', 14: 'quatorze', 15: 'quinze',
          16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove', 20: 'vinte',
          21: 'vinte e um', 22: 'vinte e dois', 23: 'vinte e três', 24: 'vinte e quatro',
          25: 'vinte e cinco', 26: 'vinte e seis', 27: 'vinte e sete', 28: 'vinte e oito',
          29: 'vinte e nove', 30: 'trinta'
        };
        return words[n] ?? String(n);
      };

      // Helper para converter distâncias — usa vírgula real para o TTS ler corretamente
      const formatDistanceConversational = (distNum: number | null): string => {
        if (distNum === null || isNaN(distNum)) return '';
        if (distNum <= 5) return 'pertinho';

        const numStr = distNum.toFixed(1).replace('.', ',');
        if (distNum <= 10) return `não tão perto, a ${numStr} quilômetros`;
        if (distNum <= 20) return `meio longe, a ${numStr} quilômetros`;
        return `bem longe, a ${numStr} quilômetros`;
      };

      // Coleções de entregas por turno
      const morningDeliveries: any[] = [];
      const afternoonDeliveries: any[] = [];
      const unspecifiedDeliveries: any[] = [];

      const citiesMap: Record<string, number> = {};
      let hasFarAssembly = false;
      let hasShowroomDisassembly = false;

      deliveryOrders.forEach((o: any) => {
        const oData = o.order_data || {};
        const shipping = oData.shipping || {};
        const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};\r
\r
        const obsText = (\r
          oData.observations || oData.notes || oData.observation ||\r
          shipping.observations || shipping.notes || shipping.observation ||\r
          o.observations || o.notes || o.observation || ''\r
        ).toString().toLowerCase();

        const deliveryAddr = shipping.deliveryAddress || shipping.address || {};
        const custData = oData.customerData || oData.customer || {};
        const custAddr = custData.address || custData.fullAddress || {};

        const rawCity = (
          deliveryAddr.city ||
          shipping.city ||
          custAddr.city ||
          custData.city ||
          o.city ||
          ''
        ).trim();

        const rawNeighborhood = (
          deliveryAddr.neighborhood ||
          shipping.neighborhood ||
          custAddr.neighborhood ||
          custData.neighborhood ||
          ''
        ).trim();

        const city = rawCity || rawNeighborhood || 'Colombo';
        citiesMap[city] = (citiesMap[city] || 0) + 1;

        const distRaw = shipping.distance ?? shipping.distanceKm ?? o.distance ?? o.distanceKm;
        const distNum = typeof distRaw === 'number' ? distRaw : (parseFloat(distRaw) || null);
        const distText = formatDistanceConversational(distNum);

        const items = oData.items || o.items || [];
        const assemblyItems: string[] = [];
        const noAssemblyItems: string[] = [];

        const orderHandling = (
          oData.handlingType ||
          oData.handling ||
          oData.deliveryType ||
          shipping.handlingType ||
          shipping.handling ||
          o.handling ||
          o.handlingType ||
          ''
        ).toString();
        const isOrderAssemblyOutside = isAssemblyOutsideType(orderHandling);

        items.forEach((item: any) => {
          const rawName = item.description || item.name || item.title || 'móvel';
          const itemQty = item.quantity || item.qty || 1;
          const itemHandling = (item.handlingType || item.handling || '').toString();
          const productWithArticle = formatProductNameWithArticle(rawName, itemQty);

          let isAssembly = false;
          if (itemHandling) {
            isAssembly = isAssemblyOutsideType(itemHandling);
          } else {
            isAssembly = isOrderAssemblyOutside;
          }

          if (!isAssembly && isOrderAssemblyOutside) {
            const hLower = itemHandling.toLowerCase();
            if (!hLower.includes('depósito') && !hLower.includes('deposito') && !hLower.includes('retirada') && !hLower.includes('cliente') && !hLower.includes('entregue montado')) {
              isAssembly = true;
            }
          }

          if (isAssembly) {
            assemblyItems.push(productWithArticle);
          } else {
            noAssemblyItems.push(productWithArticle);
          }
        });

        const timeVal = (sched.startTime || sched.time || '').trim();
        const endTimeVal = (sched.endTime || '').trim();
        const timeValLower = timeVal.toLowerCase();
        const periodVal = (sched.period || sched.shift || sched.turn || '').toLowerCase();
        const combinedVal = `${timeValLower} ${periodVal}`.trim();

        const isStandardWindow = (tStart: string, tEnd: string): boolean => {
          if (!tStart && !tEnd) return true;

          const parseMinutes = (t: string) => {
            const clean = t.replace(/[^\d:]/g, '');
            const parts = clean.split(':');
            if (parts[0]) {
              const h = parseInt(parts[0], 10);
              const m = parts[1] ? parseInt(parts[1], 10) : 0;
              return h * 60 + m;
            }
            return null;
          };

          const sMin = parseMinutes(tStart);
          const eMin = parseMinutes(tEnd);

          // Padrão Manhã: 09:00 (540m) até 12:00 (720m)
          // Padrão Tarde: 13:00 (780m) até 18:00 (1080m)
          if (sMin !== null && eMin !== null) {
            if (sMin >= 540 && sMin <= 570 && eMin >= 720 && eMin <= 750) return true;
            if (sMin >= 780 && sMin <= 810 && eMin >= 1050 && eMin <= 1110) return true;
            return false;
          }

          if (sMin !== null && eMin === null) {
            if (sMin === 540 || sMin === 780) return true;
            return false;
          }

          return true;
        };

        let scheduledTimeStr = '';
        if (!isStandardWindow(timeVal, endTimeVal)) {
          if (timeVal && endTimeVal) {
            scheduledTimeStr = `agendada para um período em específico entre ${timeVal} e ${endTimeVal}`;
          } else if (timeVal) {
            scheduledTimeStr = `agendada para um horário em específico às ${timeVal}`;
          }
        }

        const fullAddressText = (
          (deliveryAddr.address || '') + ' ' +
          (deliveryAddr.street || '') + ' ' +
          (deliveryAddr.complement || '') + ' ' +
          (deliveryAddr.type || '') + ' ' +
          (deliveryAddr.locationType || '') + ' ' +
          (shipping.complement || '') + ' ' +
          (shipping.address || '') + ' ' +
          (custAddr.complement || '') + ' ' +
          (custAddr.address || '') + ' ' +
          obsText
        ).toLowerCase();

        const itemHasShowroom = items.some((item: any) => {
          const h = (item.handlingType || item.handling || '').toLowerCase();
          const n = (item.description || item.name || item.title || '').toLowerCase();
          const notes = (item.notes || item.observation || '').toLowerCase();
          return (
            h.includes('mostruário') || h.includes('mostruario') ||
            n.includes('mostruário') || n.includes('mostruario') ||
            notes.includes('mostruário') || notes.includes('mostruario')
          );
        });
        const obsHasShowroom = obsText.includes('mostruário') || obsText.includes('mostruario') || obsText.includes('desmontagem no mostruario') || obsText.includes('desmontagem no mostruário');
        if (itemHasShowroom || obsHasShowroom) {
          hasShowroomDisassembly = true;
        }

        const notices: string[] = [];
        if (obsText.includes('maquina') || obsText.includes('máquina') || obsText.includes('cartao') || obsText.includes('cartão')) {
          notices.push('levar máquina de cartão');
        }
        if (obsText.includes('cooktop') || obsText.includes('recorte')) {
          notices.push('fazer recorte para cooktop');
        }
        if (obsText.includes('forro') || obsText.includes('furo') || obsText.includes('serra copo') || obsText.includes('cerra copo')) {
          notices.push('fazer furo no forro e lembrar de levar serra copo');
        }
        if (obsText.includes('ligar antes') || obsText.includes('avisar antes') || obsText.includes('chamar antes') || obsText.includes('whatsapp antes')) {
          notices.push('ligar antes de ir');
        }
        if (obsText.includes('nota fiscal') || obsText.includes('levar nota') || /\bnf\b/.test(obsText)) {
          notices.push('levar nota fiscal');
        }

        // Detecção de tipo de local de entrega (apartamento, kitnet ou fundos)
        if (fullAddressText.includes('apartamento') || fullAddressText.includes('apto') || fullAddressText.includes('apt ')) {
          notices.push('ligar quando chegar porque é apartamento');
        } else if (fullAddressText.includes('kitnet') || fullAddressText.includes('quitinete') || fullAddressText.includes('kit ')) {
          notices.push('ligar quando chegar porque é kitnet');
        } else if (fullAddressText.includes('fundos') || fullAddressText.includes('fundo')) {
          notices.push('ligar quando chegar porque é nos fundos');
        }

        const hasWallMountService = items.some((item: any) => {
          const n = (item.description || item.name || item.title || '').toLowerCase();
          return n.includes('instalação') || n.includes('instalacao') || n.includes('parede') || n.includes('fixação') || n.includes('fixacao');
        });
        if (hasWallMountService || obsText.includes('instalação na parede') || obsText.includes('instalacao na parede') || obsText.includes('fixar na parede')) {
          notices.push('fazer instalação na parede');
        }

        const isMorning =
          combinedVal.includes('manhã') || combinedVal.includes('manha') ||
          combinedVal.includes('morning') ||
          /^(06|07|08|09|10|11):/.test(timeValLower);

        const isAfternoon =
          combinedVal.includes('tarde') || combinedVal.includes('afternoon') ||
          /^(12|13|14|15|16|17|18):/.test(timeValLower);

        const deliveryInfo = {
          city,
          isColombo: city.toLowerCase() === 'colombo',
          distText,
          assemblyItems,
          noAssemblyItems,
          scheduledTimeStr,
          notices
        };

        if (isMorning) morningDeliveries.push(deliveryInfo);
        else if (isAfternoon) afternoonDeliveries.push(deliveryInfo);
        else unspecifiedDeliveries.push(deliveryInfo);
      });

      const totalDeliveries = deliveryOrders.length;
      let smartText = '';

      if (totalDeliveries === 0) {
        smartText = `Não há entregas agendadas ${periodLabel}. Operação e frota disponíveis para novos lançamentos.`;
      } else {
        const morningCount = morningDeliveries.length;
        const afternoonCount = afternoonDeliveries.length;
        const unspecCount = unspecifiedDeliveries.length;

        // Visão geral: conta todos os turnos
        let shiftIntro = '';
        const hasMorning = morningCount > 0;
        const hasAfternoon = afternoonCount > 0;
        const hasUnspec = unspecCount > 0;

        if (hasMorning && hasAfternoon && !hasUnspec) {
          shiftIntro = `, com ${numWord(morningCount)} pela manhã e ${numWord(afternoonCount)} à tarde`;
        } else if (hasMorning && hasAfternoon && hasUnspec) {
          const totalMorning = morningCount + unspecCount;
          shiftIntro = `, com ${numWord(totalMorning)} pela manhã e ${numWord(afternoonCount)} à tarde`;
        } else if (hasMorning && !hasAfternoon) {
          const totalMorning = morningCount + unspecCount;
          shiftIntro = totalMorning === 1 ? `, no período da manhã` : `, todas no período da manhã`;
        } else if (hasAfternoon && !hasMorning && !hasUnspec) {
          shiftIntro = afternoonCount === 1 ? `, no período da tarde` : `, todas no período da tarde`;
        } else if (hasAfternoon && hasUnspec) {
          shiftIntro = `, com ${numWord(unspecCount + morningCount)} pela manhã e ${numWord(afternoonCount)} à tarde`;
        } else if (hasUnspec && !hasMorning && !hasAfternoon) {
          shiftIntro = unspecCount === 1 ? `, sem horário definido` : `, sem horário definido`;
        }

        const deliveriesWord = numWord(totalDeliveries);
        const deliveriesText = totalDeliveries === 1 ? 'uma entrega programada' : `${deliveriesWord} entregas programadas`;
        const overviewSentence = `Para ${periodLabel === 'para hoje' ? 'hoje' : 'amanhã'}, temos ${deliveriesText}${shiftIntro}.`;

        // Helper para formatar uma lista de entregas em texto respeitando as regras estritas:
        // - Nomes de produtos NÃO são citados, A NÃO SER QUE SEJA UM PRODUTO COM MONTAGEM NO ENDEREÇO!
        // - Informa a quantidade total de itens da entrega (usa "dois itens" no masculino).
        // - NUNCA menciona "sem montagem".
        const formatDeliveryParts = (deliveries: any[]) =>
          deliveries.map(d => {
            const citySuffix = d.isColombo ? '' : ` para ${d.city}`;
            const distSuffix = d.distText ? `, ${d.distText}` : '';
            const totalItemCount = d.assemblyItems.length + d.noAssemblyItems.length;
            const itemsWord = numWordMasculine(totalItemCount);
            const itemsText = totalItemCount === 1 ? 'um item' : `${itemsWord} itens`;

            let basePart = '';
            if (d.assemblyItems.length > 0) {
              basePart = `uma entrega${citySuffix} de ${itemsText}, sendo ${d.assemblyItems.join(' e ')}${distSuffix}, com montagem no endereço`;
            } else {
              basePart = `uma entrega${citySuffix} de ${itemsText}${distSuffix}`;
            }

            if (d.scheduledTimeStr) {
              basePart += `, ${d.scheduledTimeStr}`;
            }

            if (d.notices && d.notices.length > 0) {
              basePart += `, com atenção para ${d.notices.join(' e ')}`;
            }

            return basePart;
          });

        // Detalhamento da Manhã
        let morningText = '';
        const morningAll = hasAfternoon
          ? morningDeliveries
          : [...morningDeliveries, ...unspecifiedDeliveries];

        if (morningAll.length > 0) {
          const parts = formatDeliveryParts(morningAll);
          morningText = parts.length === 1
            ? `Pela manhã, temos ${parts[0]}.`
            : `Pela manhã, temos ${parts.slice(0, -1).join(', ')} e ainda ${parts[parts.length - 1]}.`;
        } else if (hasAfternoon) {
          morningText = `Pela manhã não temos entregas.`;
        }

        // Detalhamento da Tarde
        let afternoonText = '';
        if (afternoonDeliveries.length > 0) {
          const parts = formatDeliveryParts(afternoonDeliveries);
          afternoonText = parts.length === 1
            ? `À tarde, temos ${parts[0]}.`
            : `À tarde, temos ${parts.slice(0, -1).join(', ')} e ainda ${parts[parts.length - 1]}.`;
        }

        // Entregas sem turno definido quando há tarde mas não manhã
        let unspecText = '';
        if (hasAfternoon && hasUnspec && !hasMorning) {
          const parts = formatDeliveryParts(unspecifiedDeliveries);
          unspecText = parts.length === 1
            ? ` Também temos ${parts[0]}, sem horário definido.`
            : ` Também temos ${parts.slice(0, -1).join(', ')} e ainda ${parts[parts.length - 1]}, sem horário definido.`;
        }

        // Dica de entrega distante com montagem
        const farAssemblyHint = hasFarAssembly
          ? ` Obs: há entrega distante com montagem no endereço, atenção ao horário de saída.`
          : '';

        // Lembrete de desmontagem no mostruário para entregas de amanhã
        const showroomHint = (mode === 'tomorrow' && hasShowroomDisassembly)
          ? ` Lembrem de desmontar hoje o móvel de mostruário para amanhã estar pronto para ser levado, já que é um móvel de mostruário.`
          : '';

        smartText = `${overviewSentence} ${morningText} ${afternoonText}${unspecText}${farAssemblyHint}${showroomHint}`.trim().replace(/\s+/g, ' ');
      }

      try {
        const geminiPrompt = `Você é o supervisor de logística da Móveis Morante conversando por áudio no WhatsApp com a equipe de entregas. Sua única função é transformar o texto base fornecido em um áudio 100% natural, fluido e conversacional, perfeito para sintetizador de voz (Audio TTS). O texto já está estruturado; só refine a fluência sem alterar os dados.

REGRAS ABSOLUTAS E ESSENCIAIS DO RESUMO:
1. OMISSÃO DE NOMES DE PRODUTOS NORMAIS: NUNCA mencione o nome dos produtos das entregas, A NÃO SER QUE SEJA UM PRODUTO QUE POSSUI MONTAGEM NO ENDEREÇO! Se a entrega não tiver montagem no endereço, mencione APENAS a quantidade de itens (exemplo: "uma entrega de três itens", "uma entrega para Curitiba de cinco itens").
2. QUANDO HOUVER MONTAGEM NO ENDEREÇO: Fale a quantidade total de itens E cite especificamente o produto com montagem no endereço (exemplo: "uma entrega de quatro itens, sendo um guarda-roupa sydney, com montagem no endereço").
3. NUNCA DIGA 'SEM MONTAGEM': É ESTRITAMENTE PROIBIDO dizer as palavras "sem montagem", "não precisa de montagem" ou "sem montagem no endereço". Se a entrega não tiver montagem no local, apenas ignore essa informação. SOMENTE mencione a palavra montagem quando REALMENTE HOUVER montagem no endereço.
4. CONCORDÂNCIA MASCULINA PARA ITENS: A contagem de itens DEVE ser sempre no MASCULINO: "um item", "dois itens", "três itens" (NUNCA "duas itens").
5. AVISOS DE CHEGADA NO ENDEREÇO: Se o texto contiver avisos como "ligar quando chegar porque é apartamento", "ligar quando chegar porque é kitnet" ou "ligar quando chegar porque é nos fundos", pronuncie essa instrução exatamente dessa forma natural ao final da respectiva entrega.
6. ARTIGOS GRAMATICAIS CORRETOS POR PALAVRA RAIZ DO PRODUTO:
   - "balcão", "guarda-roupa", "armário", "painel", "rack", "sofá", "buffet", "conjunto" → artigo MASCULINO: "um balcão", "um guarda-roupa".
   - "escrivaninha", "cômoda", "mesa", "cadeira", "pia", "cama", "sapateira", "cristaleira", "bancada", "prateleira", "estante" → artigo FEMININO: "uma escrivaninha", "uma mesa".
5. NÚMEROS E DISTÂNCIAS: Escreva os números cardinais por extenso ("quatro", "três", "uma"). Para distâncias com decimal, USE a vírgula real no formato "5,2 quilômetros", "27,1 quilômetros", NUNCA escreva a palavra "vírgula" por extenso. NUNCA escreva dígitos isolados sem unidade.
6. SEM EXPRESSÕES REPETIDAS: NUNCA comece frases com "E também" ou "Temos uma entrega. Temos uma entrega de...". Funda a informação em uma frase só. JAMAIS escreva nomes em CAIXA ALTA.
7. VISÃO GERAL SEM CIDADE: A primeira frase resume apenas o total e os turnos, SEM mencionar cidades. Exemplo correto: "Para amanhã, temos quatro entregas programadas, com uma pela manhã e três à tarde."
8. REGRA ABSOLUTA DE COLOMBO: JAMAIS mencione a palavra "Colombo". Se a entrega for em Colombo, não fale o nome da cidade. Só mencione a cidade quando for fora de Colombo (ex: Curitiba, Pinhais).
9. HORÁRIOS E AVISOS OPERACIONAIS: 
   - As janelas padrão são 9-12h e 13-18h. Se a entrega for na janela padrão, NUNCA diga o horário específico. SOMENTE se for diferente (ex: 08:00), mencione o horário em específico.
   - Mantenha avisos operacionais (levar máquina de cartão, fazer recorte para cooktop, levar serra copo, ligar antes de ir, levar nota fiscal ou fazer instalação na parede).
10. OMISSÃO DE CORES E ACABAMENTOS: PROIBIDO pronunciar nomes de cores ou combinações ("freijó", "off white", "preto", "branco", "cinamomo", etc.).
11. SEM SÍMBOLOS OU MARCAÇÕES: PROIBIDO usar dois-pontos (:), parênteses (()), barras (/), asteriscos (*) ou hashtags (#).
12. RETORNE APENAS O TEXTO A SER PRONUNCIADO.

Exemplo do estilo esperado: "Para amanhã, temos quatro entregas programadas, com uma pela manhã e três à tarde. Pela manhã, temos uma entrega de dois itens, agendada para um horário em específico às 08:00. À tarde, temos uma entrega de três itens, não tão perto, a 5,2 quilômetros, com atenção para levar máquina de cartão, e ainda uma entrega para Curitiba de quatro itens, sendo um guarda-roupa sonata, bem longe, a 26,8 quilômetros, com montagem no endereço, com atenção para fazer instalação na parede."

Texto base para refinamento: "${smartText}"`;

        if (geminiKey) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: geminiPrompt }] }] })
          });
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
      } catch (err) {
        console.warn('Fallback local ativado para o resumo da IA:', err);
      }

      try {
        if (mode === 'today' && setAiSummaryToday) {
          setAiSummaryToday(smartText);
          await AsyncStorage.setItem('@morante_ai_summary_today', smartText).catch(() => {});
          await AsyncStorage.setItem('@morante_ai_summary_fingerprint_today', currentFingerprint).catch(() => {});
        } else if (mode === 'tomorrow' && setAiSummaryTomorrow) {
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
      if (mode === 'today' && setAiSummaryToday) setAiSummaryToday(fallbackText);
      else if (mode === 'tomorrow' && setAiSummaryTomorrow) setAiSummaryTomorrow(fallbackText);
    } finally {
      if (setIsGeneratingAISummary) setIsGeneratingAISummary(false);
    }
    };
