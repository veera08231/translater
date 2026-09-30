/**
 * The result card.
 *
 * Always in the same order, so the eye learns it once:
 *   1. YOUR TEXT          (what you gave us)
 *   2. Detected language  (a small tag)
 *   3. SANSKRIT           (the answer, big and clear)
 *   4. Copy / Share / Listen
 */

import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { TranslationResult } from '@/types';
import { fontSize, radius, spacing } from '@/utils/theme';
import { DevanagariText } from './DevanagariText';
import { NoticeBanner } from './NoticeBanner';
import { ResultActions } from './ResultActions';
import { TagChip } from './TagChip';

type Props = {
  result: TranslationResult;
};

export function ResultCard({ result }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      accessibilityLabel="Translation result"
    >
      <Text style={[styles.label, { color: theme.textMuted }]}>YOUR TEXT</Text>
      <Text style={[styles.original, { color: theme.text }]} selectable>
        {result.originalText}
      </Text>

      <View style={styles.tagRow}>
        <TagChip label={`${result.detectedLanguage} detected`} icon="language-outline" />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <Text style={[styles.label, { color: theme.accent }]}>SANSKRIT</Text>
      <DevanagariText style={[styles.sanskrit, { color: theme.text }]} selectable>
        {result.sanskrit}
      </DevanagariText>

      {!result.verified ? (
        <View style={styles.note}>
          <NoticeBanner
            tone="warning"
            message="Please double-check this translation"
            icon="alert-circle-outline"
          />
        </View>
      ) : null}

      <ResultActions result={result} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.meta,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  original: {
    fontSize: fontSize.body,
    lineHeight: 27,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  sanskrit: {
    fontSize: fontSize.sanskrit,
    marginTop: spacing.xs,
  },
  note: {
    marginTop: spacing.md,
  },
});