import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

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
import { spacing } from '@/utils/theme';

/**
 * Screen 1 — Type.
 * One box, one language tag, one big button, one result.
 */
export default function TypeScreen() {
  const [text, setText] = useState('');
  const backend = useBackendInfo();
  const language = useLanguageTag(text);
  const { status, result, error, isLoading, translate } = useTranslation('typed');

  const onTranslate = () => {
    Keyboard.dismiss();
    void translate(text);
  };

  return (
    <Screen>
      <ScreenTitle title="Type" helper="Type or paste text in any language" />

      {!backend.ok ? (
        <View style={styles.gap}>
          <NoticeBanner
            tone="error"
            message="Cannot reach the translator. Check your internet and try again."
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
          <LoadingBlock label="Translating..." />
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
});