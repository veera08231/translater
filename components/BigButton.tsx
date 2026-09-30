/**
 * The one big button on a screen. Large, obvious, impossible to miss.
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/utils/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
};

export function BigButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'primary',
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const inactive = disabled || loading;

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
          backgroundColor: isPrimary ? theme.primary : theme.surface,
          borderColor: isPrimary ? theme.primary : theme.border,
          borderWidth: isPrimary ? 0 : 2,
          opacity: inactive ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? theme.onPrimary : theme.primary} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={24}
          color={isPrimary ? theme.onPrimary : theme.primary}
        />
      ) : null}

      <Text
        style={[
          styles.label,
          { color: isPrimary ? theme.onPrimary : theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 62,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.button,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});