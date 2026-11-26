export const CHARACTERISTIC_TEXT_MIN_LENGTH = 3;
export const CHARACTERISTIC_TEXT_SHORT_MAX_LENGTH = 30;
export const CHARACTERISTIC_TEXT_LONG_MAX_LENGTH = 255;

export const getCharacteristicTextLimits = (dataType?: string | null) => {
  if (dataType === 'text_long') {
    return {
      minLength: CHARACTERISTIC_TEXT_MIN_LENGTH,
      maxLength: CHARACTERISTIC_TEXT_LONG_MAX_LENGTH,
    };
  }
  if (dataType === 'text_short' || dataType === 'text') {
    return {
      minLength: CHARACTERISTIC_TEXT_MIN_LENGTH,
      maxLength: CHARACTERISTIC_TEXT_SHORT_MAX_LENGTH,
    };
  }
  return undefined;
};
