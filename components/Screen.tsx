/**
 * Screen shell: safe areas, keyboard handling and a calm, roomy layout.
 */

import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/utils/theme';

type Props = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Set to false for screens that manage their own scrolling. */
  scroll?: boolean;
};

export function Screen({ children, contentStyle, scroll = true }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const body = (
    <View
      style={[
        styles.inner,
        {
          paddingTop: insets.top + spacing.md,
          // Extra room so the last card is never hidden behind the tab bar.
          paddingBottom: insets.bottom + 96,
          paddingHorizontal: spacing.lg,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.root}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: { flexGrow: 1, gap: 0 },
});