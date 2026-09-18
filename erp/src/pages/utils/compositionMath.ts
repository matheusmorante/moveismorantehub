/**
 * Função pura para calcular matematicamente o saldo disponível de uma composição (kit),
 * baseado na fórmula de limitador de estoque: MIN(FLOOR(stock / quantityNeeded)).
 * 
 * Esta mesma lógica está implementada via RPC no banco (get_composition_availability),
 * mas esta função serve para fallbacks no frontend, validações em tempo real de UI
 * (ex: enquanto o usuário monta a composição na tela), e testes unitários da regra de negócio.
 */
export const calculateCompositionAvailability = (
    components: { currentStock: number; quantityNeeded: number }[]
): number => {
    if (!components || components.length === 0) return 0;
    
    let minAvailability = Infinity;
    
    for (const item of components) {
        if (item.quantityNeeded <= 0) continue; // Evita divisão por zero ou negativa
        
        // Pega apenas a parte inteira (ex: 5 produtos / 2 necessários = 2 kits inteiros)
        const itemAvailability = Math.floor(Math.max(0, item.currentStock) / item.quantityNeeded);
        
        if (itemAvailability < minAvailability) {
            minAvailability = itemAvailability;
        }
    }
    
    return minAvailability === Infinity ? 0 : Math.max(0, minAvailability);
};
