import React from 'react';
import {
  StyleSheet,
  TextInput as NativeTextInput,
  type TextInputProps,
} from 'react-native';

const colorBrightness = (value?: unknown) => {
  if (typeof value !== 'string' || value === 'transparent') return null;
  const match = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split('').map((part) => part + part).join('')
    : match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114;
};

type FormTextInputProps = TextInputProps & {
  focusedBorderBottomColor?: string;
};

export const FormTextInput = React.forwardRef<NativeTextInput, FormTextInputProps>(
  ({ style, onFocus, onBlur, focusedBorderBottomColor, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const inputStyle = StyleSheet.flatten(style) ?? {};
    const backgroundBrightness = colorBrightness(inputStyle.backgroundColor);
    const textBrightness = colorBrightness(inputStyle.color);
    const dark =
      (backgroundBrightness !== null && backgroundBrightness < 110) ||
      (textBrightness !== null && textBrightness > 190);

    return (
      <NativeTextInput
        {...props}
        ref={ref}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          style,
          {
            borderWidth: 0,
            borderTopWidth: 0,
            borderLeftWidth: 0,
            borderRightWidth: 0,
            borderBottomWidth:
              typeof inputStyle.borderBottomWidth === 'number'
                ? inputStyle.borderBottomWidth
                : 1,
            borderBottomColor:
              inputStyle.borderBottomColor ??
              inputStyle.borderColor ??
              (dark ? '#475569' : '#cbd5e1'),
            borderRadius: 0,
          },
          { outlineStyle: 'none', outlineWidth: 0 } as any,
          focused ? { borderBottomColor: focusedBorderBottomColor ?? '#2563eb' } : null,
        ]}
      />
    );
  },
);

FormTextInput.displayName = 'FormTextInput';
