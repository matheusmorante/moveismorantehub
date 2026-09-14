export interface AttributeOption {
    readonly name: string;
    readonly values: readonly string[];
    readonly showName: boolean;
}

export interface GeneratedCombinationItem {
    readonly name: string;
    readonly value: string;
    readonly showName: boolean;
}

export interface GeneratedCombination {
    readonly attributes: readonly GeneratedCombinationItem[];
}

/**
 * Gera combinações cartesianas para variações de produto a partir de atributos.
 * Sanitiza entradas (remove espaços em branco e duplicidades) e garante idempotência.
 *
 * @param options Lista de opções de atributos e seus valores
 * @returns Lista de combinações geradas
 */
export function generateCartesianCombinations(options: readonly AttributeOption[]): GeneratedCombination[] {
    const validOptions = (options || [])
        .map(opt => ({
            name: (opt.name || '').trim(),
            values: Array.from(new Set((opt.values || []).map(v => (v || '').trim()).filter(Boolean))),
            showName: Boolean(opt.showName)
        }))
        .filter(opt => opt.name.length > 0 && opt.values.length > 0);

    if (validOptions.length === 0) return [];

    function cartesian(arr: typeof validOptions): GeneratedCombinationItem[][] {
        if (arr.length === 0) return [[]];
        const [first, ...rest] = arr;
        const restCartesian = cartesian(rest);
        const result: GeneratedCombinationItem[][] = [];

        first.values.forEach(val => {
            restCartesian.forEach(combination => {
                result.push([{ name: first.name, value: val, showName: first.showName }, ...combination]);
            });
        });

        return result;
    }

    const rawCombinations = cartesian(validOptions);
    return rawCombinations.map(combo => ({ attributes: combo }));
}

