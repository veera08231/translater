/**
 * "Translating..." / "Reading text..." — clear feedback while we wait.
 */

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/utils/theme';

type Props = {
  label: string;
};

export function LoadingBlock({ label }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});