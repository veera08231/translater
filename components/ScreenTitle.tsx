/**
 * Every screen has a big title and one short helper line, so a first-time user
 * always knows what to do next.
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, spacing } from '@/utils/theme';

type Props = {
  title: string;
  helper: string;
  right?: ReactNode;
};

export function ScreenTitle({ title, helper, right }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[styles.helper, { color: theme.textMuted }]}>{helper}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  text: { flex: 1 },
  title: {
    fontSize: fontSize.title,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  helper: {
    fontSize: fontSize.helper,
    lineHeight: 23,
    marginTop: spacing.xs,
  },
});