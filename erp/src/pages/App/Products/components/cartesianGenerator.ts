export interface AttributeOption {
    name: string;
    values: string[];
    showName: boolean;
}

export interface GeneratedCombination {
    attributes: { name: string; value: string; showName: boolean }[];
}

export function generateCartesianCombinations(options: AttributeOption[]): GeneratedCombination[] {
    const validOptions = options.filter(o => o.name && o.values.length > 0);
    if (validOptions.length === 0) return [];

    function cartesian(arr: AttributeOption[]): { name: string; value: string; showName: boolean }[][] {
        if (arr.length === 0) return [[]];
        const [first, ...rest] = arr;
        const restCartesian = cartesian(rest);
        const result: { name: string; value: string; showName: boolean }[][] = [];

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
