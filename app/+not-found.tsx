import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BigButton } from '@/components/BigButton';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { fontSize, spacing } from '@/utils/theme';
import { useTheme } from '@/hooks/useTheme';

export default function NotFoundScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.wrapper}>
        <EmptyState
          icon="compass-outline"
          title="Nothing here"
          message="This page does not exist."
        />
      </View>

      <Text style={[styles.helper, { color: theme.textMuted }]}>
        Use the tabs below to go back to translating.
      </Text>

      <View style={styles.button}>
        <BigButton label="Go to Type" icon="arrow-back" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'center' },
  helper: {
    fontSize: fontSize.helper,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  button: { marginTop: spacing.xl },
});