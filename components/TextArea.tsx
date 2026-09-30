/**
 * A labelled text area. Used on the Type screen and for fixing OCR mistakes
 * on the Scan screen.
 */

import { StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/utils/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  minHeight?: number;
  autoFocus?: boolean;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function TextArea({
  value,
  onChangeText,
  placeholder = 'Type or paste text here',
  minHeight = 150,
  autoFocus = false,
  editable = true,
  style,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          minHeight,
        },
        style,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        editable={editable}
        autoFocus={autoFocus}
        multiline
        textAlignVertical="top"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={[styles.input, { color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
  },
  input: {
    flex: 1,
    fontSize: fontSize.input,
    lineHeight: 28,
  },
});