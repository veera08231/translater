/**
 * Friendly messages: errors, tips and warnings. Plain words, never codes.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/utils/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  message: string;
  tone?: 'error' | 'info' | 'warning';
  icon?: IconName;
  onRetry?: () => void;
  retryLabel?: string;
};

export function NoticeBanner({
  message,
  tone = 'info',
  icon,
  onRetry,
  retryLabel = 'Try again',
}: Props) {
  const theme = useTheme();

  const background =
    tone === 'error' ? theme.dangerSoft : tone === 'warning' ? theme.accentSoft : theme.primarySoft;
  const color = tone === 'error' ? theme.danger : tone === 'warning' ? theme.accent : theme.primary;
  const defaultIcon: IconName =
    tone === 'error' ? 'alert-circle-outline' : tone === 'warning' ? 'help-circle-outline' : 'information-circle-outline';

  return (
    <View style={[styles.box, { backgroundColor: background }]}>
      <View style={styles.row}>
        <Ionicons name={icon ?? defaultIcon} size={22} color={color} style={styles.icon} />
        <Text style={[styles.message, { color }]}>{message}</Text>
      </View>

      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="refresh-outline" size={18} color={color} />
          <Text style={[styles.retryLabel, { color }]}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2 },
  icon: { marginTop: 1 },
  message: {
    flex: 1,
    fontSize: fontSize.body,
    lineHeight: 25,
    fontWeight: '500',
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  retryLabel: { fontSize: fontSize.helper, fontWeight: '700' },
});