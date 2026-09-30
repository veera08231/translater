import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/utils/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type TabIconProps = { focused: boolean; color: ColorValue; size: number };

/**
 * Three tabs, big icons, big labels. Nothing else.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const tabIcon =
    (active: IconName, idle: IconName) =>
    ({ focused, color }: TabIconProps) =>
      <Ionicons name={focused ? active : idle} size={30} color={color} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          // Room for a big icon and a big label, plus the home indicator.
          height: 66 + insets.bottom,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.xs,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '700',
          marginTop: 2,
        },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Type', tabBarIcon: tabIcon('create', 'create-outline') }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scan', tabBarIcon: tabIcon('scan', 'scan-outline') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: tabIcon('time', 'time-outline') }}
      />
    </Tabs>
  );
}