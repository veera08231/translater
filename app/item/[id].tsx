import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { ResultCard } from '@/components/ResultCard';
import { Screen } from '@/components/Screen';
import { SmallButton } from '@/components/SmallButton';
import { useHistory } from '@/hooks/useHistory';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, spacing } from '@/utils/theme';
import { formatWhen } from '@/utils/formatDate';

/**
 * A saved translation, opened from the History tab.
 */
export default function TranslationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { items, ready, remove } = useHistory();

  const item = items.find((entry) => entry.id === id);

  const confirmDelete = () => {
    Alert.alert('Delete this translation?', 'This cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void remove(item?.id ?? id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Translation</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={({ pressed }) => [
            styles.close,
            { backgroundColor: theme.surface, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
      </View>

      {!ready ? <LoadingBlock label="Loading..." /> : null}

      {ready && !item ? (
        <EmptyState
          icon="help-circle-outline"
          title="Not found"
          message="This translation is not in your history any more."
        />
      ) : null}

      {item ? (
        <>
          <Text style={[styles.date, { color: theme.textMuted }]}>
            {formatWhen(item.createdAt)} · {item.detectedLanguage}
          </Text>

          <ResultCard result={item} />

          <View style={styles.footer}>
            <SmallButton
              label="Delete"
              icon="trash-outline"
              tone="danger"
              onPress={confirmDelete}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  close: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    fontSize: fontSize.helper,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  footer: {
    marginTop: spacing.xl,
    alignSelf: 'center',
  },
});