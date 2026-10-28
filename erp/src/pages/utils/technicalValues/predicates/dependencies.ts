/** Characteristics are independent; category applications control availability. */
export interface CharacteristicDependencyState {
  isDependent: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  masterFieldLabel?: string;
  masterQuantity?: number | null;
}

export interface DependentCharacteristicVisibilityContext {
  masterFieldExists: boolean;
  masterIsVariable: boolean;
  masterIsSelected: boolean;
}

export const isDependentCharacteristicVisible = (
  _dependency: CharacteristicDependencyState,
  _context: DependentCharacteristicVisibilityContext
): boolean => false;

export const getCharacteristicDependencyState = (
  _fieldName: string,
  _technicalValues: Record<string, any> = {}
): CharacteristicDependencyState => ({
  isDependent: false,
  isDisabled: false,
});

export const isDoorDrawerDependentCharacteristic = (_fieldName: string): boolean => false;
export const isCharacteristicDependent = (_fieldName: string): boolean => false;
export const isCharacteristicDependentOnVariableField = (
  _fieldName: string,
  _variableFieldNames: readonly string[] = []
): boolean => false;
export const isDoorDrawerDependentCharacteristicActive = (
  _fieldName: string,
  _technicalValues: Record<string, any> = {}
): boolean => false;
