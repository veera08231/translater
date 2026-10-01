/**
 * Full-screen camera.
 *
 * Tap the small preview on the Scan screen to open this: the whole screen
 * becomes the camera, so far-off text can actually be read. Zoom in and out
 * with the buttons, turn on the torch in the dark, then tap Done.
 */

import { useEffect, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/utils/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Shared with the small preview so photos can still be taken from here. */
  cameraRef: RefObject<CameraView | null>;
  /** When given, the big button reads the photo instead of just closing. */
  onCapture?: () => void | Promise<void>;
  captureLabel?: string;
  closeLabel?: string;
  hint?: string;
};

const STEP = 0.1;

export function CameraViewer({
  visible,
  onClose,
  cameraRef,
  onCapture,
  captureLabel,
  closeLabel = 'Done',
  hint,
}: Props) {
  const theme = useTheme();
  const [zoom, setZoom] = useState(0);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);

  // Start fresh every time it opens.
  useEffect(() => {
    if (visible) {
      setZoom(0);
      setTorch(false);
    }
  }, [visible]);

  const light: TextStyle = { color: '#FFFFFF' };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.root}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
          pictureSize="hd"
          zoom={zoom}
          enableTorch={torch}
        />

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close the camera"
            hitSlop={12}
            style={({ pressed }) => [styles.circle, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={() => setTorch((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Turn the light off' : 'Turn the light on'}
            hitSlop={12}
            style={({ pressed }) => [styles.circle, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color={torch ? '#FCD34D' : '#FFFFFF'} />
          </Pressable>
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          {hint ? <Text style={[styles.hint, light]}>{hint}</Text> : null}

          <View style={[styles.zoomBar, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Pressable
              onPress={() => setZoom((value) => Math.max(0, Number((value - STEP).toFixed(2))))}
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              disabled={zoom <= 0}
              style={({ pressed }) => [styles.zoomButton, { opacity: zoom <= 0 ? 0.35 : pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="remove" size={26} color="#FFFFFF" />
            </Pressable>

            <Text style={[styles.zoomText, light]}>
              {Math.round(zoom * 100)}%
            </Text>

            <Pressable
              onPress={() => setZoom((value) => Math.min(1, Number((value + STEP).toFixed(2))))}
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              disabled={zoom >= 1}
              style={({ pressed }) => [styles.zoomButton, { opacity: zoom >= 1 ? 0.35 : pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </Pressable>
          </View>

          <Pressable
            onPress={async () => {
              if (!onCapture) {
                onClose();
                return;
              }
              // Take the photo while this camera is still on screen.
              setBusy(true);
              try {
                await onCapture();
              } finally {
                setBusy(false);
                onClose();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={onCapture ? captureLabel || 'Read the Text' : closeLabel}
            disabled={busy}
            style={({ pressed }) => [
              styles.done,
              { backgroundColor: theme.primary, opacity: pressed || busy ? 0.8 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={[styles.doneText, { color: theme.onPrimary }]}>
                {onCapture ? captureLabel || 'Read the Text' : closeLabel}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  topBar: {
    position: 'absolute',
    top: 48,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: 'center',
    gap: spacing.md,
  },
  hint: {
    fontSize: fontSize.helper,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  zoomButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    minWidth: 56,
    textAlign: 'center',
  },
  done: {
    minWidth: 160,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: fontSize.button,
    fontWeight: '700',
  },
});