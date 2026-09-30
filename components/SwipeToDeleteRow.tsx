/**
 * Swipe left to delete (used by the History list).
 *
 * Built with PanResponder from React Native itself — no extra native library,
 * so it behaves exactly the same in Expo Go and in a release build.
 */

import { useRef, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/utils/theme';

const DELETE_WIDTH = 108;

type Props = {
  children: ReactNode;
  onDelete: () => void;
};

export function SwipeToDeleteRow({ children, onDelete }: Props) {
  const theme = useTheme();
  const offset = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = () => {
    isOpen.current = false;
    Animated.spring(offset, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        offset.setValue(Math.max(base + gesture.dx, -DELETE_WIDTH));
      },
      onPanResponderRelease: (_, gesture) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        const next = base + gesture.dx;
        isOpen.current = next < -DELETE_WIDTH / 2;
        Animated.spring(offset, {
          toValue: isOpen.current ? -DELETE_WIDTH : 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 18,
        }).start();
      },
      onPanResponderTerminate: () => {
        isOpen.current = false;
        Animated.spring(offset, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.deleteLayer, { backgroundColor: theme.danger }]}>
        <Pressable
          onPress={() => {
            close();
            onDelete();
          }}
          accessibilityRole="button"
          accessibilityLabel="Delete this translation"
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
          <Text style={styles.deleteLabel}>Delete</Text>
        </Pressable>
      </View>

      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.front,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            transform: [{ translateX: offset }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  deleteLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
  },
  deleteButton: {
    width: DELETE_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  deleteLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.meta,
    fontWeight: '700',
  },
  front: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
});