export interface ItemServiceHandlingSummary {
  hasOutsideAssembly: boolean;
  hasDepotAssembly: boolean;
  hasWallInstallation: boolean;
  estimatedMinutes: number;
  badges: string[];
}

/**
 * Analisa os itens de um pedido e identifica os tipos de manuseio:
 * - Montagem no Local / Fora (🔧)
 * - Montagem no Depósito (✓)
 * - Instalação de Aéreo / Fixação em Parede (🧱)
 * - Estima o tempo de serviço médio previsto
 */
export function analyzeOrderServiceHandlings(items: any[] = []): ItemServiceHandlingSummary {
  let hasOutsideAssembly = false;
  let hasDepotAssembly = false;
  let hasWallInstallation = false;
  let estimatedMinutes = 20; // 20 min base de descarga e conferência

  for (const item of items) {
    const qty = Number(item.quantity || item.qty || 1);
    const handling = String(item.handlingType || item.handling || item.serviceType || '').toLowerCase();
    const name = String(item.name || item.productName || item.description || '').toLowerCase();

    // Montagem Fora (na casa do cliente)
    if (
      handling.includes('fora') ||
      handling.includes('cliente') ||
      handling.includes('extern') ||
      handling.includes('montador') ||
      handling.includes('local') ||
      Boolean(item.requiresAssembly) ||
      Boolean(item.assemblyOutside)
    ) {
      hasOutsideAssembly = true;
      // Estimação por tipo de móvel
      if (name.includes('guarda-roupa') || name.includes('roupeiro')) {
        estimatedMinutes += 90 * qty;
      } else if (name.includes('cômoda') || name.includes('comoda') || name.includes('armário') || name.includes('armario')) {
        estimatedMinutes += 40 * qty;
      } else if (name.includes('painel') || name.includes('rack') || name.includes('mesa')) {
        estimatedMinutes += 35 * qty;
      } else {
        estimatedMinutes += 30 * qty;
      }
    } else if (
      handling.includes('deposito') ||
      handling.includes('depósito') ||
      handling.includes('loja') ||
      handling.includes('interno') ||
      handling.includes('interna') ||
      handling.includes('montado') ||
      Boolean(item.assemblyDepot)
    ) {
      hasDepotAssembly = true;
    }

    // Instalação de aéreo / fixação na parede
    if (
      handling.includes('parede') ||
      handling.includes('aéreo') ||
      handling.includes('aereo') ||
      handling.includes('instala') ||
      name.includes('aéreo') ||
      name.includes('aereo') ||
      name.includes('painel')
    ) {
      hasWallInstallation = true;
      estimatedMinutes += 20 * qty;
    }
  }

  // Sem rótulos textuais de 'somente entrega', 'montado no depósito' ou 'montagem no local'
  // A representação de montagem é exclusivamente pelos selos oficiais da Parafusadeira (MobileDrill)
  const badges: string[] = [];
  if (hasWallInstallation) {
    badges.push('🧱 Instalação de aéreo');
  }

  return {
    hasOutsideAssembly,
    hasDepotAssembly,
    hasWallInstallation,
    estimatedMinutes,
    badges,
  };
}

export function formatEstimatedServiceDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h${m.toString().padStart(2, '0')}` : `~${h}h`;
}
