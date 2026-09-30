/**
 * Sanskrit text, always in Noto Sans Devanagari so every letter (ा, ि, ्, ः)
 * is rendered correctly on every phone.
 */

import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import type { ReactNode } from 'react';

import { devanagariMedium, devanagariRegular, devanagariSemiBold } from '@/utils/fonts';

type Props = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  weight?: 'regular' | 'medium' | 'semibold';
  selectable?: boolean;
};

export function DevanagariText({ children, style, weight = 'regular', selectable }: Props) {
  return (
    <Text
      selectable={selectable}
      style={[
        styles.base,
        {
          fontFamily:
            weight === 'semibold'
              ? devanagariSemiBold
              : weight === 'medium'
                ? devanagariMedium
                : devanagariRegular,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    // A slightly taller line so matras never get clipped.
    lineHeight: 46,
  },
});