/**
 * The three small actions under a translation: Copy, Share, Listen.
 * Nothing else — no technical names, no menus.
 */

import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import type { TranslationResult } from '@/types';
import { fontSize, radius, spacing } from '@/utils/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Action = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  active?: boolean;
};

type Props = {
  result: TranslationResult;
};

export function ResultActions({ result }: Props) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runId = useRef(0);

  useEffect(
    () => () => {
      runId.current += 1;
      if (timer.current) clearTimeout(timer.current);
      void Speech.stop();
    },
    [],
  );

  const copy = async () => {
    await Clipboard.setStringAsync(result.sanskrit);
    setCopied(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    try {
      await Share.share({ message: result.sanskrit });
    } catch {
      // The user closed the share sheet — nothing to say.
    }
  };

  const listen = async () => {
    const id = runId.current + 1;
    runId.current = id;

    try {
      await Speech.stop();

      if (speaking) {
        setSpeaking(false);
        return;
      }

      setSpeaking(true);
      // Sanskrit has no dedicated voice on most phones; a Hindi (Devanagari)
      // voice reads it correctly.
      Speech.speak(result.sanskrit, { language: 'hi-IN', rate: 0.85 });

      // expo-speech has no "finished" callback, so we watch the phone instead.
      for (let tick = 0; tick < 120; tick += 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (runId.current !== id) return;
        const stillTalking = await Speech.isSpeakingAsync().catch(() => false);
        if (!stillTalking) break;
      }

      if (runId.current === id) setSpeaking(false);
    } catch {
      if (runId.current === id) setSpeaking(false);
    }
  };

  const actions: Action[] = [
    {
      key: 'copy',
      label: copied ? 'Copied' : 'Copy',
      icon: copied ? 'checkmark-circle' : 'copy-outline',
      onPress: copy,
    },
    { key: 'share', label: 'Share', icon: 'share-outline', onPress: share },
    {
      key: 'listen',
      label: speaking ? 'Stop' : 'Listen',
      icon: speaking ? 'stop-circle' : 'volume-high-outline',
      onPress: listen,
      active: speaking,
    },
  ];

  return (
    <View style={[styles.row, { borderTopColor: theme.border }]}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ selected: action.active }}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: action.active ? theme.primarySoft : 'transparent',
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons name={action.icon} size={22} color={theme.primary} />
          <Text style={[styles.label, { color: theme.primary }]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.meta + 1,
    fontWeight: '700',
  },
});