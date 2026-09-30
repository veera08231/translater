import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BigButton } from '@/components/BigButton';
import { LoadingBlock } from '@/components/LoadingBlock';
import { NoticeBanner } from '@/components/NoticeBanner';
import { ResultCard } from '@/components/ResultCard';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { SmallButton } from '@/components/SmallButton';
import { TagChip } from '@/components/TagChip';
import { TextArea } from '@/components/TextArea';
import { useTheme } from '@/hooks/useTheme';
import { useLanguageTag } from '@/hooks/useLanguageTag';
import { useTranslation } from '@/hooks/useTranslation';
import { readTextFromPhoto } from '@/services/ocr';
import { AUTO_SCAN_INTERVAL_MS } from '@/constants/config';
import { isSameOcrText } from '@/utils/cleanOcr';
import { friendlyErrorMessage } from '@/utils/errors';
import { fontSize, radius, spacing } from '@/utils/theme';

/**
 * Screen 2 — Scan.
 *
 * The camera opens straight away (after a friendly permission request).
 * While it is open we quietly read a photo every few seconds, so the Sanskrit
 * appears on screen without an extra tap.
 */
export default function ScanScreen() {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const lastRead = useRef('');
  const autoScan = useRef(true);
  const isActive = useRef(AppState.currentState === 'active');

  const language = useLanguageTag(text);
  const { status, result, error, isLoading, translate } = useTranslation('scanned');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      isActive.current = next === 'active';
    });
    return () => subscription.remove();
  }, []);

  /** New text from the camera: show it and translate it straight away. */
  const applyScannedText = useCallback(
    (value: string) => {
      const cleaned = value.trim();
      if (!cleaned || isSameOcrText(cleaned, lastRead.current)) return;
      lastRead.current = cleaned;
      setScanError(null);
      setText(cleaned);
      void translate(cleaned);
    },
    [translate],
  );

  /** One photo -> OCR -> cleaned text. */
  const readPhoto = useCallback(
    async (base64: string | undefined) => {
      if (!base64) throw new Error('no image');
      const ocr = await readTextFromPhoto(base64);
      if (!ocr.text.trim()) throw new Error('no text');
      applyScannedText(ocr.text);
    },
    [applyScannedText],
  );

  const takePhoto = useCallback(async () => {
    setReading(true);
    setScanError(null);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.4,
        base64: true,
      });
      await readPhoto(photo?.base64);
    } catch (thrown) {
      setScanError(friendlyErrorMessage(thrown));
    } finally {
      setReading(false);
    }
  }, [readPhoto]);

  const chooseFromGallery = useCallback(async () => {
    setReading(true);
    setScanError(null);
    try {
      let media = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!media.granted && media.canAskAgain) {
        media = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!media.granted) {
        setScanError('We need your photos to read text from them.');
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
        allowsEditing: false,
        selectionLimit: 1,
      });
      if (picked.canceled || !picked.assets?.length) return;

      await readPhoto(picked.assets[0].base64 ?? undefined);
    } catch (thrown) {
      setScanError(friendlyErrorMessage(thrown));
    } finally {
      setReading(false);
    }
  }, [readPhoto]);

  // Live scanning: one photo every few seconds while this screen is in front.
  useEffect(() => {
    if (!permission?.granted || !isFocused) return;

    let cancelled = false;
    let busy = false;

    const tick = async () => {
      if (cancelled || busy || !autoScan.current || !isActive.current) return;
      busy = true;
      try {
        const photo = await cameraRef.current?.takePictureAsync({
          quality: 0.35,
          base64: true,
        });
        if (cancelled || !photo?.base64) return;
        const ocr = await readTextFromPhoto(photo.base64);
        if (!cancelled) applyScannedText(ocr.text);
      } catch {
        // Keep scanning quietly. "Take Photo" is always there as a backup.
      } finally {
        busy = false;
      }
    };

    const timer = setInterval(tick, AUTO_SCAN_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [permission?.granted, isFocused, applyScannedText]);

  const onManualEdit = (value: string) => {
    setText(value);
    lastRead.current = value;
    // The user is fixing the text: stop the camera from overwriting it.
    autoScan.current = false;
  };

  // ---------------------------------------------------------------- gate
  if (!permission) {
    return (
      <Screen>
        <ScreenTitle title="Scan" helper="Point your camera at text" />
        <LoadingBlock label="Starting camera..." />
      </Screen>
    );
  }

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;

    return (
      <Screen>
        <ScreenTitle title="Scan" helper="Point your camera at text" />

        <View
          style={[
            styles.permissionCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons name="camera-outline" size={44} color={theme.primary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            We need your camera to read text
          </Text>
          <Text style={[styles.permissionBody, { color: theme.textMuted }]}>
            The photo is only used to read the words. Nothing is saved on your phone.
          </Text>
          {blocked ? (
            <NoticeBanner
              tone="warning"
              message="Camera is switched off for this app. Please turn it on in your phone settings."
            />
          ) : null}
        </View>

        <BigButton
          label={blocked ? 'Open Settings' : 'Turn on Camera'}
          icon="camera"
          onPress={() => {
            if (blocked) void Linking.openSettings();
            else void requestPermission();
          }}
        />

        <View style={styles.secondaryButton}>
          <SmallButton
            label="Choose from Gallery"
            icon="images-outline"
            loading={reading}
            onPress={() => void chooseFromGallery()}
          />
        </View>
      </Screen>
    );
  }

  // -------------------------------------------------------------- camera
  const hasText = text.trim().length > 0;

  return (
    <Screen>
      <ScreenTitle
        title="Scan"
        helper={hasText ? 'Check the text below, then translate' : 'Point your camera at text'}
      />

      <View style={[styles.cameraBox, hasText ? styles.cameraBoxSmall : null]}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
        />

        <View pointerEvents="none" style={styles.frameWrap}>
          <View style={styles.frame} />
        </View>

        <View pointerEvents="none" style={styles.hintWrap}>
          <Text style={styles.hint}>
            {reading ? 'Reading the text...' : 'Hold steady and keep the text clear'}
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <SmallButton
          label="Take Photo"
          icon="camera-outline"
          flex
          loading={reading}
          onPress={() => void takePhoto()}
          accessibilityHint="Takes one photo and reads the text"
        />
        <SmallButton
          label="Choose from Gallery"
          icon="images-outline"
          flex
          disabled={reading}
          onPress={() => void chooseFromGallery()}
          accessibilityHint="Picks a photo from your phone"
        />
      </View>

      {scanError ? (
        <View style={styles.gap}>
          <NoticeBanner tone="error" message={scanError} />
        </View>
      ) : null}

      {status === 'error' && error ? (
        <View style={styles.gap}>
          <NoticeBanner
            tone="error"
            message={error}
            onRetry={hasText ? () => void translate(text) : undefined}
          />
        </View>
      ) : null}

      {hasText ? (
        <>
          <View style={styles.gap}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Text we read</Text>
            <Text style={[styles.sectionHelper, { color: theme.textMuted }]}>
              Fix any mistakes here, then tap Translate.
            </Text>
          </View>

          <TextArea
            value={text}
            onChangeText={onManualEdit}
            minHeight={120}
            placeholder="Type or paste text here"
            accessibilityLabel="Text read from the photo"
            style={styles.gap}
          />

          {language ? (
            <View style={styles.tagRow}>
              <TagChip label={`${language.name} detected`} icon="language-outline" />
            </View>
          ) : null}

          <BigButton
            label="Translate"
            icon="language"
            loading={isLoading}
            onPress={() => void translate(text)}
            accessibilityHint="Translates the text into Sanskrit"
          />
        </>
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
  cameraBox: {
    height: 300,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  cameraBoxSmall: { height: 210 },
  frameWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '82%',
    height: '52%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg,
  },
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    alignItems: 'center',
  },
  hint: {
    color: '#FFFFFF',
    fontSize: fontSize.meta + 1,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  permissionCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: fontSize.helper,
    lineHeight: 23,
    textAlign: 'center',
  },
  secondaryButton: { marginTop: spacing.md },
  sectionLabel: { fontSize: 20, fontWeight: '700' },
  sectionHelper: { fontSize: fontSize.helper, marginTop: 2 },
  tagRow: { marginTop: spacing.md, marginBottom: spacing.lg },
  gap: { marginTop: spacing.lg },
});