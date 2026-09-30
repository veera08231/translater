/**
 * Small secondary buttons (Take Photo, Choose from Gallery, Clear all...).
 */

import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/utils/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: 'neutral' | 'primary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  flex?: boolean;
  accessibilityHint?: string;
};

export function SmallButton({
  label,
  onPress,
  icon,
  tone = 'neutral',
  disabled = false,
  loading = false,
  flex = false,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const color =
    tone === 'danger' ? theme.danger : tone === 'primary' ? theme.primary : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.surface,
          borderColor: tone === 'danger' ? theme.dangerSoft : theme.border,
          opacity: inactive ? 0.45 : pressed ? 0.8 : 1,
          flex: flex ? 1 : undefined,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={color} />
      ) : null}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.helper,
    fontWeight: '600',
  },
});