/**
 * Friendly empty state: never show a blank screen.
 */

import { StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/utils/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon: IconName;
  title: string;
  message: string;
};

export function EmptyState({ icon, title, message }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.circle, { backgroundColor: theme.surface }]}>
        <Ionicons name={icon} size={40} color={theme.primary} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  circle: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.helper,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 300,
  },
});