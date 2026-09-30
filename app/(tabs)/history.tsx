import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { SmallButton } from '@/components/SmallButton';
import { SwipeToDeleteRow } from '@/components/SwipeToDeleteRow';
import { useHistory } from '@/hooks/useHistory';
import { useTheme } from '@/hooks/useTheme';
import { devanagariRegular } from '@/utils/fonts';
import { fontSize, spacing } from '@/utils/theme';
import { formatWhen } from '@/utils/formatDate';

/**
 * Screen 3 — History.
 * Tap a row to open it, swipe a row to delete it.
 */
export default function HistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { items, ready, remove, clear } = useHistory();

  const confirmClearAll = () => {
    Alert.alert(
      'Clear all history?',
      'This removes every saved translation. This cannot be undone.',
      [
        { text: 'Keep them', style: 'cancel' },
        { text: 'Clear all', style: 'destructive', onPress: () => void clear() },
      ],
    );
  };

  return (
    <Screen>
      <ScreenTitle title="History" helper="Your translations, newest first" />

      {!ready ? <LoadingBlock label="Loading history..." /> : null}

      {ready && items.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="Nothing here yet"
          message="Every translation you make is saved here, so you can use it again."
        />
      ) : null}

      <View style={styles.list}>
        {items.map((item) => (
          <SwipeToDeleteRow key={item.id} onDelete={() => void remove(item.id)}>
            <Pressable
              onPress={() => router.push(`/item/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open translation from ${formatWhen(item.createdAt)}`}
            >
              <Text style={[styles.original, { color: theme.text }]} numberOfLines={2}>
                {item.originalText}
              </Text>

              <Text
                style={[styles.sanskrit, { color: theme.text, fontFamily: devanagariRegular }]}
                numberOfLines={2}
              >
                {item.sanskrit}
              </Text>

              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {formatWhen(item.createdAt)}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>{item.detectedLanguage}</Text>
              </View>
            </Pressable>
          </SwipeToDeleteRow>
        ))}
      </View>

      {items.length > 0 ? (
        <View style={styles.clearAll}>
          <SmallButton
            label="Clear all"
            icon="trash-outline"
            tone="danger"
            onPress={confirmClearAll}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  original: {
    fontSize: fontSize.body,
    lineHeight: 25,
    fontWeight: '600',
  },
  sanskrit: {
    fontSize: 20,
    lineHeight: 33,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  meta: {
    fontSize: fontSize.meta,
    fontWeight: '600',
  },
  clearAll: {
    marginTop: spacing.xl,
    alignSelf: 'center',
  },
});