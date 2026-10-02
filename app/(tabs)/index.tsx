import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { LoadingBlock } from '@/components/LoadingBlock';
import { NoticeBanner } from '@/components/NoticeBanner';
import { ResultCard } from '@/components/ResultCard';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TagChip } from '@/components/TagChip';
import { TextArea } from '@/components/TextArea';
import { useBackendInfo } from '@/hooks/useBackendInfo';
import { useLanguageTag } from '@/hooks/useLanguageTag';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing, fontSize } from '@/utils/theme';

/**
 * Screen 1 — Type.
 * One box, one language tag, one big button, one result.
 */
export default function TypeScreen() {
  const [text, setText] = useState('');
  const backend = useBackendInfo();
  const language = useLanguageTag(text);
  const { status, result, error, isLoading, slow, translate } = useTranslation('typed');
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTranslate = () => {
    Keyboard.dismiss();
    void translate(text);
  };

  // Translate by itself a moment after the user stops typing, so nothing has
  // to be pressed.
  useEffect(() => {
    if (!text.trim()) return undefined;

    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => {
      void translate(text);
    }, 900);

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [text, translate]);

  return (
    <Screen>
      <ScreenTitle title="Type" helper="Type or paste text in any language" />

      {backend.ocrAvailable === false && !backend.ok ? (
        <View style={styles.gap}>
          <NoticeBanner
            tone="error"
            message={`Cannot reach the translator at ${backend.host}. Check your internet.`}
            onRetry={backend.refresh}
            retryLabel="Try again"
          />
        </View>
      ) : null}

      <TextArea
        value={text}
        onChangeText={setText}
        placeholder="Type or paste text here"
        accessibilityLabel="Text to translate"
      />

      {language ? (
        <View style={styles.tagRow}>
          <TagChip label={`${language.name} detected`} icon="language-outline" />
        </View>
      ) : null}

      {text.trim().length > 0 && status === 'idle' ? (
        <Text style={styles.hint}>The Sanskrit appears on its own — or tap Translate.</Text>
      ) : null}

      <BigButton
        label="Translate"
        icon="language"
        onPress={onTranslate}
        loading={isLoading}
        disabled={!text.trim()}
        accessibilityHint="Translates your text into Sanskrit"
      />

      {status === 'error' && error ? (
        <View style={styles.gap}>
          <NoticeBanner tone="error" message={error} onRetry={text.trim() ? onTranslate : undefined} />
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.gap}>
          <LoadingBlock label={slow ? 'Waking up the translator…' : 'Translating…'} />
        </View>
      ) : null}

      {status === 'done' && result ? (
        <View style={styles.gap}>
          <ResultCard result={result} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tagRow: { marginTop: spacing.md, marginBottom: spacing.lg },
  gap: { marginTop: spacing.lg },
  hint: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    fontSize: fontSize.meta,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.7,
  },
});