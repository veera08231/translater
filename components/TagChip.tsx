/**
 * Small pill used for "Tamil detected" and other one-line facts.
 */

import { StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/utils/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  icon?: IconName;
  tone?: 'primary' | 'accent' | 'neutral';
};

export function TagChip({ label, icon = 'language-outline', tone = 'primary' }: Props) {
  const theme = useTheme();

  const background =
    tone === 'accent' ? theme.accentSoft : tone === 'neutral' ? theme.surface : theme.primarySoft;
  const color = tone === 'accent' ? theme.accent : tone === 'neutral' ? theme.textMuted : theme.primary;

  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: fontSize.meta,
    fontWeight: '700',
  },
});